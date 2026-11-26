import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// --- USERS & AUTH ---
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    phone: text('phone'),
    role: text('role', { enum: ['customer', 'admin'] }).notNull().default('customer'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
  })
);

export const otpVerifications = sqliteTable(
  'otp_verifications',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    otpHash: text('otp_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: integer('expires_at').notNull(),
    verifiedAt: integer('verified_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    emailExpiresIdx: index('otp_email_expires_idx').on(table.email, table.expiresAt),
  })
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: integer('expires_at').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('sessions_token_idx').on(table.tokenHash),
    userIdx: index('sessions_user_idx').on(table.userId),
    expiresIdx: index('sessions_expires_idx').on(table.expiresAt),
  })
);

// --- THEME SETTINGS ---
export const themeSettings = sqliteTable('theme_settings', {
  id: text('id').primaryKey(),
  activePreset: text('active_preset').notNull().default('anu-signature'),
  colorsJson: text('colors_json').notNull(),
  fontsJson: text('fonts_json').notNull(),
  borderRadius: text('border_radius').notNull().default('md'),
  heroStyle: text('hero_style').notNull().default('editorial'),
  showVisitorCounter: integer('show_visitor_counter', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updated_at').notNull(),
  updatedBy: text('updated_by'),
});

// --- CATEGORIES & PRODUCTS ---
export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url'),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex('categories_slug_idx').on(table.slug),
    displayOrderIdx: index('categories_display_order_idx').on(table.displayOrder),
  })
);

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id').notNull().references(() => categories.id),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    subtitle: text('subtitle'),
    description: text('description').notNull(),
    specificationsJson: text('specifications_json').notNull().default('{}'),
    careInstructions: text('care_instructions'),
    blouseDetails: text('blouse_details'),
    weaveType: text('weave_type'),
    occasion: text('occasion'),
    fabric: text('fabric'),
    instagramUrl: text('instagram_url'),
    baseMrpPaise: integer('base_mrp_paise').notNull(),
    basePricePaise: integer('base_price_paise').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    isNewArrival: integer('is_new_arrival', { mode: 'boolean' }).notNull().default(false),
    isOutOfStock: integer('is_out_of_stock', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('published'),
    viewsCount: integer('views_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex('products_slug_idx').on(table.slug),
    categoryIdx: index('products_category_idx').on(table.categoryId),
    displayPriorityIdx: index('products_priority_idx').on(table.isPinned, table.displayOrder),
    statusIdx: index('products_status_idx').on(table.status),
    fabricIdx: index('products_fabric_idx').on(table.fabric),
    occasionIdx: index('products_occasion_idx').on(table.occasion),
  })
);

export const productVariants = sqliteTable(
  'product_variants',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    colorName: text('color_name').notNull(),
    colorHex: text('color_hex').notNull(),
    sku: text('sku').notNull().unique(),
    stockQty: integer('stock_qty').notNull().default(0),
    reservedStock: integer('reserved_stock').notNull().default(0),
    pricePaise: integer('price_paise').notNull(),
    mrpPaise: integer('mrp_paise').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    productIdx: index('variants_product_idx').on(table.productId),
    skuIdx: uniqueIndex('variants_sku_idx').on(table.sku),
  })
);

export const productImages = sqliteTable(
  'product_images',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    imageUrl: text('image_url').notNull(),
    r2Key: text('r2_key'),
    altText: text('alt_text'),
    displayOrder: integer('display_order').notNull().default(0),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    productIdx: index('images_product_idx').on(table.productId),
    variantIdx: index('images_variant_idx').on(table.variantId),
  })
);

// --- INVENTORY AUDIT ---
export const inventoryTransactions = sqliteTable(
  'inventory_transactions',
  {
    id: text('id').primaryKey(),
    variantId: text('variant_id').notNull().references(() => productVariants.id),
    orderId: text('order_id'),
    transactionType: text('transaction_type', {
      enum: ['reservation', 'release', 'sale', 'manual_adjustment', 'cancellation', 'return'],
    }).notNull(),
    quantity: integer('quantity').notNull(), // positive for adds/reservations, negative for release/cancellation
    balanceAfter: integer('balance_after').notNull(),
    reason: text('reason'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    variantIdx: index('inv_trans_variant_idx').on(table.variantId),
    orderIdx: index('inv_trans_order_idx').on(table.orderId),
    createdIdx: index('inv_trans_created_idx').on(table.createdAt),
  })
);

