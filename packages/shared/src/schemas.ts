import { z } from 'zod';

export const SendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be digits only'),
  name: z.string().optional(),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number').optional(),
});

export const ShippingAddressSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Valid email is required'),
  addressLine1: z.string().min(5, 'Address line 1 is required'),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
  customerNotes: z.string().max(500).optional().nullable(),
});

export const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      variantId: z.string().min(1),
      quantity: z.number().int().positive().max(10),
    })
  ).min(1, 'At least one item is required'),
  couponCode: z.string().optional().nullable(),
  shipping: ShippingAddressSchema,
});

export const SubmitUpiPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  utrReference: z
    .string()
    .trim()
    .length(12, 'UTR must be a 12-character/digit bank transaction reference')
    .regex(/^[A-Za-z0-9]{12}$/, 'UTR must consist of 12 alphanumeric characters'),
  proofR2Key: z.string().optional().nullable(),
});

export const VerifyPaymentActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional().nullable(),
});

export const DelhiveryAwbSchema = z
  .object({
    courierName: z.string().default('Delhivery'),
    awbNumber: z.string().trim().optional().default(''),
    trackingUrl: z.string().trim().url('Please enter a valid tracking URL').optional().or(z.literal('')),
    status: z.enum(['booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'rto']).default('booked'),
    location: z.string().optional(),
    remarks: z.string().optional(),
  })
  .refine((data) => (data.awbNumber && data.awbNumber.length >= 4) || (data.trackingUrl && data.trackingUrl.length > 0), {
    message: 'Please provide either a Delhivery AWB number or a Tracking Link',
  });

export const CreateReviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  reviewTitle: z.string().min(3).max(100),
  reviewText: z.string().min(10).max(1000),
});

export const ThemeSettingsUpdateSchema = z.object({
  activePreset: z.enum(['anu-signature', 'royal-crimson', 'festive-gold', 'monochrome-rose']),
  colors: z.object({
    bgCanvas: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    surfaceCard: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    brandPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    brandAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    brandSecondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    inkPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    inkMuted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  fonts: z.object({
    heading: z.enum(['Playfair Display', 'Lora', 'Cormorant Garamond', 'Cinzel', 'Prata']),
    body: z.enum(['Inter', 'DM Sans', 'Plus Jakarta Sans', 'Outfit']),
  }),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']),
  heroStyle: z.enum(['editorial', 'minimal', 'festive']),
  showVisitorCounter: z.boolean().optional().default(true),
});

export const RecordVisitSchema = z.object({
  isUniqueToday: z.boolean().optional().default(false),
});

export const CouponCreateUpdateSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  discountType: z.enum(['flat', 'percentage']),
  discountValue: z.number().int().positive(),
  minOrderPaise: z.number().int().min(0).default(0),
  maxDiscountPaise: z.number().int().positive().optional().nullable(),
  usageLimitTotal: z.number().int().positive().optional().nullable(),
  usageLimitPerUser: z.number().int().positive().optional().nullable(),
  validFrom: z.number().int().positive(),
  validUntil: z.number().int().positive(),
  isActive: z.boolean().default(true),
  appliesTo: z.enum(['all', 'categories', 'products']).default('all'),
});

export const ProductVariantInputSchema = z.object({
  id: z.string().optional(),
  colorName: z.string().min(1),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  sku: z.string().min(3),
  stockQty: z.number().int().min(0),
  pricePaise: z.number().int().positive(),
  mrpPaise: z.number().int().positive(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const ProductCreateUpdateSchema = z.object({
  categoryId: z.string().optional().nullable(),
  title: z.string().min(3),
  slug: z.string().min(3),
  subtitle: z.string().optional().nullable(),
  description: z.string().min(10),
  specifications: z.record(z.string()).default({}),
  careInstructions: z.string().optional().nullable(),
  blouseDetails: z.string().optional().nullable(),
  weaveType: z.string().optional().nullable(),
  occasion: z.string().optional().nullable(),
  fabric: z.string().optional().nullable(),
  instagramUrl: z.string().trim().url('Enter a valid Instagram URL').optional().nullable().or(z.literal('')),
  displayOrder: z.number().int().default(0),
  isPinned: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isOutOfStock: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  variants: z.array(ProductVariantInputSchema).min(1, 'At least one variant is required'),
  images: z.array(
    z.object({
      id: z.string().optional(),
      imageUrl: z.string().min(1),
      r2Key: z.string().optional().nullable(),
      altText: z.string().optional().nullable(),
      displayOrder: z.number().int().default(0),
      isPrimary: z.boolean().default(false),
    })
  ).default([]),
});
