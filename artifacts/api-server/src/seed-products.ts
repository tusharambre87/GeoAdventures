import { getUncachableStripeClient } from './stripeClient';

/**
 * GeoQuest Pricing Tiers - Stripe Product Seeding
 * 
 * GeoQuest Explorer - $7.99/mo or $69.99/yr
 * Founding Families - $4.99/mo or $39.99/yr
 * 
 * Legacy products (GeoGames Family, GeoQuest+ Family) are preserved in Stripe
 * but no longer created. New subscriptions use GeoQuest Explorer.
 */

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('=== GeoQuest Pricing Setup ===\n');

  // ============================================
  // GeoQuest Explorer (replaces GeoGames Family + GeoQuest+ Family)
  // ============================================
  console.log('Checking for GeoQuest Explorer product...');
  
  const existingExplorer = await stripe.products.search({ 
    query: "name:'GeoQuest Explorer'" 
  });

  let explorerProduct;
  if (existingExplorer.data.length > 0) {
    console.log('GeoQuest Explorer already exists:', existingExplorer.data[0].id);
    explorerProduct = existingExplorer.data[0];
  } else {
    console.log('Creating GeoQuest Explorer product...');
    explorerProduct = await stripe.products.create({
      name: 'GeoQuest Explorer',
      description: 'The complete geography learning experience. All GeoGames modes, Flag Quiz & Map Me mastery, unlimited mini-games, all explorer ranks, unlimited GeoAdventures, up to 7 Explorer profiles.',
      metadata: {
        tier: 'geoquest_explorer',
        features: 'all_geogames,flag_quiz,map_me,unlimited_minigames,all_ranks,unlimited_adventures,7_explorers,parent_reports',
      }
    });
    console.log('Created GeoQuest Explorer:', explorerProduct.id);
  }

  const explorerPrices = await stripe.prices.list({ product: explorerProduct.id, active: true });
  
  if (!explorerPrices.data.find(p => p.recurring?.interval === 'month' && p.unit_amount === 799)) {
    const monthlyPrice = await stripe.prices.create({
      product: explorerProduct.id,
      unit_amount: 799,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'monthly', tier: 'geoquest_explorer' }
    });
    console.log('Created Explorer monthly price:', monthlyPrice.id, '- $7.99/month');
  }

  if (!explorerPrices.data.find(p => p.recurring?.interval === 'year' && p.unit_amount === 6999)) {
    const yearlyPrice = await stripe.prices.create({
      product: explorerProduct.id,
      unit_amount: 6999,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { plan: 'yearly', tier: 'geoquest_explorer', savings: '27%' }
    });
    console.log('Created Explorer yearly price:', yearlyPrice.id, '- $69.99/year');
  }

  // ============================================
  // Founding Families pricing
  // ============================================
  console.log('\nChecking for Founding Families product...');
  
  const existingFounding = await stripe.products.search({ 
    query: "name:'Founding Families'" 
  });

  let foundingProduct;
  if (existingFounding.data.length > 0) {
    console.log('Founding Families already exists:', existingFounding.data[0].id);
    foundingProduct = existingFounding.data[0];
  } else {
    console.log('Creating Founding Families product...');
    foundingProduct = await stripe.products.create({
      name: 'Founding Families',
      description: 'Special pricing for our earliest supporters. Everything in GeoQuest Explorer with locked-in pricing for 12 months, Founding Family badge, and 14-day free trial.',
      metadata: {
        tier: 'founding',
        features: 'all_geogames,flag_quiz,map_me,unlimited_minigames,all_ranks,unlimited_adventures,7_explorers,parent_reports,founding_badge,price_lock',
      }
    });
    console.log('Created Founding Families:', foundingProduct.id);
  }

  const foundingPrices = await stripe.prices.list({ product: foundingProduct.id, active: true });

  if (!foundingPrices.data.find(p => p.recurring?.interval === 'month' && p.unit_amount === 499)) {
    const monthlyPrice = await stripe.prices.create({
      product: foundingProduct.id,
      unit_amount: 499,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'monthly', tier: 'founding', founding: 'true' }
    });
    console.log('Created Founding monthly price:', monthlyPrice.id, '- $4.99/month');
  }

  if (!foundingPrices.data.find(p => p.recurring?.interval === 'year' && p.unit_amount === 3999)) {
    const yearlyPrice = await stripe.prices.create({
      product: foundingProduct.id,
      unit_amount: 3999,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { plan: 'yearly', tier: 'founding', founding: 'true', savings: '33%' }
    });
    console.log('Created Founding yearly price:', yearlyPrice.id, '- $39.99/year');
  }

  console.log('\n=== Pricing Setup Complete ===');
  console.log('\nNote: Legacy products (GeoGames Family, GeoQuest+ Family, Single City Adventure) are preserved in Stripe for existing subscribers.');
}

createProducts().catch(console.error);