// --- COUPONS ---
export const coupons = sqliteTable(
  'coupons',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    discountType: text('discount_type', { enum: ['flat', 'percentage'] }).notNull(),
    discountValue: integer('discount_value').notNull(), // paise for flat, 1-100 for percentage
    minOrderPaise: integer('min_order_paise').notNull().default(0),
    maxDiscountPaise: integer('max_discount_paise'),
    usageLimitTotal: integer('usage_limit_total'),
    usageLimitPerUser: integer('usage_limit_per_user'),
    usageCount: integer('usage_count').notNull().default(0),
    validFrom: integer('valid_from').notNull(),
    validUntil: integer('valid_until').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    appliesTo: text('applies_to', { enum: ['all', 'categories', 'products'] }).notNull().default('all'),
    conditionsJson: text('conditions_json').default('{}'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex('coupons_code_idx').on(table.code),
    activeIdx: index('coupons_active_idx').on(table.isActive, table.validFrom, table.validUntil),
  })
);

export const couponRedemptions = sqliteTable(
  'coupon_redemptions',
  {
    id: text('id').primaryKey(),
    couponId: text('coupon_id').notNull().references(() => coupons.id),
    orderId: text('order_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id),
    discountAppliedPaise: integer('discount_applied_paise').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    userCouponIdx: index('redemptions_user_coupon_idx').on(table.userId, table.couponId),
    orderIdx: index('redemptions_order_idx').on(table.orderId),
  })
);

// --- SHIPPING ZONES ---
export const shippingZones = sqliteTable(
  'shipping_zones',
  {
    id: text('id').primaryKey(),
    state: text('state').notNull(),
    pinCodePrefix: text('pin_code_prefix'), // e.g. "600", "560", or null for state-wide
    pinCodeExact: text('pin_code_exact'),
    isServiceable: integer('is_serviceable', { mode: 'boolean' }).notNull().default(true),
    shippingChargePaise: integer('shipping_charge_paise').notNull().default(0),
    freeShippingThresholdPaise: integer('free_shipping_threshold_paise').notNull().default(299900), // ₹2,999 default
    estimatedDays: text('estimated_days').notNull().default('3-5 Business Days'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    prefixIdx: index('shipping_prefix_idx').on(table.pinCodePrefix),
    stateIdx: index('shipping_state_idx').on(table.state),
  })
);

// --- CARTS & WISHLISTS ---
export const carts = sqliteTable(
  'carts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    sessionId: text('session_id'),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    userIdx: index('carts_user_idx').on(table.userId),
    sessionIdx: index('carts_session_idx').on(table.sessionId),
  })
);

export const cartItems = sqliteTable(
  'cart_items',
  {
    id: text('id').primaryKey(),
    cartId: text('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
    variantId: text('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    cartVariantIdx: uniqueIndex('cart_items_cart_variant_idx').on(table.cartId, table.variantId),
  })
);

export const wishlists = sqliteTable(
  'wishlists',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    userProductIdx: uniqueIndex('wishlist_user_product_idx').on(table.userId, table.productId),
  })
);

