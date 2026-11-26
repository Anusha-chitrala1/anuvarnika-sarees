import { Hono } from 'hono';
import { eq, and, sql, desc, asc, like, or } from 'drizzle-orm';
import { AppContext } from '../types.js';
import { getDb } from '../db.js';
import * as schema from '@anuvarnika/db';
import { sha256 } from '../services/auth.js';

export const catalogRouter = new Hono<AppContext>();

// Get Categories
catalogRouter.get('/categories', async (c) => {
  const db = getDb(c.env);
  const list = await db.query.categories.findMany({
    where: eq(schema.categories.isActive, true),
    orderBy: [asc(schema.categories.displayOrder)],
  });
  return c.json({ categories: list });
});

// Search & Filter Products
catalogRouter.get('/products', async (c) => {
  const db = getDb(c.env);
  const query = c.req.query();

  const categorySlug = query.category;
  const fabric = query.fabric;
  const occasion = query.occasion;
  const color = query.color;
  const minPrice = query.minPrice ? parseInt(query.minPrice, 10) : undefined;
  const maxPrice = query.maxPrice ? parseInt(query.maxPrice, 10) : undefined;
  const inStockOnly = query.inStock === 'true';
  const sort = query.sort || 'priority'; // priority, price_asc, price_desc, newest, popular
  const search = query.search?.trim();

  // Find category ID if slug provided
  let categoryId: string | undefined = undefined;
  if (categorySlug) {
    const cat = await db.query.categories.findFirst({
      where: eq(schema.categories.slug, categorySlug),
    });
    if (cat) {
      categoryId = cat.id;
    }
  }

  // Base conditions
  const conditions = [eq(schema.products.status, 'published')];

  if (categoryId) {
    conditions.push(eq(schema.products.categoryId, categoryId));
  }
  if (fabric) {
    conditions.push(eq(schema.products.fabric, fabric));
  }
  if (occasion) {
    conditions.push(eq(schema.products.occasion, occasion));
  }
  if (inStockOnly) {
    conditions.push(eq(schema.products.isOutOfStock, false));
  }
  if (minPrice !== undefined) {
    conditions.push(sql`${schema.products.basePricePaise} >= ${minPrice}`);
  }
  if (maxPrice !== undefined) {
    conditions.push(sql`${schema.products.basePricePaise} <= ${maxPrice}`);
  }
  if (search) {
    conditions.push(
      or(
        like(schema.products.title, `%${search}%`),
        like(schema.products.description, `%${search}%`),
        like(schema.products.fabric, `%${search}%`)
      )!
    );
  }

  // Sorting
  let orderByClause = [desc(schema.products.isPinned), asc(schema.products.displayOrder), desc(schema.products.createdAt)];
  if (sort === 'price_asc') {
    orderByClause = [asc(schema.products.basePricePaise)];
  } else if (sort === 'price_desc') {
    orderByClause = [desc(schema.products.basePricePaise)];
  } else if (sort === 'newest') {
    orderByClause = [desc(schema.products.createdAt)];
  } else if (sort === 'popular') {
    orderByClause = [desc(schema.products.viewsCount)];
  }

  const productList = await db.query.products.findMany({
    where: and(...conditions),
    orderBy: orderByClause,
    with: {
      // We will attach images and variants
    },
  });

  // Attach images and variants
  const enriched = await Promise.all(
    productList.map(async (prod) => {
      const [images, variants, reviews] = await Promise.all([
        db.query.productImages.findMany({
          where: eq(schema.productImages.productId, prod.id),
          orderBy: [asc(schema.productImages.displayOrder)],
        }),
        db.query.productVariants.findMany({
          where: and(eq(schema.productVariants.productId, prod.id), eq(schema.productVariants.isActive, true)),
        }),
        db.query.reviews.findMany({
          where: and(eq(schema.reviews.productId, prod.id), eq(schema.reviews.isApproved, true)),
        }),
      ]);

      // Filter by color if requested
      if (color && !variants.some((v) => v.colorName.toLowerCase().includes(color.toLowerCase()))) {
        return null;
      }

      const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
      const ratingAverage = reviews.length > 0 ? Number((ratingSum / reviews.length).toFixed(1)) : 5.0;

      let specifications = {};
      try {
        specifications = JSON.parse(prod.specificationsJson);
      } catch (e) {}

      return {
        ...prod,
        specifications,
        images,
        variants: variants.map((v) => ({
          ...v,
          availableStock: Math.max(0, v.stockQty - v.reservedStock),
        })),
        ratingAverage,
        ratingCount: reviews.length,
      };
    })
  );

  const results = enriched.filter(Boolean);
  return c.json({ products: results, count: results.length });
});

