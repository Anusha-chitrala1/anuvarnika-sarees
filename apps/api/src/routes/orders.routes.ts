import { Hono } from 'hono';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { AppContext } from '../types.js';
import { getDb } from '../db.js';
import * as schema from '@anuvarnika/db';
import {
  CreateOrderSchema,
  SubmitUpiPaymentSchema,
  CreateReviewSchema,
  calculateReservationExpiry,
  RESERVATION_HOLD_DURATION_MS,
} from '@anuvarnika/shared';
import { requireAuth } from '../middleware/auth.js';
import {
  reserveStockAtomic,
  releaseStockAtomic,
  cleanupExpiredReservations,
} from '../services/stock.js';
import { sendOrderPlacedEmail } from '../services/email.js';
import {
  buildOwnerVerifyDeepLink,
  sendOwnerTelegramPaymentAlert,
} from '../lib/telegram-owner-alert.js';
import { fetchDelhiveryLiveTracking } from '../services/delhivery.js';

export const ordersRouter = new Hono<AppContext>();

// Create Order (Requires Authentication)
ordersRouter.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parseResult = CreateOrderSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid order data' }, 400);
  }

  const { items, couponCode, shipping } = parseResult.data;
  const db = getDb(c.env);
  const now = Date.now();

  // Lazy clean up expired reservations before processing
  await cleanupExpiredReservations(db);

  // Fetch variants from DB to guarantee genuine pricing and stock
  const variantIds = items.map((i) => i.variantId);
  const dbVariants = await db.query.productVariants.findMany({
    where: inArray(schema.productVariants.id, variantIds),
  });

  if (dbVariants.length !== variantIds.length) {
    return c.json({ error: 'One or more selected items are no longer available in our catalog' }, 400);
  }

  // Fetch product titles and primary images
  const productIds = dbVariants.map((v) => v.productId);
  const [dbProducts, dbImages] = await Promise.all([
    db.query.products.findMany({
      where: inArray(schema.products.id, productIds),
    }),
    db.query.productImages.findMany({
      where: inArray(schema.productImages.productId, productIds),
    }),
  ]);

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));
  const variantMap = new Map(dbVariants.map((v) => [v.id, v]));

  // Calculate Subtotal in Paise
  let subtotalPaise = 0;
  const orderItemsData: Array<{
    variantId: string;
    productId: string;
    title: string;
    colorName: string;
    sku: string;
    pricePaise: number;
    quantity: number;
    totalPaise: number;
    imageUrl: string;
  }> = [];

  for (const item of items) {
    const variant = variantMap.get(item.variantId)!;
    const product = productMap.get(variant.productId)!;
    const itemTotal = variant.pricePaise * item.quantity;
    subtotalPaise += itemTotal;

    const primaryImg =
      dbImages.find((img) => img.variantId === variant.id) ||
      dbImages.find((img) => img.productId === product.id && img.isPrimary) ||
      dbImages.find((img) => img.productId === product.id);

    orderItemsData.push({
      variantId: variant.id,
      productId: product.id,
      title: product.title,
      colorName: variant.colorName,
      sku: variant.sku,
      pricePaise: variant.pricePaise,
      quantity: item.quantity,
      totalPaise: itemTotal,
      imageUrl: primaryImg?.imageUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    });
  }

  // Coupon Discount Calculation
  let discountPaise = 0;
  let appliedCouponId: string | null = null;

  if (couponCode) {
    const coupon = await db.query.coupons.findFirst({
      where: eq(schema.coupons.code, couponCode.trim().toUpperCase()),
    });

    if (
      coupon &&
      coupon.isActive &&
      now >= coupon.validFrom &&
      now <= coupon.validUntil &&
      subtotalPaise >= coupon.minOrderPaise
    ) {
      if (!coupon.usageLimitTotal || coupon.usageCount < coupon.usageLimitTotal) {
        if (coupon.discountType === 'flat') {
          discountPaise = coupon.discountValue;
        } else {
          discountPaise = Math.round((subtotalPaise * coupon.discountValue) / 100);
          if (coupon.maxDiscountPaise && discountPaise > coupon.maxDiscountPaise) {
            discountPaise = coupon.maxDiscountPaise;
          }
        }
        discountPaise = Math.min(discountPaise, subtotalPaise);
        appliedCouponId = coupon.id;
      }
    }
  }

  // Shipping Fee Calculation
  let shippingFeePaise = 0;
  const shippingZone = await db.query.shippingZones.findFirst({
    where: eq(schema.shippingZones.pinCodePrefix, shipping.pincode.substring(0, 2)),
  });

  const freeThreshold = shippingZone?.freeShippingThresholdPaise ?? 299900;
  if (subtotalPaise < freeThreshold) {
    shippingFeePaise = shippingZone?.shippingChargePaise ?? 15000;
  }

  const totalPaise = Math.max(0, subtotalPaise - discountPaise + shippingFeePaise);
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const orderNumber = `AVS-${Math.floor(100000 + Math.random() * 900000)}`;
  const reservationExpiresAt = calculateReservationExpiry(now);

  // Deadlock-Safe Atomic Stock Reservation
  const successfullyReserved: Array<{ variantId: string; quantity: number }> = [];

  for (const item of items) {
    const reservation = await reserveStockAtomic(db, item.variantId, item.quantity, orderId);

    if (!reservation.success) {
      // Rollback any items already reserved for this order to prevent stock deadlocks!
      for (const rollback of successfullyReserved) {
        await releaseStockAtomic(
          db,
          rollback.variantId,
          rollback.quantity,
          orderId,
          'Rollback due to subsequent variant stock contention'
        );
      }

      const variant = variantMap.get(item.variantId);
      return c.json(
        {
          error: `Contention detected: Saree variant "${variant?.colorName || 'Selected'}" has just been reserved by another buyer or is out of stock.`,
        },
        409
      );
    }

    successfullyReserved.push({ variantId: item.variantId, quantity: item.quantity });
  }

  // Create Order in DB
  await db.insert(schema.orders).values({
    id: orderId,
    orderNumber,
    userId: user.id,
    status: 'pending_payment',
    subtotalPaise,
    discountPaise,
    shippingFeePaise,
    totalPaise,
    couponId: appliedCouponId,
    reservationExpiresAt,
    shippingName: shipping.name,
    shippingPhone: shipping.phone,
    shippingEmail: shipping.email,
    shippingAddressLine1: shipping.addressLine1,
    shippingAddressLine2: shipping.addressLine2 || null,
    shippingCity: shipping.city,
    shippingState: shipping.state,
    shippingPincode: shipping.pincode,
    customerNotes: shipping.customerNotes || null,
    createdAt: now,
    updatedAt: now,
  });

  // Create Order Items
  for (const item of orderItemsData) {
    await db.insert(schema.orderItems).values({
      id: `oit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderId,
      productId: item.productId,
      variantId: item.variantId,
      title: item.title,
      colorName: item.colorName,
      sku: item.sku,
      pricePaise: item.pricePaise,
      quantity: item.quantity,
      totalPaise: item.totalPaise,
      imageUrl: item.imageUrl,
    });
  }

  // If coupon was applied, log redemption
  if (appliedCouponId) {
    await Promise.all([
      db.insert(schema.couponRedemptions).values({
        id: `cpr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        couponId: appliedCouponId,
        orderId,
        userId: user.id,
        discountAppliedPaise: discountPaise,
        createdAt: now,
      }),
      db.run(
        sql`UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ${appliedCouponId}`
      ),
    ]);
  }

  const upiId = c.env.UPI_ID || 'anuvarnika@okaxis';

  // Send Order Placed Email via Gmail REST API
  await sendOrderPlacedEmail(
    c.env,
    {
      id: orderId,
      orderNumber,
      shippingName: shipping.name,
      shippingEmail: shipping.email,
      shippingPhone: shipping.phone,
      shippingAddressLine1: shipping.addressLine1,
      shippingCity: shipping.city,
      shippingState: shipping.state,
      shippingPincode: shipping.pincode,
      totalPaise,
    },
    upiId,
    orderItemsData.map((i) => ({
      productName: i.title,
      variantName: i.colorName,
      quantity: i.quantity,
      lineTotalPaise: i.totalPaise,
    }))
  );

  return c.json({
    success: true,
    orderId,
    orderNumber,
    totalPaise,
    reservationExpiresAt,
    reservationDurationMinutes: 15,
    upiId,
  });
});