// --- ORDERS & PAYMENTS ---
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    userId: text('user_id').notNull().references(() => users.id),
    status: text('status', {
      enum: [
        'pending_payment',
        'payment_submitted',
        'payment_verified',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'rejected',
        'payment_failed',
      ],
    }).notNull().default('pending_payment'),
    subtotalPaise: integer('subtotal_paise').notNull(),
    discountPaise: integer('discount_paise').notNull().default(0),
    shippingFeePaise: integer('shipping_fee_paise').notNull().default(0),
    totalPaise: integer('total_paise').notNull(),
    couponId: text('coupon_id').references(() => coupons.id),
    reservationExpiresAt: integer('reservation_expires_at'),
    shippingName: text('shipping_name').notNull(),
    shippingPhone: text('shipping_phone').notNull(),
    shippingEmail: text('shipping_email').notNull(),
    shippingAddressLine1: text('shipping_address_line1').notNull(),
    shippingAddressLine2: text('shipping_address_line2'),
    shippingCity: text('shipping_city').notNull(),
    shippingState: text('shipping_state').notNull(),
    shippingPincode: text('shipping_pincode').notNull(),
    customerNotes: text('customer_notes'),
    adminNotes: text('admin_notes'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    orderNumIdx: uniqueIndex('orders_number_idx').on(table.orderNumber),
    userIdx: index('orders_user_idx').on(table.userId),
    statusIdx: index('orders_status_idx').on(table.status),
    reservationIdx: index('orders_reservation_idx').on(table.reservationExpiresAt),
    createdIdx: index('orders_created_idx').on(table.createdAt),
  })
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull().references(() => products.id),
    variantId: text('variant_id').notNull().references(() => productVariants.id),
    title: text('title').notNull(),
    colorName: text('color_name').notNull(),
    sku: text('sku').notNull(),
    pricePaise: integer('price_paise').notNull(),
    quantity: integer('quantity').notNull(),
    totalPaise: integer('total_paise').notNull(),
    imageUrl: text('image_url').notNull(),
  },
  (table) => ({
    orderIdx: index('order_items_order_idx').on(table.orderId),
  })
);

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    paymentMethod: text('payment_method').notNull().default('upi_qr'),
    upiIdUsed: text('upi_id_used').notNull(),
    utrReference: text('utr_reference').notNull().unique(), // Unique constraint protects against duplicate submissions
    proofR2Key: text('proof_r2_key'),
    proofImageUrl: text('proof_image_url'),
    amountPaise: integer('amount_paise').notNull(),
    status: text('status', { enum: ['submitted', 'approved', 'rejected'] }).notNull().default('submitted'),
    adminId: text('admin_id').references(() => users.id),
    rejectionReason: text('rejection_reason'),
    verifiedAt: integer('verified_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    orderIdx: index('payments_order_idx').on(table.orderId),
    utrIdx: uniqueIndex('payments_utr_idx').on(table.utrReference),
    statusIdx: index('payments_status_idx').on(table.status),
  })
);

export const shipments = sqliteTable(
  'shipments',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    courierName: text('courier_name').notNull().default('delhivery'),
    awbNumber: text('awb_number').notNull(),
    trackingUrl: text('tracking_url').notNull(),
    status: text('status', {
      enum: ['booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'rto'],
    }).notNull().default('booked'),
    statusUpdatesJson: text('status_updates_json').notNull().default('[]'),
    dispatchedAt: integer('dispatched_at'),
    deliveredAt: integer('delivered_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    orderIdx: index('shipments_order_idx').on(table.orderId),
    awbIdx: index('shipments_awb_idx').on(table.awbNumber),
    statusIdx: index('shipments_status_idx').on(table.status),
  })
);

// --- REVIEWS & VIEWS ---
export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id),
    orderId: text('order_id').notNull().references(() => orders.id),
    rating: integer('rating').notNull(), // 1 to 5
    reviewTitle: text('review_title').notNull(),
    reviewText: text('review_text').notNull(),
    isVerifiedBuyer: integer('is_verified_buyer', { mode: 'boolean' }).notNull().default(true),
    isApproved: integer('is_approved', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    productIdx: index('reviews_product_idx').on(table.productId),
    userOrderProductIdx: uniqueIndex('reviews_user_order_product_idx').on(table.userId, table.orderId, table.productId),
  })
);

export const productViews = sqliteTable(
  'product_views',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    sessionId: text('session_id'),
    ipHash: text('ip_hash'),
    viewedAt: integer('viewed_at').notNull(),
  },
  (table) => ({
    productIdx: index('views_product_idx').on(table.productId),
    viewedIdx: index('views_viewed_idx').on(table.viewedAt),
  })
);

// --- SETTINGS & AUDIT LOGS ---
export const storeSettings = sqliteTable('store_settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  valueJson: text('value_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    detailsJson: text('details_json').default('{}'),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    actionIdx: index('audit_action_idx').on(table.action),
    entityIdx: index('audit_entity_idx').on(table.entityType, table.entityId),
    createdIdx: index('audit_created_idx').on(table.createdAt),
  })
);

// --- OWNER TELEGRAM & IN-APP NOTIFICATIONS ---
export const adminNotifications = sqliteTable(
  'admin_notifications',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    deepLink: text('deep_link').notNull(),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    orderIdx: index('admin_notifications_order_idx').on(table.orderId),
    readIdx: index('admin_notifications_read_idx').on(table.isRead),
  })
);

// --- ATOMIC VISITOR COUNTER & DAILY TRAFFIC ---
export const siteMetrics = sqliteTable('site_metrics', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

export const dailyVisits = sqliteTable('daily_visits', {
  visitDate: text('visit_date').primaryKey(), // IST YYYY-MM-DD
  uniqueVisitors: integer('unique_visitors').notNull().default(0),
  pageViews: integer('page_views').notNull().default(0),
});
