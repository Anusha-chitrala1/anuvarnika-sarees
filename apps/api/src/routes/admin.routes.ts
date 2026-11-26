import { Hono } from 'hono';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { AppContext } from '../types.js';
import { getDb } from '../db.js';
import * as schema from '@anuvarnika/db';
import {
  VerifyPaymentActionSchema,
  DelhiveryAwbSchema,
  ProductCreateUpdateSchema,
  CouponCreateUpdateSchema,
  generateDelhiveryTrackingUrl,
} from '@anuvarnika/shared';
import { requireAdmin } from '../middleware/auth.js';
import {
  commitStockSaleAtomic,
  releaseStockAtomic,
} from '../services/stock.js';
import {
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendDelhiveryShippedEmail,
  sendOrderDeliveredEmail,
} from '../services/email.js';
import { generateDelhiveryTrackingUrl } from '@anuvarnika/shared';

export const adminRouter = new Hono<AppContext>();

// Enforce admin privileges on all admin endpoints
adminRouter.use('*', requireAdmin);

// ==========================================
// 1. ORDERS & PAYMENT VERIFICATION
// ==========================================

// Get all orders with optional status filter
adminRouter.get('/orders', async (c) => {
  const db = getDb(c.env);
  const statusFilter = c.req.query('status');

  const conditions = statusFilter ? [eq(schema.orders.status, statusFilter as any)] : [];

  const orders = await db.query.orders.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
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

  return c.json({
    orders: enriched,
    delhiveryPersonal: c.env.DELHIVERY_PERSONAL === 'true',
  });
});

// Approve or Reject UPI Payment Reference
adminRouter.post('/payments/:id/verify', async (c) => {
  const paymentId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = VerifyPaymentActionSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid action' }, 400);
  }

  const { action, rejectionReason } = parseResult.data;
  const db = getDb(c.env);
  const admin = c.get('user')!;
  const now = Date.now();

  const payment = await db.query.payments.findFirst({
    where: eq(schema.payments.id, paymentId),
  });

  if (!payment) {
    return c.json({ error: 'Payment record not found' }, 404);
  }

  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, payment.orderId),
  });

  if (!order) {
    return c.json({ error: 'Associated order not found' }, 404);
  }

  const orderItems = await db.query.orderItems.findMany({
    where: eq(schema.orderItems.orderId, order.id),
  });

  if (action === 'approve') {
    // 1. Commit Real Stock: Decrement stock_qty and clear reserved_stock
    for (const item of orderItems) {
      await commitStockSaleAtomic(db, item.variantId, item.quantity, order.id);
    }

    // 2. Update Payment Status to 'approved'
    await db
      .update(schema.payments)
      .set({
        status: 'approved',
        adminId: admin.id,
        verifiedAt: now,
      })
      .where(eq(schema.payments.id, payment.id));

    // 3. Update Order Status to 'payment_verified'
    await db
      .update(schema.orders)
      .set({
        status: 'payment_verified',
        updatedAt: now,
        adminNotes: `Payment of ${order.totalPaise / 100} INR approved by ${admin.name || admin.email} on ${new Date(now).toISOString()}`,
      })
      .where(eq(schema.orders.id, order.id));

    // 4. Send Gmail Confirmation Email to Customer
    await sendPaymentApprovedEmail(c.env, order);

    await db
      .update(schema.adminNotifications)
      .set({ isRead: true })
      .where(eq(schema.adminNotifications.orderId, order.id));

    return c.json({
      success: true,
      message: `Payment for Order #${order.orderNumber} approved! Stock committed and customer notified.`,
      status: 'payment_verified',
    });
  } else {
    // Reject Payment: Release reserved stock back to inventory
    for (const item of orderItems) {
      await releaseStockAtomic(
        db,
        item.variantId,
        item.quantity,
        order.id,
        `Payment rejected: ${rejectionReason || 'Invalid bank credit'}`
      );
    }

    await db
      .update(schema.payments)
      .set({
        status: 'rejected',
        adminId: admin.id,
        rejectionReason: rejectionReason || 'Payment could not be verified in bank statement',
      })
      .where(eq(schema.payments.id, payment.id));

    await db
      .update(schema.orders)
      .set({
        status: 'rejected',
        updatedAt: now,
        adminNotes: `Payment rejected by ${admin.name || admin.email}: ${rejectionReason || 'No reason provided'}`,
      })
      .where(eq(schema.orders.id, order.id));

    await sendPaymentRejectedEmail(
      c.env,
      order,
      rejectionReason || 'Payment could not be verified in bank statement'
    );

    await db
      .update(schema.adminNotifications)
      .set({ isRead: true })
      .where(eq(schema.adminNotifications.orderId, order.id));

    return c.json({
      success: true,
      message: `Payment rejected. Stock reservation released for Order #${order.orderNumber}.`,
      status: 'rejected',
    });
  }
});