// Get Single Product by Slug
catalogRouter.get('/products/:slug', async (c) => {
  const db = getDb(c.env);
  const slug = c.req.param('slug');

  const product = await db.query.products.findFirst({
    where: eq(schema.products.slug, slug),
  });

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const [category, images, variants, reviews] = await Promise.all([
    db.query.categories.findFirst({
      where: eq(schema.categories.id, product.categoryId),
    }),
    db.query.productImages.findMany({
      where: eq(schema.productImages.productId, product.id),
      orderBy: [asc(schema.productImages.displayOrder)],
    }),
    db.query.productVariants.findMany({
      where: and(eq(schema.productVariants.productId, product.id), eq(schema.productVariants.isActive, true)),
    }),
    db.query.reviews.findMany({
      where: and(eq(schema.reviews.productId, product.id), eq(schema.reviews.isApproved, true)),
      orderBy: [desc(schema.reviews.createdAt)],
    }),
  ]);

  let specifications = {};
  try {
    specifications = JSON.parse(product.specificationsJson);
  } catch (e) {}

  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const ratingAverage = reviews.length > 0 ? Number((ratingSum / reviews.length).toFixed(1)) : 5.0;

  return c.json({
    product: {
      ...product,
      categoryName: category?.name,
      categorySlug: category?.slug,
      specifications,
      images,
      variants: variants.map((v) => ({
        ...v,
        availableStock: Math.max(0, v.stockQty - v.reservedStock),
      })),
      ratingAverage,
      ratingCount: reviews.length,
      reviews,
    },
  });
});

// Increment Product View Count
catalogRouter.post('/products/:id/view', async (c) => {
  const db = getDb(c.env);
  const productId = c.req.param('id');
  const now = Date.now();
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const ipHash = await sha256(ip);

  // Check if viewed within last 1 hour by same IP to prevent view spam
  const recent = await db.query.productViews.findFirst({
    where: and(
      eq(schema.productViews.productId, productId),
      eq(schema.productViews.ipHash, ipHash),
      sql`${schema.productViews.viewedAt} > ${now - 3600 * 1000}`
    ),
  });

  if (!recent) {
    await Promise.all([
      db.run(
        sql`UPDATE products SET views_count = views_count + 1 WHERE id = ${productId}`
      ),
      db.insert(schema.productViews).values({
        id: `vw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId,
        sessionId: c.get('sessionId') || null,
        ipHash,
        viewedAt: now,
      }),
    ]);
  }

  return c.json({ success: true });
});

// Validate Coupon
catalogRouter.get('/coupons/validate', async (c) => {
  const code = c.req.query('code')?.trim().toUpperCase();
  const subtotalPaise = parseInt(c.req.query('subtotalPaise') || '0', 10);

  if (!code) {
    return c.json({ error: 'Coupon code is required' }, 400);
  }

  const db = getDb(c.env);
  const now = Date.now();

  const coupon = await db.query.coupons.findFirst({
    where: eq(schema.coupons.code, code),
  });

  if (!coupon || !coupon.isActive) {
    return c.json({ valid: false, message: 'Invalid or inactive coupon code' }, 400);
  }

  if (now < coupon.validFrom || now > coupon.validUntil) {
    return c.json({ valid: false, message: 'This coupon code has expired' }, 400);
  }

  if (coupon.usageLimitTotal && coupon.usageCount >= coupon.usageLimitTotal) {
    return c.json({ valid: false, message: 'This coupon has reached its maximum redemption limit' }, 400);
  }

  if (subtotalPaise < coupon.minOrderPaise) {
    const minRupees = Math.round(coupon.minOrderPaise / 100);
    return c.json({
      valid: false,
      message: `Coupon requires a minimum order value of ₹${minRupees.toLocaleString('en-IN')}`,
    }, 400);
  }

  // Calculate discount
  let discountPaise = 0;
  if (coupon.discountType === 'flat') {
    discountPaise = coupon.discountValue;
  } else {
    // Percentage
    discountPaise = Math.round((subtotalPaise * coupon.discountValue) / 100);
    if (coupon.maxDiscountPaise && discountPaise > coupon.maxDiscountPaise) {
      discountPaise = coupon.maxDiscountPaise;
    }
  }

  // Discount cannot exceed subtotal
  discountPaise = Math.min(discountPaise, subtotalPaise);

  return c.json({
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discountPaise,
    finalTotalPaise: Math.max(0, subtotalPaise - discountPaise),
    message: `Coupon ${coupon.code} applied successfully!`,
  });
});

// Check PIN code serviceability
catalogRouter.get('/shipping/check-pin', async (c) => {
  const pin = c.req.query('pincode')?.trim();
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return c.json({ error: 'Enter a valid 6-digit Indian PIN code' }, 400);
  }

  const db = getDb(c.env);
  const prefix2 = pin.substring(0, 2);

  // Check exact pin first, then 2-digit prefix, then national fallback
  const zones = await db.query.shippingZones.findMany({
    where: eq(schema.shippingZones.isServiceable, true),
  });

  const matched =
    zones.find((z) => z.pinCodeExact === pin) ||
    zones.find((z) => z.pinCodePrefix === prefix2) ||
    zones.find((z) => !z.pinCodePrefix && !z.pinCodeExact);

  if (!matched) {
    return c.json({
      serviceable: false,
      message: `Delivery to PIN ${pin} is not available yet. Currently we deliver exclusively across Andhra Pradesh & Telangana (PIN codes starting with 50–53).`,
    });
  }

  return c.json({
    serviceable: true,
    state: matched.state,
    shippingChargePaise: matched.shippingChargePaise,
    freeShippingThresholdPaise: matched.freeShippingThresholdPaise,
    estimatedDays: matched.estimatedDays,
    message: `Delivery is available for PIN ${pin} (${matched.state}).`,
  });
});
