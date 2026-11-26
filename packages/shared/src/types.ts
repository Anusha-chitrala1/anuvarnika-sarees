import { ThemeTokens } from './theme.js';

export type UserRole = 'customer' | 'admin';

export type OrderStatus =
  | 'pending_payment'
  | 'payment_submitted'
  | 'payment_verified'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'rejected'
  | 'payment_failed';

export type PaymentStatus = 'submitted' | 'approved' | 'rejected';

export type ShipmentStatus =
  | 'booked'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'rto';

export type InventoryTransactionType =
  | 'reservation'
  | 'release'
  | 'sale'
  | 'manual_adjustment'
  | 'cancellation'
  | 'return';

export type CouponDiscountType = 'flat' | 'percentage';

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductVariantDTO {
  id: string;
  productId: string;
  colorName: string;
  colorHex: string;
  sku: string;
  stockQty: number;
  reservedStock: number;
  availableStock: number;
  pricePaise: number;
  mrpPaise: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface ProductImageDTO {
  id: string;
  productId: string;
  variantId: string | null;
  imageUrl: string;
  r2Key: string | null;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductDTO {
  id: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  specifications: Record<string, string>;
  careInstructions: string | null;
  blouseDetails: string | null;
  weaveType: string | null;
  occasion: string | null;
  fabric: string | null;
  instagramUrl?: string | null;
  baseMrpPaise: number;
  basePricePaise: number;
  displayOrder: number;
  isPinned: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOutOfStock: boolean;
  status: 'draft' | 'published' | 'archived';
  viewsCount: number;
  images: ProductImageDTO[];
  variants: ProductVariantDTO[];
  ratingAverage?: number;
  ratingCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CouponDTO {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number; // paise for flat, percentage 1-100 for percentage
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  validFrom: number;
  validUntil: number;
  isActive: boolean;
  appliesTo: 'all' | 'categories' | 'products';
  conditions?: Record<string, any>;
}

export interface ShippingZoneDTO {
  id: string;
  state: string;
  pinCodePrefix: string | null;
  pinCodeExact: string | null;
  isServiceable: boolean;
  shippingChargePaise: number;
  freeShippingThresholdPaise: number;
  estimatedDays: string;
}

export interface OrderItemDTO {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  title: string;
  colorName: string;
  sku: string;
  pricePaise: number;
  quantity: number;
  totalPaise: number;
  imageUrl: string;
}

export interface PaymentDTO {
  id: string;
  orderId: string;
  paymentMethod: 'upi_qr';
  upiIdUsed: string;
  utrReference: string;
  proofR2Key: string | null;
  proofImageUrl: string | null;
  amountPaise: number;
  status: PaymentStatus;
  adminId: string | null;
  rejectionReason: string | null;
  verifiedAt: number | null;
  createdAt: number;
}

export interface ShipmentDTO {
  id: string;
  orderId: string;
  courierName: string;
  awbNumber: string;
  trackingUrl: string;
  status: ShipmentStatus;
  statusUpdates: Array<{
    status: ShipmentStatus;
    timestamp: number;
    location?: string;
    remarks?: string;
  }>;
  dispatchedAt: number | null;
  deliveredAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  subtotalPaise: number;
  discountPaise: number;
  shippingFeePaise: number;
  totalPaise: number;
  couponId: string | null;
  reservationExpiresAt: number | null;
  shippingName: string;
  shippingPhone: string;
  shippingEmail: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  customerNotes: string | null;
  adminNotes: string | null;
  items: OrderItemDTO[];
  payment?: PaymentDTO | null;
  shipment?: ShipmentDTO | null;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewDTO {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  orderId: string;
  rating: number; // 1-5
  reviewTitle: string;
  reviewText: string;
  isVerifiedBuyer: boolean;
  isApproved: boolean;
  createdAt: number;
}

export interface CartItemDTO {
  id: string;
  variantId: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string;
  };
  variant: {
    id: string;
    colorName: string;
    colorHex: string;
    pricePaise: number;
    mrpPaise: number;
    stockQty: number;
    reservedStock: number;
    availableStock: number;
  };
}

export interface AnalyticsSummaryDTO {
  totalRevenuePaise: number;
  totalOrders: number;
  pendingApprovalsCount: number;
  totalDiscountPaise: number;
  lowStockCount: number;
  outOfStockCount: number;
  mostViewed: Array<{ id: string; title: string; slug: string; viewsCount: number; imageUrl: string }>;
  mostOrdered: Array<{ id: string; title: string; orderCount: number; totalSoldPaise: number }>;
  recentOrders: OrderDTO[];
  dailyRevenue: Array<{ date: string; revenuePaise: number; ordersCount: number }>;
}
