import {
  ThemeTokens,
  UserDTO,
  ProductDTO,
  CategoryDTO,
  OrderDTO,
  AnalyticsSummaryDTO,
} from '@anuvarnika/shared';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any).error || (data as any).message || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Theme
  getTheme: () => fetchJson<{ theme: ThemeTokens; presets: Record<string, ThemeTokens> }>('/api/theme'),
  updateTheme: (theme: ThemeTokens) =>
    fetchJson<{ success: boolean; theme: ThemeTokens }>('/api/theme', {
      method: 'PUT',
      body: JSON.stringify(theme),
    }),

  // Auth
  sendOtp: (email: string, name?: string) =>
    fetchJson<{ success: boolean; message: string; devOtp?: string }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    }),
  verifyOtp: (email: string, otp: string, name?: string) =>
    fetchJson<{ success: boolean; user: UserDTO }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, name }),
    }),
  logout: () => fetchJson<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  getMe: () => fetchJson<{ user: UserDTO | null }>('/api/auth/me'),

  // Catalog
  getCategories: () => fetchJson<{ categories: CategoryDTO[] }>('/api/categories'),
  getProducts: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson<{ products: ProductDTO[]; count: number }>(`/api/products${query ? `?${query}` : ''}`);
  },
  getProductBySlug: (slug: string) => fetchJson<{ product: ProductDTO }>(`/api/products/${slug}`),
  recordProductView: (productId: string) =>
    fetchJson<{ success: boolean }>(`/api/products/${productId}/view`, { method: 'POST' }),

  // Checkout & Shipping
  validateCoupon: (code: string, subtotalPaise: number) =>
    fetchJson<{
      valid: boolean;
      coupon: { id: string; code: string; discountType: string; discountValue: number };
      discountPaise: number;
      finalTotalPaise: number;
      message: string;
    }>(`/api/coupons/validate?code=${encodeURIComponent(code)}&subtotalPaise=${subtotalPaise}`),

  checkPincode: (pincode: string) =>
    fetchJson<{
      serviceable: boolean;
      state?: string;
      shippingChargePaise?: number;
      freeShippingThresholdPaise?: number;
      estimatedDays?: string;
      message: string;
    }>(`/api/shipping/check-pin?pincode=${encodeURIComponent(pincode)}`),

  // Orders
  createOrder: (payload: any) =>
    fetchJson<{
      success: boolean;
      orderId: string;
      orderNumber: string;
      totalPaise: number;
      reservationExpiresAt: number;
      upiId: string;
    }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOrder: (orderNumber: string) => fetchJson<{ order: OrderDTO & { upiId?: string } }>(`/api/orders/${orderNumber}`),
  getMyOrders: () => fetchJson<{ orders: OrderDTO[] }>('/api/orders/my'),

  submitUpiPayment: (orderId: string, utrReference: string, proofR2Key?: string) =>
    fetchJson<{ success: boolean; message: string; orderStatus: string }>(`/api/orders/${orderId}/payment-proof`, {
      method: 'POST',
      body: JSON.stringify({ utrReference, proofR2Key }),
    }),

  submitReview: (orderId: string, payload: { productId: string; rating: number; reviewTitle: string; reviewText: string }) =>
    fetchJson<{ success: boolean; message: string; reviewId: string }>(`/api/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin
  getAdminOrders: (status?: string) =>
    fetchJson<{ orders: OrderDTO[]; delhiveryPersonal?: boolean }>(`/api/admin/orders${status ? `?status=${status}` : ''}`),
  verifyPayment: (paymentId: string, action: 'approve' | 'reject', rejectionReason?: string) =>
    fetchJson<{ success: boolean; message: string; status: string }>(`/api/admin/payments/${paymentId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action, rejectionReason }),
    }),
  updateShipment: (orderId: string, payload: any) =>
    fetchJson<{ success: boolean; message: string; shipment: any; orderStatus: string }>(
      `/api/admin/orders/${orderId}/shipment`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  getAdminProducts: () => fetchJson<{ products: any[] }>('/api/admin/products'),
  createAdminProduct: (payload: any) =>
    fetchJson<{ success: boolean; productId: string; message: string }>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminProduct: (id: string, payload: any) =>
    fetchJson<{ success: boolean; message: string }>(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteAdminProduct: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/admin/products/${id}`, {
      method: 'DELETE',
    }),
  syncDelhiveryTracking: (orderId: string) =>
    fetchJson<{ synced: boolean; status: string; message: string }>(`/api/admin/orders/${orderId}/sync-delhivery`, {
      method: 'POST',
    }),
  getAdminCoupons: () => fetchJson<{ coupons: any[] }>('/api/admin/coupons'),
  createAdminCoupon: (payload: any) =>
    fetchJson<{ success: boolean; couponId: string; message: string }>('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminCoupon: (id: string, payload: any) =>
    fetchJson<{ success: boolean; message: string }>(`/api/admin/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteAdminCoupon: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/admin/coupons/${id}`, {
      method: 'DELETE',
    }),
  getAdminSettings: () => fetchJson<{ settings: any }>('/api/admin/settings'),
  updateAdminSettings: (payload: any) =>
    fetchJson<{ success: boolean; settings: any }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getAdminReviews: () => fetchJson<{ reviews: any[] }>('/api/admin/reviews'),
  moderateReview: (id: string, isApproved: boolean) =>
    fetchJson<{ success: boolean }>(`/api/admin/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isApproved }),
    }),
  getAdminAnalytics: () => fetchJson<{ analytics: AnalyticsSummaryDTO }>('/api/admin/analytics'),
  getAdminTrafficAnalytics: () =>
    fetchJson<{
      totalVisitors: number;
      todayDate: string;
      todayUnique: number;
      todayPageViews: number;
      last30Days: Array<{ visitDate: string; uniqueVisitors: number; pageViews: number }>;
    }>('/api/admin/analytics/traffic'),
  getAdminNotifications: () =>
    fetchJson<{ pendingApprovalsCount: number; pendingPayments: any[]; notifications?: any[] }>('/api/admin/notifications'),

  // Visitor Counter
  recordVisit: (isUniqueToday: boolean) =>
    fetchJson<{ counted: boolean; totalVisitors: number; visitDate?: string }>('/api/metrics/visit', {
      method: 'POST',
      body: JSON.stringify({ isUniqueToday }),
    }),
  getVisitorCount: () => fetchJson<{ totalVisitors: number }>('/api/metrics/visitors'),

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data as { success: boolean; key: string; url: string };
  },
};
