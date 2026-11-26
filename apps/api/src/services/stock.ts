import { DrizzleD1Database } from 'drizzle-orm/d1';
import { sql, eq, and, lt } from 'drizzle-orm';
import * as schema from '@anuvarnika/db';

/**
 * Deadlock-safe atomic stock reservation
 * Uses conditional SQL update to ensure available stock (stock_qty - reserved_stock) >= qty.
 * Returns true if reservation was acquired, false if out of stock or race-condition lost.
 */
export async function reserveStockAtomic(
  db: DrizzleD1Database<typeof schema>,
  variantId: string,
  quantity: number,
  orderId: string
): Promise<{ success: boolean; remainingAvailable?: number }> {
  // D1 / SQLite atomic update
  const result = await db.run(
    sql`UPDATE product_variants 
        SET reserved_stock = reserved_stock + ${quantity},
            updated_at = ${Date.now()}
        WHERE id = ${variantId} 
          AND is_active = 1
          AND (stock_qty - reserved_stock) >= ${quantity}`
  );

  const changes = result.meta?.changes ?? 0;
  if (changes === 0) {
    return { success: false };
  }

  // Fetch updated balance for audit log
  const variant = await db.query.productVariants.findFirst({
    where: eq(schema.productVariants.id, variantId),
  });

  const availableAfter = variant ? variant.stockQty - variant.reservedStock : 0;

  // Log inventory movement
  await db.insert(schema.inventoryTransactions).values({
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    variantId,
    orderId,
    transactionType: 'reservation',
    quantity,
    balanceAfter: availableAfter,
    reason: `Temporary 15-min reservation hold for Order ${orderId}`,
    createdAt: Date.now(),
  });

  return { success: true, remainingAvailable: availableAfter };
}

/**
 * Release reserved stock back to available pool
 */
export async function releaseStockAtomic(
  db: DrizzleD1Database<typeof schema>,
  variantId: string,
  quantity: number,
  orderId: string,
  reason: string
): Promise<void> {
  await db.run(
    sql`UPDATE product_variants 
        SET reserved_stock = MAX(0, reserved_stock - ${quantity}),
            updated_at = ${Date.now()}
        WHERE id = ${variantId}`
  );

  const variant = await db.query.productVariants.findFirst({
    where: eq(schema.productVariants.id, variantId),
  });

  const availableAfter = variant ? variant.stockQty - variant.reservedStock : 0;

  await db.insert(schema.inventoryTransactions).values({
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    variantId,
    orderId,
    transactionType: 'release',
    quantity: -quantity,
    balanceAfter: availableAfter,
    reason,
    createdAt: Date.now(),
  });
}

/**
 * Commit stock deduction on admin payment approval:
 * Decrements actual stock_qty and clears reserved_stock.
 */
export async function commitStockSaleAtomic(
  db: DrizzleD1Database<typeof schema>,
  variantId: string,
  quantity: number,
  orderId: string
): Promise<void> {
  await db.run(
    sql`UPDATE product_variants 
        SET stock_qty = MAX(0, stock_qty - ${quantity}),
            reserved_stock = MAX(0, reserved_stock - ${quantity}),
            updated_at = ${Date.now()}
        WHERE id = ${variantId}`
  );

  const variant = await db.query.productVariants.findFirst({
    where: eq(schema.productVariants.id, variantId),
  });

  const balanceAfter = variant ? variant.stockQty : 0;

  await db.insert(schema.inventoryTransactions).values({
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    variantId,
    orderId,
    transactionType: 'sale',
    quantity: -quantity,
    balanceAfter,
    reason: `Sale confirmed after payment approval for Order ${orderId}`,
    createdAt: Date.now(),
  });
}

/**
 * Lazy / periodic cleanup of expired 15-minute stock holds
 * Only affects orders in 'pending_payment' where reservation_expires_at has elapsed
 * Does NOT cancel orders in 'payment_submitted' (which are in manual admin verification)
 */
export async function cleanupExpiredReservations(
  db: DrizzleD1Database<typeof schema>
): Promise<number> {
  const now = Date.now();

  const expiredOrders = await db.query.orders.findMany({
    where: and(
      eq(schema.orders.status, 'pending_payment'),
      lt(schema.orders.reservationExpiresAt, now)
    ),
    with: {
      // We will fetch items separately
    },
  });

  let releasedCount = 0;

  for (const order of expiredOrders) {
    const items = await db.query.orderItems.findMany({
      where: eq(schema.orderItems.orderId, order.id),
    });

    for (const item of items) {
      await releaseStockAtomic(
        db,
        item.variantId,
        item.quantity,
        order.id,
        `15-minute reservation hold expired without payment submission`
      );
    }

    await db
      .update(schema.orders)
      .set({
        status: 'payment_failed',
        updatedAt: now,
        adminNotes: 'Reservation automatically released due to 15-min timeout.',
      })
      .where(eq(schema.orders.id, order.id));

    releasedCount++;
  }

  return releasedCount;
}
