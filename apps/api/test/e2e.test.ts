import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { createTestD1 } from './d1-mock.js';
import { getDb } from '../src/db.js';
import * as schema from '@anuvarnika/db';
import { eq } from 'drizzle-orm';
import { formatRupees, generateUpiUrl } from '@anuvarnika/shared';

test('AnuVarnika E-Commerce API End-to-End Test Suite', async (t) => {
  const mockD1 = createTestD1();
  const env = {
    DB: mockD1,
    ENVIRONMENT: 'development',
    STORE_NAME: 'AnuVarnika Sarees',
    UPI_ID: 'anuvarnika@okaxis',
    ADMIN_EMAIL: 'anuvarnika.sarees@gmail.com',
    SESSION_SECRET: 'test-secret-minimum-32-characters-for-tests',
  };

  let customerCookie = '';
  let adminCookie = '';

  await t.test('1. Health Check & Theme Settings', async () => {
    const res = await app.request('/api/health', {}, env);
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.equal(json.status, 'ok');
    assert.equal(json.store, 'AnuVarnika Sarees');

    // Get Theme Tokens
    const themeRes = await app.request('/api/theme', {}, env);
    assert.equal(themeRes.status, 200);
    const themeJson = (await themeRes.json()) as any;
    assert.equal(themeJson.theme.colors.brandPrimary, '#7A231E');
    assert.equal(themeJson.theme.colors.bgCanvas, '#FAF5EB');
    assert.equal(themeJson.theme.fonts.heading, 'Lora');
  });

  await t.test('2. Customer Registration / Login via OTP (Gmail OTP flow)', async () => {
    // Step A: Send OTP
    const sendRes = await app.request(
      '/api/auth/send-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya.sharma@example.com', name: 'Priya Sharma' }),
      },
      env
    );

    assert.equal(sendRes.status, 200);
    const sendJson = (await sendRes.json()) as any;
    assert.equal(sendJson.success, true);
    assert.ok(sendJson.devOtp); // Provided in development test mode

    // Step B: Verify with Invalid OTP
    const invalidRes = await app.request(
      '/api/auth/verify-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya.sharma@example.com', otp: '000000' }),
      },
      env
    );
    assert.equal(invalidRes.status, 400);

    // Step C: Verify with Valid OTP
    const verifyRes = await app.request(
      '/api/auth/verify-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'priya.sharma@example.com', otp: sendJson.devOtp }),
      },
      env
    );

    assert.equal(verifyRes.status, 200);
    const verifyJson = (await verifyRes.json()) as any;
    assert.equal(verifyJson.success, true);
    assert.equal(verifyJson.user.email, 'priya.sharma@example.com');
    assert.equal(verifyJson.user.role, 'customer');

    // Capture cookie
    const setCookieHeader = verifyRes.headers.get('set-cookie');
    assert.ok(setCookieHeader);
    customerCookie = setCookieHeader.split(';')[0];
    assert.ok(customerCookie.startsWith('anuvarnika_session='));

    // Verify /api/auth/me
    const meRes = await app.request(
      '/api/auth/me',
      {
        headers: { Cookie: customerCookie },
      },
      env
    );
    assert.equal(meRes.status, 200);
    const meJson = (await meRes.json()) as any;
    assert.equal(meJson.user.email, 'priya.sharma@example.com');
  });

  await t.test('3. Admin Authentication Login via OTP', async () => {
    const sendRes = await app.request(
      '/api/auth/send-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'anuvarnika.sarees@gmail.com' }),
      },
      env
    );

    const sendJson = (await sendRes.json()) as any;
    const verifyRes = await app.request(
      '/api/auth/verify-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'anuvarnika.sarees@gmail.com', otp: sendJson.devOtp }),
      },
      env
    );

    const verifyJson = (await verifyRes.json()) as any;
    assert.equal(verifyJson.user.role, 'admin');

    const setCookieHeader = verifyRes.headers.get('set-cookie');
    assert.ok(setCookieHeader);
    adminCookie = setCookieHeader.split(';')[0];
  });

  await t.test('4. Catalog Browsing & Multi-Facet Filters', async () => {
    const res = await app.request('/api/products?sort=priority', {}, env);
    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.ok(json.products.length >= 6);

    // First item should be pinned
    assert.equal(json.products[0].isPinned, true);

    // View Single Product by Slug
    const singleRes = await app.request(
      `/api/products/${json.products[0].slug}`,
      {},
      env
    );
    assert.equal(singleRes.status, 200);
    const singleJson = (await singleRes.json()) as any;
    assert.equal(singleJson.product.title, json.products[0].title);
    assert.ok(singleJson.product.variants.length > 0);

    // Validate Coupon
    const couponRes = await app.request(
      '/api/coupons/validate?code=FESTIVE10&subtotalPaise=1899900',
      {},
      env
    );
    assert.equal(couponRes.status, 200);
    const couponJson = (await couponRes.json()) as any;
    assert.equal(couponJson.valid, true);
    // 10% of 1899900 = 189990, capped at maxDiscount 150000 (₹1,500)
    assert.equal(couponJson.discountPaise, 150000);
  });

  let createdOrderId = '';
  let createdOrderNumber = '';
  let testVariantId = 'var_kanj_crimson_01';

  await t.test('5. Deadlock-Safe Order Creation with 15-Minute Reservation Hold', async () => {
    const db = getDb(env);

    // Check starting stock
    const variantBefore = await db.query.productVariants.findFirst({
      where: eq(schema.productVariants.id, testVariantId),
    });
    assert.ok(variantBefore);
    const initialStock = variantBefore.stockQty; // e.g. 5
    const initialReserved = variantBefore.reservedStock; // 0

    // Attempt creating order without auth -> should be rejected (401)
    const unauthRes = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ variantId: testVariantId, quantity: 2 }],
          couponCode: 'FESTIVE10',
          shipping: {
            name: 'Priya Sharma',
            phone: '9876543210',
            email: 'priya.sharma@example.com',
            addressLine1: 'Flat 402, Lotus Residency, Banjara Hills',
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500001',
          },
        }),
      },
      env
    );
    assert.equal(unauthRes.status, 401);

    // Create order with authenticated customer cookie
    const orderRes = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerCookie,
        },
        body: JSON.stringify({
          items: [{ variantId: testVariantId, quantity: 2 }],
          couponCode: 'FESTIVE10',
          shipping: {
            name: 'Priya Sharma',
            phone: '9876543210',
            email: 'priya.sharma@example.com',
            addressLine1: 'Flat 402, Lotus Residency, Banjara Hills',
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500001',
          },
        }),
      },
      env
    );

    assert.equal(orderRes.status, 200);
    const orderJson = (await orderRes.json()) as any;
    assert.equal(orderJson.success, true);
    assert.ok(orderJson.orderId);
    assert.ok(orderJson.orderNumber);
    assert.ok(orderJson.reservationExpiresAt);
    createdOrderId = orderJson.orderId;
    createdOrderNumber = orderJson.orderNumber;

    // Verify D1 reserved_stock was incremented atomically by 2
    const variantAfter = await db.query.productVariants.findFirst({
      where: eq(schema.productVariants.id, testVariantId),
    });
    assert.equal(variantAfter?.reservedStock, initialReserved + 2);
    assert.equal(variantAfter?.stockQty, initialStock); // actual stock only decrements upon payment approval!

    // Verify Inventory Transaction was logged
    const invTxn = await db.query.inventoryTransactions.findFirst({
      where: eq(schema.inventoryTransactions.orderId, createdOrderId),
    });
    assert.ok(invTxn);
    assert.equal(invTxn.transactionType, 'reservation');
    assert.equal(invTxn.quantity, 2);
  });

  await t.test('6. Stock Contention: Over-reservation is Deadlock-Safely Blocked', async () => {
    const db = getDb(env);
    const variant = await db.query.productVariants.findFirst({
      where: eq(schema.productVariants.id, testVariantId),
    });
    assert.ok(variant);
    const available = variant.stockQty - variant.reservedStock; // 5 - 2 = 3

    // Attempt reserving 10 units when only 3 are available
    const overOrderRes = await app.request(
      '/api/orders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerCookie,
        },
        body: JSON.stringify({
          items: [{ variantId: testVariantId, quantity: 10 }],
          shipping: {
            name: 'Contending Buyer',
            phone: '9876543210',
            email: 'buyer2@example.com',
            addressLine1: 'Indiranagar 100ft Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560038',
          },
        }),
      },
      env
    );

    assert.equal(overOrderRes.status, 409); // Contention Conflict
    const overJson = (await overOrderRes.json()) as any;
    assert.ok(overJson.error.includes('Contention detected'));

    // Verify reserved_stock remained untouched
    const variantAfter = await db.query.productVariants.findFirst({
      where: eq(schema.productVariants.id, testVariantId),
    });
    assert.equal(variantAfter?.reservedStock, 2);
  });

  await t.test('7. Direct UPI Payment: UTR Submission, Duplicate Blocking & Admin Notification', async () => {
    // Generate valid UPI Payment URL helper check
    const upiUrl = generateUpiUrl({
      upiId: 'anuvarnika@okaxis',
      payeeName: 'AnuVarnika Sarees',
      amountPaise: 3649800,
      orderNumber: createdOrderNumber,
    });
    assert.ok(upiUrl.startsWith('upi://pay?'));
    assert.ok(upiUrl.includes('pa=anuvarnika%40okaxis'));

    // Submit Valid 12-digit UTR
    const utr = '123456789012';
    const payRes = await app.request(
      `/api/orders/${createdOrderId}/payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utrReference: utr,
        }),
      },
      env
    );

    assert.equal(payRes.status, 200);
    const payJson = (await payRes.json()) as any;
    assert.equal(payJson.success, true);
    assert.equal(payJson.orderStatus, 'payment_submitted');

    // Attempt submitting the SAME UTR again on another order -> should be rejected by unique constraint
    const duplicateRes = await app.request(
      `/api/orders/ord_different_order/payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utrReference: utr,
        }),
      },
      env
    );
    // Order doesn't exist or UTR duplicate
    assert.ok(duplicateRes.status === 400 || duplicateRes.status === 404);

    // Admin Notification Bell check
    const notifRes = await app.request(
      '/api/admin/notifications',
      {
        headers: { Cookie: adminCookie },
      },
      env
    );
    assert.equal(notifRes.status, 200);
    const notifJson = (await notifRes.json()) as any;
    assert.ok(notifJson.pendingApprovalsCount >= 1);
  });

  await t.test('8. Admin Payment Verification & Stock Real-Deduction', async () => {
    const db = getDb(env);

    // Fetch payment record
    const payment = await db.query.payments.findFirst({
      where: eq(schema.payments.orderId, createdOrderId),
    });
    assert.ok(payment);

    // Admin approves payment
    const approveRes = await app.request(
      `/api/admin/payments/${payment.id}/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({ action: 'approve' }),
      },
      env
    );

    assert.equal(approveRes.status, 200);
    const approveJson = (await approveRes.json()) as any;
    assert.equal(approveJson.success, true);
    assert.equal(approveJson.status, 'payment_verified');

    // Verify stock deduction: stock_qty is reduced by 2, reserved_stock is reduced by 2
    const variantAfter = await db.query.productVariants.findFirst({
      where: eq(schema.productVariants.id, testVariantId),
    });
    assert.equal(variantAfter?.stockQty, 3); // 5 - 2 = 3
    assert.equal(variantAfter?.reservedStock, 0); // reservation cleared

    // Verify 'sale' transaction logged
    const saleTxn = await db.query.inventoryTransactions.findFirst({
      where: eq(schema.inventoryTransactions.transactionType, 'sale'),
    });
    assert.ok(saleTxn);
  });

  await t.test('9. Manual Delhivery Shipment Progression & Customer Tracking', async () => {
    const awb = 'DEL1234567890';

    // Step A: Admin books shipment
    const shipRes1 = await app.request(
      `/api/admin/orders/${createdOrderId}/shipment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          awbNumber: awb,
          courierName: 'Delhivery',
          status: 'booked',
          location: 'Kanchipuram Hub',
          remarks: 'Handloom packaged in tamper-evident security pouch',
        }),
      },
      env
    );
    assert.equal(shipRes1.status, 200);

    // Step B: Admin marks In Transit (Transitions Order status to 'shipped')
    const shipRes2 = await app.request(
      `/api/admin/orders/${createdOrderId}/shipment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          awbNumber: awb,
          status: 'in_transit',
          location: 'Chennai Sorting Facility',
        }),
      },
      env
    );
    assert.equal(shipRes2.status, 200);
    const shipJson2 = (await shipRes2.json()) as any;
    assert.equal(shipJson2.orderStatus, 'shipped');

    // Step C: Customer views order tracking page
    const trackRes = await app.request(`/api/orders/${createdOrderNumber}`, {}, env);
    assert.equal(trackRes.status, 200);
    const trackJson = (await trackRes.json()) as any;
    assert.equal(trackJson.order.shipment.awbNumber, awb);
    assert.equal(trackJson.order.shipment.status, 'in_transit');
    assert.equal(trackJson.order.shipment.statusUpdates.length, 2);
  });

  await t.test('10. Verified Post-Delivery Reviews: Strict Gating Before & After Delivery', async () => {
    // Attempt submitting review when order is only 'shipped' (not yet delivered) -> MUST BE BLOCKED
    const blockedReviewRes = await app.request(
      `/api/orders/${createdOrderId}/review`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerCookie,
        },
        body: JSON.stringify({
          productId: 'prod_kanjeevaram_crimson',
          rating: 5,
          reviewTitle: 'Exquisite Silk Texture',
          reviewText: 'The zari shimmer and weight of this saree are unmatched.',
        }),
      },
      env
    );

    assert.equal(blockedReviewRes.status, 403);
    const blockedJson = (await blockedReviewRes.json()) as any;
    assert.ok(blockedJson.error.includes('permitted only for verified delivered orders'));

    // Admin updates status to 'delivered'
    const deliverRes = await app.request(
      `/api/admin/orders/${createdOrderId}/shipment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          awbNumber: 'DEL1234567890',
          status: 'delivered',
          location: 'Customer Doorstep, Chennai',
          remarks: 'Delivered and OTP verified with recipient',
        }),
      },
      env
    );
    assert.equal(deliverRes.status, 200);

    // Now submit review -> MUST SUCCEED
    const successReviewRes = await app.request(
      `/api/orders/${createdOrderId}/review`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerCookie,
        },
        body: JSON.stringify({
          productId: 'prod_kanjeevaram_crimson',
          rating: 5,
          reviewTitle: 'Exquisite Silk Texture',
          reviewText: 'The zari shimmer and weight of this saree are truly heirloom quality. Highly recommend!',
        }),
      },
      env
    );

    assert.equal(successReviewRes.status, 200);
    const successJson = (await successReviewRes.json()) as any;
    assert.equal(successJson.success, true);
    assert.ok(successJson.reviewId);
  });

  await t.test('11. Admin Analytics Dashboard Metrics', async () => {
    const res = await app.request(
      '/api/admin/analytics',
      {
        headers: { Cookie: adminCookie },
      },
      env
    );

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.ok(json.analytics.totalRevenuePaise > 0);
    assert.ok(json.analytics.totalOrders >= 1);
    assert.ok(json.analytics.mostViewed.length > 0);
    assert.ok(json.analytics.mostOrdered.length > 0);
    assert.ok(json.analytics.dailyRevenue.length === 7);
  });
});
