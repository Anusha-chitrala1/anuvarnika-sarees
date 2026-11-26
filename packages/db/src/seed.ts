import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';
import {
  INITIAL_THEME,
  INITIAL_STORE_SETTINGS,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_COUPONS,
  INITIAL_SHIPPING_ZONES,
  INITIAL_REVIEWS,
} from './seed-data.js';

export async function seedDatabase(d1: any) {
  const db = drizzle(d1, { schema });

  // 1. Check if theme exists
  const existingTheme = await db.select().from(schema.themeSettings).limit(1);
  if (existingTheme.length === 0) {
    await db.insert(schema.themeSettings).values(INITIAL_THEME);
  }

  // 2. Store settings
  for (const s of INITIAL_STORE_SETTINGS) {
    const existing = await db.select().from(schema.storeSettings).where(
      // @ts-ignore
      schema.eq ? schema.eq(schema.storeSettings.key, s.key) : undefined
    ).limit(1).catch(() => []);
    if (!existing || existing.length === 0) {
      await db.insert(schema.storeSettings).values(s).catch(() => {});
    }
  }

  // 3. Users
  for (const u of INITIAL_USERS) {
    await db.insert(schema.users).values(u).onConflictDoNothing().catch(() => {});
  }

  // 4. Categories
  for (const c of INITIAL_CATEGORIES) {
    await db.insert(schema.categories).values(c).onConflictDoNothing().catch(() => {});
  }

  // 5. Products, Variants & Images
  for (const p of INITIAL_PRODUCTS) {
    const { variants, images, ...prodData } = p;
    await db.insert(schema.products).values(prodData).onConflictDoNothing().catch(() => {});

    for (const v of variants) {
      await db.insert(schema.productVariants).values({
        ...v,
        productId: p.id,
        createdAt: prodData.createdAt,
        updatedAt: prodData.updatedAt,
      }).onConflictDoNothing().catch(() => {});
    }

    for (const img of images) {
      await db.insert(schema.productImages).values({
        ...img,
        productId: p.id,
        createdAt: prodData.createdAt,
      }).onConflictDoNothing().catch(() => {});
    }
  }

  // 6. Coupons
  for (const cpn of INITIAL_COUPONS) {
    await db.insert(schema.coupons).values(cpn).onConflictDoNothing().catch(() => {});
  }

  // 7. Shipping zones
  for (const sz of INITIAL_SHIPPING_ZONES) {
    await db.insert(schema.shippingZones).values(sz).onConflictDoNothing().catch(() => {});
  }

  // 8. Sample delivered order for reviews
  const sampleOrder = {
    id: 'ord_sample_delivered_01',
    orderNumber: 'AVS-1001',
    userId: 'usr_customer_01',
    status: 'delivered' as const,
    subtotalPaise: 3899800,
    discountPaise: 150000,
    shippingFeePaise: 0,
    totalPaise: 3749800,
    shippingName: 'Priya Sharma',
    shippingPhone: '9876543210',
    shippingEmail: 'priya.sharma@example.com',
    shippingAddressLine1: '42, Heritage Enclave, Anna Nagar',
    shippingCity: 'Chennai',
    shippingState: 'Tamil Nadu',
    shippingPincode: '600040',
    createdAt: 1732000000000,
    updatedAt: 1732500000000,
  };
  await db.insert(schema.orders).values(sampleOrder).onConflictDoNothing().catch(() => {});

  // 9. Reviews
  for (const rev of INITIAL_REVIEWS) {
    await db.insert(schema.reviews).values(rev).onConflictDoNothing().catch(() => {});
  }
}