// ==========================================
// 2. MANUAL DELHIVERY TRACKING WORKFLOW
// ==========================================

// Add or Update Delhivery Shipment Tracking
adminRouter.post('/orders/:id/shipment', async (c) => {
  const orderId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = DelhiveryAwbSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid shipment data' }, 400);
  }

  const { awbNumber: rawAwb, courierName, status, location, remarks } = parseResult.data;
  const awbNumber = rawAwb?.trim() || 'DIRECT-LINK';
  const trackingUrl =
    (parseResult.data.trackingUrl && parseResult.data.trackingUrl.trim()) ||
    generateDelhiveryTrackingUrl(awbNumber);
  const isPersonalMode = c.env.DELHIVERY_PERSONAL === 'true';
  const db = getDb(c.env);
  const now = Date.now();

  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
  });

  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  const existingShipment = await db.query.shipments.findFirst({
    where: eq(schema.shipments.orderId, order.id),
  });

  let history: Array<{ status: any; timestamp: number; location?: string; remarks?: string }> = [];
  if (existingShipment?.statusUpdatesJson) {
    try {
      history = JSON.parse(existingShipment.statusUpdatesJson);
    } catch (e) {}
  }

  // Append new status event to shipment history
  const resolvedStatus = status;
  const resolvedLocation = location;
  const resolvedRemarks = remarks;

  history.push({
    status: resolvedStatus,
    timestamp: now,
    location: resolvedLocation || undefined,
    remarks: resolvedRemarks || undefined,
  });

  let shipmentId = existingShipment?.id;

  if (existingShipment) {
    await db
      .update(schema.shipments)
      .set({
        awbNumber,
        courierName,
        trackingUrl,
        status: resolvedStatus,
        statusUpdatesJson: JSON.stringify(history),
        dispatchedAt: resolvedStatus === 'in_transit' || resolvedStatus === 'picked_up' ? now : existingShipment.dispatchedAt,
        deliveredAt: resolvedStatus === 'delivered' ? now : existingShipment.deliveredAt,
        updatedAt: now,
      })
      .where(eq(schema.shipments.id, existingShipment.id));
  } else {
    shipmentId = `shp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.insert(schema.shipments).values({
      id: shipmentId,
      orderId: order.id,
      courierName,
      awbNumber,
      trackingUrl,
      status: resolvedStatus,
      statusUpdatesJson: JSON.stringify(history),
      dispatchedAt: resolvedStatus === 'in_transit' || resolvedStatus === 'picked_up' ? now : null,
      deliveredAt: resolvedStatus === 'delivered' ? now : null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Synchronize Order status with shipment progression
  let newOrderStatus: typeof schema.orders.$inferInsert['status'] = order.status;
  if (resolvedStatus === 'picked_up' || resolvedStatus === 'in_transit' || resolvedStatus === 'out_for_delivery') {
    newOrderStatus = 'shipped';
  } else if (resolvedStatus === 'delivered') {
    newOrderStatus = 'delivered';
  }

  if (newOrderStatus !== order.status) {
    await db
      .update(schema.orders)
      .set({
        status: newOrderStatus,
        updatedAt: now,
      })
      .where(eq(schema.orders.id, order.id));

    // Send corresponding transactional emails
    if (newOrderStatus === 'shipped') {
      await sendDelhiveryShippedEmail(
        c.env,
        order,
        { awbNumber, trackingUrl }
      );
    } else if (newOrderStatus === 'delivered') {
      await sendOrderDeliveredEmail(c.env, order);
    }
  }

  return c.json({
    success: true,
    message: `Shipment status updated to "${resolvedStatus}" with Delhivery AWB: ${awbNumber}`,
    shipment: {
      id: shipmentId,
      orderId: order.id,
      awbNumber,
      courierName,
      trackingUrl,
      status: resolvedStatus,
      statusUpdates: history,
    },
    orderStatus: newOrderStatus,
  });
});

// Sync live tracking from Delhivery API by existing AWB
adminRouter.post('/orders/:id/sync-delhivery', async (c) => {
  const orderId = c.req.param('id');
  const db = getDb(c.env);
  const now = Date.now();

  const shipment = await db.query.shipments.findFirst({
    where: eq(schema.shipments.orderId, orderId),
  });

  if (!shipment) {
    return c.json({ error: 'No Delhivery AWB assigned to this order yet.' }, 404);
  }

  const trackingUrl =
    shipment.trackingUrl ||
    (shipment.awbNumber && shipment.awbNumber !== 'DIRECT-LINK'
      ? generateDelhiveryTrackingUrl(shipment.awbNumber)
      : 'https://www.delhivery.com');

  return c.json({
    synced: true,
    message: 'Direct Delhivery official tracking link is active for this order.',
    trackingUrl,
    status: shipment.status,
  });
});

// ==========================================
// 3. CATALOG & MERCHANDISING MANAGEMENT
// ==========================================

// Get all products for admin catalog table
adminRouter.get('/products', async (c) => {
  const db = getDb(c.env);
  const products = await db.query.products.findMany({
    orderBy: [desc(schema.products.isPinned), asc(schema.products.displayOrder), desc(schema.products.createdAt)],
  });

  const enriched = await Promise.all(
    products.map(async (p) => {
      const [images, variants, category] = await Promise.all([
        db.query.productImages.findMany({
          where: eq(schema.productImages.productId, p.id),
          orderBy: [asc(schema.productImages.displayOrder)],
        }),
        db.query.productVariants.findMany({
          where: eq(schema.productVariants.productId, p.id),
        }),
        db.query.categories.findFirst({
          where: eq(schema.categories.id, p.categoryId),
        }),
      ]);

      const totalStock = variants.reduce((sum, v) => sum + v.stockQty, 0);
      const totalReserved = variants.reduce((sum, v) => sum + v.reservedStock, 0);

      return {
        ...p,
        categoryName: category?.name,
        images,
        variants,
        totalStock,
        totalReserved,
        availableStock: Math.max(0, totalStock - totalReserved),
      };
    })
  );

  return c.json({ products: enriched });
});

// Create Product
adminRouter.post('/products', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = ProductCreateUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid product data' }, 400);
  }

  const data = parseResult.data;
  const db = getDb(c.env);
  const now = Date.now();
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Ensure a valid categoryId exists (auto-provision default 'cat_sarees' if clean Prod DB has none)
  let resolvedCategoryId = data.categoryId || 'cat_sarees';
  const existingCat = await db.query.categories.findFirst({
    where: eq(schema.categories.id, resolvedCategoryId),
  });
  if (!existingCat) {
    const anyCat = await db.query.categories.findFirst();
    if (anyCat) {
      resolvedCategoryId = anyCat.id;
    } else {
      resolvedCategoryId = 'cat_sarees';
      await db.insert(schema.categories).values({
        id: 'cat_sarees',
        name: 'Sarees',
        slug: 'sarees',
        description: 'Curated Sarees',
        displayOrder: 1,
        isActive: true,
        createdAt: now,
      });
    }
  }

  // Find lowest price among variants for base price
  const basePricePaise = Math.min(...data.variants.map((v) => v.pricePaise));
  const baseMrpPaise = Math.min(...data.variants.map((v) => v.mrpPaise));

  await db.insert(schema.products).values({
    id: productId,
    categoryId: resolvedCategoryId,
    title: data.title,
    slug: data.slug,
    subtitle: data.subtitle || null,
    description: data.description,
    specificationsJson: JSON.stringify(data.specifications),
    careInstructions: data.careInstructions || null,
    blouseDetails: data.blouseDetails || null,
    weaveType: data.weaveType || null,
    occasion: data.occasion || null,
    fabric: data.fabric || null,
    instagramUrl: data.instagramUrl || null,
    baseMrpPaise,
    basePricePaise,
    displayOrder: data.displayOrder,
    isPinned: data.isPinned,
    isFeatured: data.isFeatured,
    isNewArrival: data.isNewArrival,
    isOutOfStock: data.isOutOfStock,
    status: data.status,
    viewsCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Create variants
  for (const v of data.variants) {
    await db.insert(schema.productVariants).values({
      id: v.id || `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId,
      colorName: v.colorName,
      colorHex: v.colorHex,
      sku: v.sku,
      stockQty: v.stockQty,
      reservedStock: 0,
      pricePaise: v.pricePaise,
      mrpPaise: v.mrpPaise,
      isDefault: v.isDefault,
      isActive: v.isActive,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Create images
  for (const img of data.images) {
    await db.insert(schema.productImages).values({
      id: img.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId,
      imageUrl: img.imageUrl,
      r2Key: img.r2Key || null,
      altText: img.altText || null,
      displayOrder: img.displayOrder,
      isPrimary: img.isPrimary,
      createdAt: now,
    });
  }

  return c.json({ success: true, productId, message: 'Saree added to catalog successfully' });
});