// Customer: Get My Orders
ordersRouter.get('/my', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env);

  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.userId, user.id),
    orderBy: [desc(schema.orders.createdAt)],
  });

  const enriched = await Promise.all(
    orders.map(async (ord) => {
      const [items, payment, shipment] = await Promise.all([
        db.query.orderItems.findMany({
          where: eq(schema.orderItems.orderId, ord.id),
        }),
        db.query.payments.findFirst({
          where: eq(schema.payments.orderId, ord.id),
        }),
        db.query.shipments.findFirst({
          where: eq(schema.shipments.orderId, ord.id),
        }),
      ]);

      return {
        ...ord,
        items,
        payment,
        shipment,
      };
    })
  );

  return c.json({ orders: enriched });
});

// Get Order Details by Order Number (Public / Customer tracking)
ordersRouter.get('/:orderNumber', async (c) => {
  const db = getDb(c.env);
  const orderNumber = c.req.param('orderNumber');

  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.orderNumber, orderNumber),
  });

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  let [items, payment, shipment] = await Promise.all([
    db.query.orderItems.findMany({
      where: eq(schema.orderItems.orderId, order.id),
    }),
    db.query.payments.findFirst({
      where: eq(schema.payments.orderId, order.id),
    }),
    db.query.shipments.findFirst({
      where: eq(schema.shipments.orderId, order.id),
    }),
  ]);

  // Auto-sync live tracking from Delhivery when not in personal mode and token is configured
  if (
    c.env.DELHIVERY_PERSONAL !== 'true' &&
    shipment?.awbNumber &&
    shipment.status !== 'delivered' &&
    c.env.DELHIVERY_API_TOKEN
  ) {
    const live = await fetchDelhiveryLiveTracking(shipment.awbNumber, c.env.DELHIVERY_API_TOKEN);
    if (live?.found) {
      const now = Date.now();
      const updatedHistory = live.scans.length > 0 ? live.scans : JSON.parse(shipment.statusUpdatesJson || '[]');
      await db
        .update(schema.shipments)
        .set({
          status: live.status,
          statusUpdatesJson: JSON.stringify(updatedHistory),
          deliveredAt: live.status === 'delivered' ? now : shipment.deliveredAt,
          updatedAt: now,
        })
        .where(eq(schema.shipments.id, shipment.id));

      let newOrderStatus = order.status;
      if (live.status === 'picked_up' || live.status === 'in_transit' || live.status === 'out_for_delivery') {
        newOrderStatus = 'shipped';
      } else if (live.status === 'delivered') {
        newOrderStatus = 'delivered';
      }
      if (newOrderStatus !== order.status) {
        await db.update(schema.orders).set({ status: newOrderStatus, updatedAt: now }).where(eq(schema.orders.id, order.id));
        order.status = newOrderStatus;
      }

      shipment = {
        ...shipment,
        status: live.status,
        statusUpdatesJson: JSON.stringify(updatedHistory),
      };
    }
  }

  let statusUpdates = [];
  if (shipment?.statusUpdatesJson) {
    try {
      statusUpdates = JSON.parse(shipment.statusUpdatesJson);
    } catch (e) {}
  }

  const upiId = c.env.UPI_ID || 'anuvarnika@okaxis';

  return c.json({
    order: {
      ...order,
      items,
      payment,
      shipment: shipment ? { ...shipment, statusUpdates } : null,
      upiId,
    },
  });
});

