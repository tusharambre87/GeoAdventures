// Migration Script: Assign pricing bands to existing users
// Run with: npx tsx server/scripts/migrateGeoPricing.ts

import { db } from '../db';
import { users } from '@workspace/db';
import { isNull, and, eq, isNotNull } from 'drizzle-orm';
import { getPricingBandFromCountry, getCurrencyFromCountry } from '../../shared/geoPricing';
import { detectUserGeoSync } from '../geoDetection';

async function migrateGeoPricing() {
  console.log('🌍 Starting geo-pricing migration...\n');

  // Get all users without a pricing band assigned
  const usersToMigrate = await db
    .select()
    .from(users)
    .where(isNull(users.pricingBand));

  console.log(`Found ${usersToMigrate.length} users without pricing band\n`);

  let updated = 0;
  let skipped = 0;
  let payingSkipped = 0;

  for (const user of usersToMigrate) {
    // NEVER reprice existing paying users - they keep default Band A
    const isPaying = user.stripeSubscriptionId || 
                     user.isFoundingFamily || 
                     user.subscriptionTier === 'geoquest_explorer' ||
                     user.subscriptionTier === 'geoquest_plus' ||
                     user.subscriptionTier === 'founding';

    if (isPaying) {
      // Paying users get Band A locked
      await db
        .update(users)
        .set({
          pricingBand: 'A',
          billingCurrency: 'USD',
          billingCurrencyLocked: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      payingSkipped++;
      console.log(`💳 ${user.email}: Paying user - assigned Band A (locked)`);
      continue;
    }

    // Try to determine band from stored data
    let countryCode: string | null = null;
    let detectionSource = 'none';

    // 1. Use stored detected country if available
    if (user.detectedCountry) {
      countryCode = user.detectedCountry;
      detectionSource = 'stored_country';
    }
    // 2. Try timezone/locale detection if we have them
    else if (user.signupTimezone || user.signupLocale) {
      const result = detectUserGeoSync({
        timezone: user.signupTimezone,
        locale: user.signupLocale,
      });
      countryCode = result.countryCode;
      detectionSource = `sync_detection (${result.source})`;
    }
    // 3. Default to Band A
    else {
      countryCode = 'US'; // Default
      detectionSource = 'default';
    }

    const pricingBand = getPricingBandFromCountry(countryCode);
    const billingCurrency = getCurrencyFromCountry(countryCode);

    await db
      .update(users)
      .set({
        pricingBand,
        billingCurrency,
        detectedCountry: user.detectedCountry || countryCode,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    updated++;
    console.log(`✅ ${user.email}: ${countryCode} → Band ${pricingBand} (${billingCurrency}) via ${detectionSource}`);
  }

  console.log(`\n📊 Migration complete:`);
  console.log(`   - Updated: ${updated} users`);
  console.log(`   - Paying users (Band A locked): ${payingSkipped}`);
  console.log(`   - Total processed: ${usersToMigrate.length}`);

  // Summary by band
  const bandCounts = await db
    .select({
      band: users.pricingBand,
    })
    .from(users)
    .where(isNotNull(users.pricingBand));

  const bandSummary: Record<string, number> = {};
  for (const row of bandCounts) {
    const band = row.band || 'unknown';
    bandSummary[band] = (bandSummary[band] || 0) + 1;
  }

  console.log(`\n🌍 Pricing band distribution:`);
  Object.entries(bandSummary).forEach(([band, count]) => {
    console.log(`   Band ${band}: ${count} users`);
  });

  process.exit(0);
}

migrateGeoPricing().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