// Update Product & Priority
adminRouter.put('/products/:id', async (c) => {
  const productId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const now = Date.now();

  const existing = await db.query.products.findFirst({
    where: eq(schema.products.id, productId),
  });

  if (!existing) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Quick field updates or full update
  const updates: Partial<typeof schema.products.$inferInsert> = {
    updatedAt: now,
  };

  if (body.displayOrder !== undefined) updates.displayOrder = body.displayOrder;
  if (body.isPinned !== undefined) updates.isPinned = body.isPinned;
  if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured;
  if (body.isNewArrival !== undefined) updates.isNewArrival = body.isNewArrival;
  if (body.isOutOfStock !== undefined) updates.isOutOfStock = body.isOutOfStock;
  if (body.status !== undefined) updates.status = body.status;
  if (body.title !== undefined) updates.title = body.title;
  if (body.subtitle !== undefined) updates.subtitle = body.subtitle;
  if (body.description !== undefined) updates.description = body.description;
  if (body.fabric !== undefined) updates.fabric = body.fabric;
  if (body.instagramUrl !== undefined) updates.instagramUrl = body.instagramUrl || null;
  if (body.weaveType !== undefined) updates.weaveType = body.weaveType;
  if (body.occasion !== undefined) updates.occasion = body.occasion;
  if (body.blouseDetails !== undefined) updates.blouseDetails = body.blouseDetails;
  if (body.careInstructions !== undefined) updates.careInstructions = body.careInstructions;
  if (body.basePricePaise !== undefined) updates.basePricePaise = body.basePricePaise;
  if (body.baseMrpPaise !== undefined) updates.baseMrpPaise = body.baseMrpPaise;

  // If variants provided, remove deleted variants, upsert remaining/new, and recalculate base price/MRP
  if (Array.isArray(body.variants) && body.variants.length > 0) {
    const existingVariants = await db.query.productVariants.findMany({
      where: eq(schema.productVariants.productId, productId),
    });
    const submittedIds = new Set(body.variants.map((v: any) => v.id).filter(Boolean));
    for (const oldVar of existingVariants) {
      if (!submittedIds.has(oldVar.id)) {
        try {
          await db.delete(schema.productVariants).where(eq(schema.productVariants.id, oldVar.id));
        } catch {
          // If referenced by past orders/inventory logs, softly deactivate instead
          await db
            .update(schema.productVariants)
            .set({ isActive: false, stockQty: 0, updatedAt: now })
            .where(eq(schema.productVariants.id, oldVar.id));
        }
      }
    }

    const prices: number[] = [];
    const mrps: number[] = [];
    for (const v of body.variants) {
      prices.push(v.pricePaise);
      mrps.push(v.mrpPaise);
      if (v.id) {
        await db
          .update(schema.productVariants)
          .set({
            colorName: v.colorName,
            colorHex: v.colorHex,
            sku: v.sku,
            stockQty: v.stockQty,
            pricePaise: v.pricePaise,
            mrpPaise: v.mrpPaise,
            isDefault: Boolean(v.isDefault),
            isActive: v.isActive !== false,
            updatedAt: now,
          })
          .where(eq(schema.productVariants.id, v.id));
      } else {
        await db.insert(schema.productVariants).values({
          id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productId,
          colorName: v.colorName,
          colorHex: v.colorHex,
          sku: v.sku,
          stockQty: v.stockQty,
          reservedStock: 0,
          pricePaise: v.pricePaise,
          mrpPaise: v.mrpPaise,
          isDefault: Boolean(v.isDefault),
          isActive: v.isActive !== false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    updates.basePricePaise = Math.min(...prices);
    updates.baseMrpPaise = Math.min(...mrps);
  }

  await db.update(schema.products).set(updates).where(eq(schema.products.id, productId));

  // If images provided, replace images
  if (Array.isArray(body.images)) {
    await db.delete(schema.productImages).where(eq(schema.productImages.productId, productId));
    for (let idx = 0; idx < body.images.length; idx++) {
      const img = body.images[idx];
      await db.insert(schema.productImages).values({
        id: img.id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId,
        imageUrl: img.imageUrl,
        r2Key: img.r2Key || null,
        altText: img.altText || null,
        displayOrder: img.displayOrder ?? idx,
        isPrimary: img.isPrimary ?? idx === 0,
        createdAt: now,
      });
    }
  }

  return c.json({ success: true, message: 'Product updated successfully' });
});

// Archive / Delete Product
adminRouter.delete('/products/:id', async (c) => {
  const productId = c.req.param('id');
  const db = getDb(c.env);
  await db
    .update(schema.products)
    .set({ status: 'archived', updatedAt: Date.now() })
    .where(eq(schema.products.id, productId));
  return c.json({ success: true, message: 'Saree archived from storefront' });
});

// ==========================================
// 4. COUPONS CRUD
// ==========================================
adminRouter.get('/coupons', async (c) => {
  const db = getDb(c.env);
  const coupons = await db.query.coupons.findMany({
    orderBy: [desc(schema.coupons.createdAt)],
  });
  return c.json({ coupons });
});

adminRouter.post('/coupons', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parseResult = CouponCreateUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.errors[0]?.message || 'Invalid coupon data' }, 400);
  }

  const data = parseResult.data;
  const db = getDb(c.env);
  const now = Date.now();
  const couponId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  await db.insert(schema.coupons).values({
    id: couponId,
    code: data.code,
    discountType: data.discountType,
    discountValue: data.discountValue,
    minOrderPaise: data.minOrderPaise,
    maxDiscountPaise: data.maxDiscountPaise || null,
    usageLimitTotal: data.usageLimitTotal || null,
    usageLimitPerUser: data.usageLimitPerUser || null,
    usageCount: 0,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    isActive: data.isActive,
    appliesTo: data.appliesTo,
    conditionsJson: '{}',
    createdAt: now,
  });

  return c.json({ success: true, couponId, message: 'Coupon created successfully' });
});