// Submit UPI Payment UTR Reference + Optional Receipt
async function handlePaymentProofSubmission(c: any, orderId: string) {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = SubmitUpiPaymentSchema.safeParse({ ...body, orderId });
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid UTR reference' }, 400);
  }

  const { utrReference, proofR2Key } = parseResult.data;
  const db = getDb(c.env);
  const now = Date.now();

  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  if (order.status === 'payment_verified' || order.status === 'shipped' || order.status === 'delivered') {
    return c.json({ error: 'Payment for this order has already been verified and processed.' }, 400);
  }

  // Duplicate UTR check across entire database
  const existingUtr = await db.query.payments.findFirst({
    where: eq(schema.payments.utrReference, utrReference.toUpperCase()),
  });

  if (existingUtr && existingUtr.orderId !== order.id) {
    return c.json(
      {
        error: `UTR Reference ${utrReference} has already been registered for another order. Each transaction reference must be unique.`,
      },
      400
    );
  }

  const upiIdUsed = c.env.UPI_ID || 'anuvarnika@okaxis';
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (existingUtr && existingUtr.orderId === order.id) {
    // Update existing payment
    await db
      .update(schema.payments)
      .set({
        utrReference: utrReference.toUpperCase(),
        proofR2Key: proofR2Key || existingUtr.proofR2Key,
        status: 'submitted',
      })
      .where(eq(schema.payments.id, existingUtr.id));
  } else {
    await db.insert(schema.payments).values({
      id: paymentId,
      orderId: order.id,
      paymentMethod: 'upi_qr',
      upiIdUsed,
      utrReference: utrReference.toUpperCase(),
      proofR2Key: proofR2Key || null,
      proofImageUrl: proofR2Key ? `/api/upload/${proofR2Key}` : null,
      amountPaise: order.totalPaise,
      status: 'submitted',
      createdAt: now,
    });
  }

  // Transition order to 'payment_submitted'
  await db
    .update(schema.orders)
    .set({
      status: 'payment_submitted',
      updatedAt: now,
    })
    .where(eq(schema.orders.id, order.id));

  // Fetch order items for Telegram summary & insert D1 admin_notifications row
  const items = await db.query.orderItems.findMany({
    where: eq(schema.orderItems.orderId, order.id),
  });

  const normalizedUtr = utrReference.toUpperCase();
  const deepLink = buildOwnerVerifyDeepLink(c.env, order.id);

  await db.insert(schema.adminNotifications).values({
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderId: order.id,
    title: `UPI Payment Submitted: #${order.orderNumber}`,
    message: `${order.shippingName} (${order.shippingPhone}) submitted UTR ${normalizedUtr}`,
    deepLink,
    isRead: false,
    createdAt: now,
  });

  // Trigger Telegram Bot-Only Owner Alert (non-blocking via executionCtx.waitUntil when available)
  const telegramPromise = sendOwnerTelegramPaymentAlert(c.env, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalPaise: order.totalPaise,
    utrReference: normalizedUtr,
    customerName: order.shippingName,
    customerPhone: order.shippingPhone,
    items: items.map((item) => ({
      title: item.title,
      colorName: item.colorName,
      quantity: item.quantity,
    })),
  });

  try {
    c.executionCtx.waitUntil(telegramPromise);
  } catch {
    await telegramPromise;
  }

  return c.json({
    success: true,
    message: 'Payment reference submitted successfully! Our team is verifying your payment with our bank.',
    orderStatus: 'payment_submitted',
  });
}

