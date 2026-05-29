import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';
import { getUserPricing, type PricingBand } from './shared/geoPricing';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    // stripe-replit-sync handles signature verification and syncs data
    await sync.processWebhook(payload, signature, uuid);
    
    // Parse the raw payload to handle our custom logic
    try {
      const eventData = JSON.parse(payload.toString());
      await WebhookHandlers.handleStripeEvent(eventData);
    } catch (err: any) {
      console.error('Custom webhook processing error:', err.message);
    }
  }
  
  static async handleStripeEvent(event: any): Promise<void> {
    console.log(`Processing Stripe event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await WebhookHandlers.handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'invoice.paid':
        await WebhookHandlers.handleInvoicePaid(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await WebhookHandlers.handlePaymentFailed(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionUpdated(event.data.object);
        break;
        
      default:
        // Unhandled event types are fine
        break;
    }
  }
  
  static async handleCheckoutCompleted(session: any): Promise<void> {
    console.log('Processing checkout.session.completed');
    
    const customerId = session.customer;
    if (!customerId || typeof customerId !== 'string') return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error(`No user found for Stripe customer: ${customerId}`);
      return;
    }
    
    // Check if this is a per-trip one-time payment
    if (session.mode === 'payment' && session.metadata?.type === 'trip') {
      const sessionId = session.id;
      await storage.activateTripUnlock(sessionId);
      console.log(`[TripUnlock] Activated unlock for session ${sessionId}, user ${user.id}`);
      return;
    }

    // Check if this is a subscription checkout
    if (session.mode === 'subscription' && session.subscription) {
      const stripe = await getUncachableStripeClient();
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Guard against deleted subscriptions
      if ('deleted' in subscription && subscription.deleted) {
        console.log('Subscription was deleted, skipping');
        return;
      }
      
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const isFoundingFamilies = await WebhookHandlers.isFoundingFamiliesPrice(priceId);
      
      // Check Founding Families cap (band-aware)
      // Use user's pricing band to determine the cap (100 for Band A, 200 for Band B, 500 for Band C)
      if (isFoundingFamilies) {
        const userBand = (user.pricingBand as PricingBand) || 'A';
        const bandPricing = getUserPricing(userBand);
        const bandCap = bandPricing.foundingCap;
        
        // For now, use global count against band-specific cap
        // TODO: Implement per-band counters for true band-specific tracking
        const currentCount = await storage.getFoundingFamilyCount();
        if (currentCount >= bandCap) {
          console.error(`Founding Families program is full for Band ${userBand} (${bandCap} families)`);
          // The checkout already succeeded, but we can't give them founding status
          // Fall back to regular subscription
        }
      }
      
      const subscriptionTier = isFoundingFamilies ? 'founding' : 'geoquest_explorer';
      const foundingNumber = isFoundingFamilies ? await storage.claimFoundingFamilyNumber(user.id) : null;
      
      await storage.updateUserSubscription(user.id, {
        subscriptionTier,
        stripeSubscriptionId: subscription.id,
        subscriptionStartDate: new Date((subscription as any).current_period_start * 1000),
        subscriptionEndDate: new Date((subscription as any).current_period_end * 1000),
        isFoundingFamily: isFoundingFamilies && foundingNumber !== null,
        foundingFamilyNumber: foundingNumber,
        foundingPriceLockExpiry: isFoundingFamilies && foundingNumber !== null
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : undefined,
      });
      
      // Lock billing currency after first successful payment (geo-pricing protection)
      if (!user.billingCurrencyLocked) {
        await storage.lockBillingCurrency(user.id);
        console.log(`🔒 Locked billing currency for user ${user.id}: ${user.billingCurrency || 'USD'}`);
      }
      
      console.log(`User ${user.id} subscription activated: ${subscriptionTier}`);
    }
  }
  
  static async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
    console.log('Processing payment_intent.succeeded');

    const metadata = paymentIntent.metadata || {};
    if (metadata.type !== 'trip') return;

    // Activate the pending trip unlock created by the in-app sheet flow
    const intentId = paymentIntent.id as string;
    const unlock = await storage.getTripUnlockBySessionId(intentId);
    if (!unlock) {
      console.warn(`[TripUnlock] No pending unlock found for payment_intent ${intentId}`);
      return;
    }

    await storage.activateTripUnlock(intentId);
    console.log(`[TripUnlock] Activated unlock for payment_intent ${intentId}, user ${unlock.userId}`);

    // Record promo redemption + increment usage on payment success.
    // Idempotency: use tripUnlockId to guard against Stripe webhook retries.
    // oneUsePerUser enforcement is handled at the request phase; webhook only
    // records and counts — respecting multi-use-per-user code config.
    const promoCodeId = metadata.promoCodeId as string | undefined;
    if (promoCodeId) {
      try {
        // Guard against Stripe retry delivering same event twice (idempotent by unlock)
        const alreadyByUnlock = await storage.getPromoRedemptionByUnlockId(unlock.id);
        if (alreadyByUnlock) {
          console.log(`[PromoCode] Webhook retry — redemption already recorded for unlock ${unlock.id}, skipping`);
        } else {
          // Fetch promo code to check oneUsePerUser setting
          const promoCode = await storage.getPromoCodeById(promoCodeId);
          let shouldRecord = true;

          if (promoCode?.oneUsePerUser) {
            // One-use-per-user: check if this user already redeemed this code
            const existingByUser = await storage.getPromoRedemption(promoCodeId, unlock.userId);
            if (existingByUser) {
              console.log(`[PromoCode] oneUsePerUser=true — already redeemed by user ${unlock.userId}, skipping`);
              shouldRecord = false;
            }
          }
          // If oneUsePerUser=false, always record (multi-use codes allow same user to buy multiple trips)

          if (shouldRecord) {
            await storage.createPromoRedemption({
              codeId: promoCodeId,
              userId: unlock.userId,
              tripId: unlock.tripId || null,
              tripUnlockId: unlock.id,
              status: 'applied',
            });
            await storage.incrementPromoCodeUsage(promoCodeId);
            console.log(`[PromoCode] Recorded redemption for code ${promoCodeId}, user ${unlock.userId}, unlock ${unlock.id}`);
          }
        }
      } catch (err: any) {
        console.error('[PromoCode] Error recording redemption:', err?.message || err);
      }
    }

    // Lock billing currency after first successful payment
    const user = await storage.getUser(unlock.userId);
    if (user && !user.billingCurrencyLocked) {
      await storage.lockBillingCurrency(unlock.userId);
      console.log(`🔒 Locked billing currency for user ${unlock.userId}`);
    }
  }

  static async handleInvoicePaid(invoice: any): Promise<void> {
    console.log('Processing invoice.paid');
    
    const customerId = invoice.customer;
    if (!customerId || typeof customerId !== 'string') return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    // Clear any payment failure grace period
    await storage.clearPaymentGracePeriod(user.id);
    
    // Update subscription end date if applicable
    if (invoice.subscription && typeof invoice.subscription === 'string') {
      try {
        const stripe = await getUncachableStripeClient();
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        
        if (!('deleted' in subscription && subscription.deleted)) {
          await storage.updateUserSubscription(user.id, {
            subscriptionEndDate: new Date((subscription as any).current_period_end * 1000),
          });
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }
    }
    
    console.log(`Payment successful for user ${user.id}`);
  }
  
  static async handlePaymentFailed(invoice: any): Promise<void> {
    console.log('Processing invoice.payment_failed');
    
    const customerId = invoice.customer;
    if (!customerId || typeof customerId !== 'string') return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    // Set 2-day grace period
    const graceEndDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await storage.setPaymentGracePeriod(user.id, graceEndDate);
    
    console.log(`Payment failed for user ${user.id}, grace period until ${graceEndDate.toISOString()}`);
  }
  
  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    console.log('Processing customer.subscription.deleted');
    
    const customerId = subscription.customer;
    if (!customerId || typeof customerId !== 'string') return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    // User keeps access until subscription end date
    // Just mark subscription as cancelled but don't remove access yet
    await storage.updateUserSubscription(user.id, {
      stripeSubscriptionId: null,
    });
    
    console.log(`Subscription cancelled for user ${user.id}, access continues until ${user.subscriptionEndDate}`);
  }
  
  static async handleSubscriptionUpdated(subscription: any): Promise<void> {
    console.log('Processing customer.subscription.updated');
    
    const customerId = subscription.customer;
    if (!customerId || typeof customerId !== 'string') return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    // Guard against deleted subscriptions
    if (subscription.deleted) {
      return;
    }
    
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const isFoundingFamilies = await WebhookHandlers.isFoundingFamiliesPrice(priceId);
    
    await storage.updateUserSubscription(user.id, {
      subscriptionEndDate: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : undefined,
    });
    
    console.log(`Subscription updated for user ${user.id}`);
  }
  
  static async isFoundingFamiliesPrice(priceId: string | undefined): Promise<boolean> {
    if (!priceId) return false;
    
    const foundingFamiliesPriceIds = [
      process.env.STRIPE_FOUNDING_FAMILIES_PRICE_ID,
    ].filter(Boolean);
    
    return foundingFamiliesPriceIds.includes(priceId);
  }
}