adminRouter.put('/coupons/:id', async (c) => {
  const couponId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const updates: Partial<typeof schema.coupons.$inferInsert> = {};
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
  if (body.discountValue !== undefined) updates.discountValue = Number(body.discountValue);
  if (body.minOrderPaise !== undefined) updates.minOrderPaise = Number(body.minOrderPaise);
  if (body.maxDiscountPaise !== undefined) updates.maxDiscountPaise = body.maxDiscountPaise ? Number(body.maxDiscountPaise) : null;

  await db.update(schema.coupons).set(updates).where(eq(schema.coupons.id, couponId));
  return c.json({ success: true, message: 'Coupon updated successfully' });
});

adminRouter.delete('/coupons/:id', async (c) => {
  const couponId = c.req.param('id');
  const db = getDb(c.env);
  await db.delete(schema.coupons).where(eq(schema.coupons.id, couponId));
  return c.json({ success: true, message: 'Coupon deleted' });
});

// ==========================================
// 4b. STORE SETTINGS & REVIEW MODERATION
// ==========================================
adminRouter.get('/settings', async (c) => {
  const db = getDb(c.env);
  const row = await db.query.storeSettings.findFirst({
    where: eq(schema.storeSettings.key, 'general'),
  });
  let settings: any = {};
  if (row?.valueJson) {
    try {
      settings = JSON.parse(row.valueJson);
    } catch (e) {}
  }
  return c.json({ settings });
});