ordersRouter.post('/:id/payment', (c) => handlePaymentProofSubmission(c, c.req.param('id')));
ordersRouter.post('/:orderId/payment-proof', (c) =>
  handlePaymentProofSubmission(c, c.req.param('orderId'))
);

// Verified Post-Delivery Review Submission
ordersRouter.post('/:id/review', requireAuth, async (c) => {
  const user = c.get('user')!;
  const orderId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = CreateReviewSchema.safeParse({ ...body, orderId });
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid review data' }, 400);
  }

  const { productId, rating, reviewTitle, reviewText } = parseResult.data;
  const db = getDb(c.env);
  const now = Date.now();

  const order = await db.query.orders.findFirst({
    where: and(eq(schema.orders.id, orderId), eq(schema.orders.userId, user.id)),
  });

  if (!order) {
    return c.json({ error: 'Order not found or does not belong to your account' }, 404);
  }

  // Business Rule: Post-delivery reviews only allowed when order reaches 'delivered'
  if (order.status !== 'delivered') {
    return c.json(
      {
        error: `Reviews are permitted only for verified delivered orders. Current order status: ${order.status}`,
      },
      403
    );
  }

  // Check product was in this order
  const orderItem = await db.query.orderItems.findFirst({
    where: and(eq(schema.orderItems.orderId, order.id), eq(schema.orderItems.productId, productId)),
  });

  if (!orderItem) {
    return c.json({ error: 'This product was not part of the specified order' }, 400);
  }

  // Check duplicate review
  const existingReview = await db.query.reviews.findFirst({
    where: and(
      eq(schema.reviews.userId, user.id),
      eq(schema.reviews.orderId, order.id),
      eq(schema.reviews.productId, productId)
    ),
  });

  if (existingReview) {
    return c.json({ error: 'You have already submitted a review for this saree from this order' }, 400);
  }

  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await db.insert(schema.reviews).values({
    id: reviewId,
    productId,
    userId: user.id,
    orderId,
    rating,
    reviewTitle,
    reviewText,
    isVerifiedBuyer: true,
    isApproved: true, // auto-approve verified buyers
    createdAt: now,
  });

  return c.json({
    success: true,
    message: 'Thank you for reviewing your saree! Your feedback has been published.',
    reviewId,
  });
});