adminRouter.put('/settings', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const now = Date.now();
  const row = await db.query.storeSettings.findFirst({
    where: eq(schema.storeSettings.key, 'general'),
  });
  let current: any = {};
  if (row?.valueJson) {
    try {
      current = JSON.parse(row.valueJson);
    } catch (e) {}
  }
  const merged = { ...current, ...body };
  if (row) {
    await db
      .update(schema.storeSettings)
      .set({ valueJson: JSON.stringify(merged), updatedAt: now })
      .where(eq(schema.storeSettings.id, row.id));
  } else {
    await db.insert(schema.storeSettings).values({
      id: 'setting_general',
      key: 'general',
      valueJson: JSON.stringify(merged),
      updatedAt: now,
    });
  }
  return c.json({ success: true, settings: merged });
});

adminRouter.get('/reviews', async (c) => {
  const db = getDb(c.env);
  const reviews = await db.query.reviews.findMany({
    orderBy: [desc(schema.reviews.createdAt)],
  });
  return c.json({ reviews });
});

adminRouter.put('/reviews/:id', async (c) => {
  const reviewId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  await db
    .update(schema.reviews)
    .set({ isApproved: Boolean(body.isApproved) })
    .where(eq(schema.reviews.id, reviewId));
  return c.json({ success: true });
});

// ==========================================
// 5. ANALYTICS & DASHBOARD METRICS
// ==========================================
adminRouter.get('/analytics', async (c) => {
  const db = getDb(c.env);

  // 1. All Orders
  const allOrders = await db.query.orders.findMany({
    orderBy: [desc(schema.orders.createdAt)],
  });

  const verifiedOrders = allOrders.filter(
    (o) =>
      o.status === 'payment_verified' ||
      o.status === 'processing' ||
      o.status === 'shipped' ||
      o.status === 'delivered'
  );

  const totalRevenuePaise = verifiedOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalDiscountPaise = verifiedOrders.reduce((sum, o) => sum + o.discountPaise, 0);
  const pendingApprovalsCount = allOrders.filter((o) => o.status === 'payment_submitted').length;

  // 2. Stock Alerts
  const allVariants = await db.query.productVariants.findMany({
    where: eq(schema.productVariants.isActive, true),
  });

  const lowStockCount = allVariants.filter(
    (v) => v.stockQty - v.reservedStock > 0 && v.stockQty - v.reservedStock <= 3
  ).length;

  const outOfStockCount = allVariants.filter(
    (v) => v.stockQty - v.reservedStock <= 0
  ).length;

  // 3. Most Viewed Sarees
  const mostViewedRaw = await db.query.products.findMany({
    where: eq(schema.products.status, 'published'),
    orderBy: [desc(schema.products.viewsCount)],
    limit: 5,
  });

  const mostViewed = await Promise.all(
    mostViewedRaw.map(async (p) => {
      const img = await db.query.productImages.findFirst({
        where: eq(schema.productImages.productId, p.id),
      });
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        viewsCount: p.viewsCount,
        imageUrl: img?.imageUrl || '',
      };
    })
  );

  // 4. Most Ordered Sarees
  const allOrderItems = await db.query.orderItems.findMany();
  const salesByProduct = new Map<string, { title: string; count: number; totalSoldPaise: number }>();

  for (const item of allOrderItems) {
    const existing = salesByProduct.get(item.productId) || {
      title: item.title,
      count: 0,
      totalSoldPaise: 0,
    };
    existing.count += item.quantity;
    existing.totalSoldPaise += item.totalPaise;
    salesByProduct.set(item.productId, existing);
  }

  const mostOrdered = Array.from(salesByProduct.entries())
    .map(([id, val]) => ({ id, title: val.title, orderCount: val.count, totalSoldPaise: val.totalSoldPaise }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 5);

  // 5. Daily Revenue Breakdown (Last 7 Days)
  const dailyMap = new Map<string, { revenuePaise: number; ordersCount: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateKey = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    dailyMap.set(dateKey, { revenuePaise: 0, ordersCount: 0 });
  }

  for (const o of verifiedOrders) {
    const d = new Date(o.createdAt);
    const dateKey = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    if (dailyMap.has(dateKey)) {
      const curr = dailyMap.get(dateKey)!;
      curr.revenuePaise += o.totalPaise;
      curr.ordersCount += 1;
    }
  }

  const dailyRevenue = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    revenuePaise: data.revenuePaise,
    ordersCount: data.ordersCount,
  }));

  return c.json({
    analytics: {
      totalRevenuePaise,
      totalOrders: verifiedOrders.length,
      pendingApprovalsCount,
      totalDiscountPaise,
      lowStockCount,
      outOfStockCount,
      mostViewed,
      mostOrdered,
      dailyRevenue,
      recentOrders: allOrders.slice(0, 10),
    },
  });
});

// Polling Alert Endpoint for Admin Header Notification Bell
adminRouter.get('/notifications', async (c) => {
  const db = getDb(c.env);
  const [pendingPayments, notifications] = await Promise.all([
    db.query.payments.findMany({
      where: eq(schema.payments.status, 'submitted'),
      orderBy: [desc(schema.payments.createdAt)],
    }),
    db.query.adminNotifications.findMany({
      orderBy: [desc(schema.adminNotifications.createdAt)],
      limit: 20,
    }),
  ]);

  return c.json({
    pendingApprovalsCount: pendingPayments.length,
    pendingPayments,
    notifications,
  });
});
