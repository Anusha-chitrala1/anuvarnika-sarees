import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  ShieldCheck,
  Check,
  Sliders,
  Pin,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Upload,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  Star,
  Settings,
  BarChart3,
  CreditCard,
  Truck,
  Package,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AnalyticsSummaryDTO,
  OrderDTO,
  ProductDTO,
  formatRupees,
} from '@anuvarnika/shared';
import { api } from '../lib/api.js';
import { useThemeStore } from '../store/useThemeStore.js';

interface AdminDashboardViewProps {
  onSelectProduct?: (product: ProductDTO) => void;
  onCatalogChanged?: () => void;
  deepLinkOrderId?: string;
  deepLinkAction?: string;
}

type AdminTab =
  | 'analytics'
  | 'payments'
  | 'shipments'
  | 'catalog'
  | 'saree-editor'
  | 'coupons'
  | 'settings';

const emptySareeForm = () => ({
  id: '' as string,
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  fabric: '',
  weaveType: '',
  occasion: '',
  blouseDetails: '',
  careInstructions: '',
  instagramUrl: '',
  displayOrder: 0,
  isPinned: false,
  isFeatured: true,
  isNewArrival: true,
  isOutOfStock: false,
  status: 'published' as 'published' | 'draft' | 'archived',
  imageUrl: '',
  r2Key: '',
  variants: [
    {
      id: '',
      colorName: 'Royal Crimson',
      colorHex: '#7A231E',
      sku: `AVS-${Math.floor(1000 + Math.random() * 9000)}`,
      stockQty: 5,
      priceInr: 4999,
      mrpInr: 6499,
      isDefault: true,
      isActive: true,
    },
  ],
});

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onSelectProduct,
  onCatalogChanged,
  deepLinkOrderId,
  deepLinkAction,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(
    deepLinkOrderId ? 'payments' : 'analytics',
  );
  const [analytics, setAnalytics] = useState<AnalyticsSummaryDTO | null>(null);
  const [trafficAnalytics, setTrafficAnalytics] = useState<{
    totalVisitors: number;
    todayDate: string;
    todayUnique: number;
    todayPageViews: number;
    last30Days: Array<{ visitDate: string; uniqueVisitors: number; pageViews: number }>;
  } | null>(null);
  const [copiedUtrOrderId, setCopiedUtrOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>({
    upiId: 'anuvarnika@okaxis',
    payeeName: 'AnuVarnika Sarees',
    announcementText: '',
    freeShippingThresholdPaise: 299900,
    defaultShippingChargePaise: 15000,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Verification modal state
  const [rejectModalOrder, setRejectModalOrder] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Shipment update state
  const [delhiveryPersonal, setDelhiveryPersonal] = useState(true);
  const [shipmentModalOrder, setShipmentModalOrder] = useState<any | null>(null);
  const [shipmentForm, setShipmentForm] = useState({
    awbNumber: '',
    trackingUrl: '',
    courierName: 'Delhivery',
    status: 'booked' as
      | 'booked'
      | 'picked_up'
      | 'in_transit'
      | 'out_for_delivery'
      | 'delivered'
      | 'rto',
    location: '',
    remarks: '',
  });
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

  // Saree Add/Edit Page state
  const [sareeForm, setSareeForm] = useState(emptySareeForm());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingSaree, setSavingSaree] = useState(false);

  // Coupon Create modal state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'flat',
    discountValue: 10,
    minOrderInr: 1000,
    maxDiscountInr: 1500,
    usageLimitTotal: 100,
    isActive: true,
  });

  const [settingsSaved, setSettingsSaved] = useState(false);
  const { toggleCustomizer } = useThemeStore();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [
        analyticsData,
        trafficData,
        ordersData,
        productsData,
        couponsData,
        settingsData,
        reviewsData,
      ] = await Promise.all([
        api.getAdminAnalytics(),
        api.getAdminTrafficAnalytics().catch(() => null),
        api.getAdminOrders(),
        api.getAdminProducts(),
        api.getAdminCoupons(),
        api.getAdminSettings().catch(() => ({ settings: {} })),
        api.getAdminReviews().catch(() => ({ reviews: [] })),
      ]);

      setAnalytics(analyticsData.analytics);
      setTrafficAnalytics(trafficData);
      setOrders(ordersData.orders);
      if (ordersData.delhiveryPersonal !== undefined) {
        setDelhiveryPersonal(ordersData.delhiveryPersonal);
      }
      setCatalogProducts(productsData.products);
      setCoupons(couponsData.coupons);
      if (settingsData.settings && Object.keys(settingsData.settings).length > 0) {
        setStoreSettings((prev: any) => ({ ...prev, ...settingsData.settings }));
      }
      setReviews(reviewsData.reviews || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!deepLinkOrderId) return;
    setActiveTab('payments');
  }, [deepLinkOrderId, deepLinkAction]);

  useEffect(() => {
    if (!deepLinkOrderId || isLoading || activeTab !== 'payments') return;
    const el = document.getElementById(`verify-order-${deepLinkOrderId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [deepLinkOrderId, isLoading, activeTab, orders]);

  const handleCopyUtr = (orderId: string, utr: string) => {
    navigator.clipboard?.writeText(utr).catch(() => {});
    setCopiedUtrOrderId(orderId);
    setTimeout(() => setCopiedUtrOrderId(null), 2000);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const notifs = await api.getAdminNotifications();
        if (analytics && notifs.pendingApprovalsCount !== analytics.pendingApprovalsCount) {
          loadData();
        }
      } catch (e) {}
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleApprovePayment = async (paymentId: string) => {
    if (
      !confirm(
        'Confirm receipt of bank credit and approve this order? This will deduct real stock and notify the customer.'
      )
    ) {
      return;
    }
    try {
      await api.verifyPayment(paymentId, 'approve');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Approval failed');
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectModalOrder) return;
    try {
      await api.verifyPayment(rejectModalOrder.payment.id, 'reject', rejectionReason);
      setRejectModalOrder(null);
      setRejectionReason('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Rejection failed');
    }
  };

  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentModalOrder) return;
    try {
      await api.updateShipment(shipmentModalOrder.id, shipmentForm);
      setShipmentModalOrder(null);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Shipment update failed');
    }
  };

  const handleSyncDelhivery = async (orderId: string) => {
    try {
      setSyncingOrderId(orderId);
      const res = await api.syncDelhiveryTracking(orderId);
      alert(res.message);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Sync failed');
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleTogglePriority = async (productId: string, isPinned: boolean) => {
    try {
      await api.updateAdminProduct(productId, { isPinned: !isPinned });
      loadData();
      onCatalogChanged?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleOutOfStock = async (productId: string, isOutOfStock: boolean) => {
    try {
      await api.updateAdminProduct(productId, { isOutOfStock: !isOutOfStock });
      loadData();
      onCatalogChanged?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleArchiveProduct = async (productId: string, title: string) => {
    if (!confirm(`Archive "${title}" from the storefront?`)) return;
    try {
      await api.deleteAdminProduct(productId);
      loadData();
      onCatalogChanged?.();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openAddSareePage = () => {
    setSareeForm(emptySareeForm());
    setActiveTab('saree-editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditSareePage = (p: any) => {
    setSareeForm({
      id: p.id,
      title: p.title || '',
      slug: p.slug || '',
      subtitle: p.subtitle || '',
      description: p.description || '',
      fabric: p.fabric || '',
      weaveType: p.weaveType || '',
      occasion: p.occasion || '',
      blouseDetails: p.blouseDetails || '',
      careInstructions: p.careInstructions || '',
      instagramUrl: p.instagramUrl || '',
      displayOrder: p.displayOrder || 0,
      isPinned: Boolean(p.isPinned),
      isFeatured: Boolean(p.isFeatured),
      isNewArrival: Boolean(p.isNewArrival),
      isOutOfStock: Boolean(p.isOutOfStock),
      status: p.status || 'published',
      imageUrl: p.images?.[0]?.imageUrl || '',
      r2Key: p.images?.[0]?.r2Key || '',
      variants:
        Array.isArray(p.variants) && p.variants.length > 0
          ? p.variants
              .filter((v: any) => v.isActive !== false)
              .map((v: any) => ({
                id: v.id,
                colorName: v.colorName,
                colorHex: v.colorHex,
                sku: v.sku,
                stockQty: v.stockQty,
                priceInr: Math.round(v.pricePaise / 100),
                mrpInr: Math.round(v.mrpPaise / 100),
                isDefault: Boolean(v.isDefault),
                isActive: true,
              }))
          : emptySareeForm().variants,
    });
    setActiveTab('saree-editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteVariant = (idx: number) => {
    if (sareeForm.variants.length <= 1) {
      alert('At least one color variant is required for a saree.');
      return;
    }
    setSareeForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const res = await api.uploadFile(file);
      setSareeForm((prev) => ({ ...prev, imageUrl: res.url, r2Key: res.key }));
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveSaree = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSaree(true);
      const slug =
        sareeForm.slug.trim() ||
        sareeForm.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
          '-' +
          Math.floor(100 + Math.random() * 900);

      const payload = {
        title: sareeForm.title.trim(),
        slug,
        subtitle: sareeForm.subtitle.trim() || null,
        description: sareeForm.description.trim(),
        fabric: sareeForm.fabric.trim() || null,
        weaveType: sareeForm.weaveType.trim() || null,
        occasion: sareeForm.occasion.trim() || null,
        blouseDetails: sareeForm.blouseDetails.trim() || null,
        careInstructions: sareeForm.careInstructions.trim() || null,
        instagramUrl: sareeForm.instagramUrl.trim() || null,
        displayOrder: Number(sareeForm.displayOrder) || 0,
        isPinned: sareeForm.isPinned,
        isFeatured: sareeForm.isFeatured,
        isNewArrival: sareeForm.isNewArrival,
        isOutOfStock: sareeForm.isOutOfStock,
        status: sareeForm.status,
        variants: sareeForm.variants.map((v, i) => ({
          ...(v.id ? { id: v.id } : {}),
          colorName: v.colorName.trim() || 'Classic',
          colorHex: /^#[0-9A-Fa-f]{6}$/.test(v.colorHex) ? v.colorHex : '#7A231E',
          sku: v.sku.trim() || `AVS-${Date.now()}-${i}`,
          stockQty: Math.max(0, Number(v.stockQty) || 0),
          pricePaise: Math.max(100, Math.round(Number(v.priceInr) * 100)),
          mrpPaise: Math.max(100, Math.round(Number(v.mrpInr) * 100)),
          isDefault: i === 0,
          isActive: true,
        })),
        images: sareeForm.imageUrl.trim()
          ? [
              {
                imageUrl: sareeForm.imageUrl.trim(),
                r2Key: sareeForm.r2Key || null,
                altText: sareeForm.title.trim(),
                displayOrder: 0,
                isPrimary: true,
              },
            ]
          : [],
      };

      if (sareeForm.id) {
        await api.updateAdminProduct(sareeForm.id, payload);
      } else {
        await api.createAdminProduct(payload);
      }

      await loadData();
      onCatalogChanged?.();
      setActiveTab('catalog');
    } catch (err: any) {
      alert(err.message || 'Failed to save saree');
    } finally {
      setSavingSaree(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      const oneYearLater = now + 365 * 86400 * 1000;
      await api.createAdminCoupon({
        code: couponForm.code.trim().toUpperCase(),
        discountType: couponForm.discountType,
        discountValue:
          couponForm.discountType === 'percentage'
            ? Number(couponForm.discountValue)
            : Math.round(Number(couponForm.discountValue) * 100),
        minOrderPaise: Math.round(Number(couponForm.minOrderInr) * 100),
        maxDiscountPaise:
          couponForm.discountType === 'percentage' && couponForm.maxDiscountInr > 0
            ? Math.round(Number(couponForm.maxDiscountInr) * 100)
            : null,
        usageLimitTotal: couponForm.usageLimitTotal ? Number(couponForm.usageLimitTotal) : null,
        validFrom: now - 60000,
        validUntil: oneYearLater,
        isActive: couponForm.isActive,
        appliesTo: 'all',
      });
      setIsCouponModalOpen(false);
      setCouponForm({
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        minOrderInr: 1000,
        maxDiscountInr: 1500,
        usageLimitTotal: 100,
        isActive: true,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon');
    }
  };

  const handleToggleCoupon = async (coupon: any) => {
    try {
      await api.updateAdminCoupon(coupon.id, { isActive: !coupon.isActive });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    try {
      await api.deleteAdminCoupon(couponId);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings(storeSettings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    }
  };

  const handleProductClickFromAnalytics = (productId: string) => {
    if (!onSelectProduct) return;
    const match = catalogProducts.find((p) => p.id === productId);
    if (match) {
      onSelectProduct(match);
    }
  };

  const pendingPayments = orders.filter((o) => o.status === 'payment_submitted');
  const lowStockProducts = catalogProducts.filter(
    (p) => p.availableStock <= 3 && p.status !== 'archived'
  );

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { id: 'analytics', label: 'Analytics & Trends', icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: 'payments',
      label: 'UPI Approvals',
      icon: <CreditCard className="w-4 h-4" />,
      badge: pendingPayments.length,
    },
    { id: 'shipments', label: 'Delhivery & Orders', icon: <Truck className="w-4 h-4" /> },
    { id: 'catalog', label: 'Saree Catalog', icon: <Package className="w-4 h-4" /> },
    { id: 'saree-editor', label: sareeForm.id ? 'Edit Saree' : 'Add New Saree', icon: <Plus className="w-4 h-4" /> },
    { id: 'coupons', label: 'Coupons & Offers', icon: <Tag className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings & Reviews', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT SIDEBAR (Desktop Sticky + Mobile Scroll Strip) */}
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24 bg-surface border border-accent/25 rounded-2xl p-4 space-y-4 shadow-xs">
          {/* Sidebar Brand Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-accent/20">
            <div className="w-10 h-10 rounded-xl bg-primary text-canvas flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-lg font-bold text-primary leading-tight truncate">
                Admin Hub
              </h1>
              <p className="text-xs text-ink-muted truncate">Store Operations</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 no-scrollbar">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'saree-editor' && activeTab !== 'saree-editor') {
                      openAddSareePage();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`shrink-0 flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary text-canvas shadow-sm font-semibold'
                      : 'text-ink-primary hover:bg-canvas hover:text-primary'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span className="bg-red-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="pt-3 border-t border-accent/20 flex lg:flex-col gap-2">
            <button
              onClick={toggleCustomizer}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-canvas border border-accent/30 text-xs font-semibold text-primary hover:border-primary transition"
            >
              <Sliders className="w-3.5 h-3.5 text-accent" />
              <span>Theme Studio</span>
            </button>
            <button
              onClick={loadData}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-canvas border border-accent/30 text-xs font-semibold text-ink-primary hover:border-primary transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-accent ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </aside>

        {/* MAIN FULL-WIDTH CONTENT AREA */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          {/* TAB 1: ANALYTICS & TRENDS */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">
                  Analytics & Store Trends
                </h2>
                <p className="text-sm text-ink-muted">
                  Real-time revenue, customer interest, and inventory health
                </p>
              </div>

              {/* KPI Summary Cards (High-Contrast + Hover Effects) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <motion.div
                  whileHover={{ y: -3 }}
                  className="p-5 rounded-2xl bg-surface border border-accent/30 border-l-4 border-l-primary shadow-sm space-y-1.5"
                >
                  <span className="text-xs uppercase font-bold text-ink-muted tracking-wider block">
                    Verified Revenue
                  </span>
                  <p className="font-sans text-2xl sm:text-3xl font-bold tabular-nums text-primary">
                    {formatRupees(analytics.totalRevenuePaise)}
                  </p>
                  <p className="text-xs font-medium text-emerald-800">Bank verified & active orders</p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  className="p-5 rounded-2xl bg-surface border border-accent/30 border-l-4 border-l-accent shadow-sm space-y-1.5"
                >
                  <span className="text-xs uppercase font-bold text-ink-muted tracking-wider block">
                    Total Orders
                  </span>
                  <p className="font-sans text-2xl sm:text-3xl font-bold tabular-nums text-ink-primary">
                    {analytics.totalOrders}
                  </p>
                  <p className="text-xs font-medium text-ink-muted">
                    Discounts: {formatRupees(analytics.totalDiscountPaise)}
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  onClick={() => setActiveTab('payments')}
                  className="p-5 rounded-2xl bg-surface border border-accent/30 border-l-4 border-l-primary shadow-sm space-y-1.5 cursor-pointer hover:border-primary transition"
                >
                  <span className="text-xs uppercase font-bold text-ink-muted tracking-wider block">
                    Pending Approvals
                  </span>
                  <p className="font-sans text-2xl sm:text-3xl font-bold tabular-nums text-primary">
                    {analytics.pendingApprovalsCount}
                  </p>
                  <p className="text-xs font-semibold text-primary">Click to review UTRs →</p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  onClick={() => setActiveTab('catalog')}
                  className="p-5 rounded-2xl bg-surface border border-accent/30 border-l-4 border-l-amber-600 shadow-sm space-y-1.5 cursor-pointer hover:border-primary transition"
                >
                  <span className="text-xs uppercase font-bold text-ink-muted tracking-wider block">
                    Inventory Alerts
                  </span>
                  <p className="font-sans text-2xl sm:text-3xl font-bold tabular-nums text-amber-800">
                    {analytics.lowStockCount} Low / {analytics.outOfStockCount} Out
                  </p>
                  <p className="text-xs font-semibold text-amber-900">Click to restock in Catalog →</p>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  className="p-5 rounded-2xl bg-surface border border-accent/30 border-l-4 border-l-accent shadow-sm space-y-1.5"
                >
                  <span className="text-xs uppercase font-bold text-ink-muted tracking-wider block">
                    Store Traffic
                  </span>
                  <p className="font-sans text-2xl sm:text-3xl font-bold tabular-nums text-primary">
                    {new Intl.NumberFormat('en-IN').format(trafficAnalytics?.totalVisitors ?? 0)}
                  </p>
                  <p className="text-xs font-medium text-ink-muted">
                    Today: {trafficAnalytics?.todayUnique ?? 0} unique &bull; {trafficAnalytics?.todayPageViews ?? 0} views
                  </p>
                </motion.div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-accent/25 shadow-xs space-y-4">
                  <h3 className="font-serif text-xl font-semibold text-primary flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    <span>7-Day Revenue Velocity</span>
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EADBCC" />
                        <XAxis dataKey="date" stroke="#6E5A52" fontSize={12} />
                        <YAxis
                          stroke="#6E5A52"
                          fontSize={12}
                          tickFormatter={(val) => `₹${Math.round(val / 100000)}k`}
                        />
                        <Tooltip
                          formatter={(val: any) => [formatRupees(val), 'Revenue']}
                          contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#A8793E' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenuePaise"
                          stroke="#7A231E"
                          strokeWidth={3}
                          dot={{ fill: '#A8793E', r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-accent/25 shadow-xs space-y-4">
                  <h3 className="font-serif text-xl font-semibold text-primary">
                    Most Viewed Sarees (Chart)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.mostViewed}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EADBCC" />
                        <XAxis
                          dataKey="title"
                          stroke="#6E5A52"
                          fontSize={11}
                          tickFormatter={(t) => (t.length > 14 ? t.substring(0, 14) + '…' : t)}
                        />
                        <YAxis stroke="#6E5A52" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#A8793E' }} />
                        <Bar dataKey="viewsCount" fill="#A8793E" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Clickable Most Viewed + Most Ordered + Low Stock */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-accent/25 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-semibold text-primary flex items-center gap-2">
                      <Eye className="w-5 h-5 text-accent" />
                      <span>Most Viewed Sarees</span>
                    </h3>
                    <span className="text-xs text-ink-muted">Click any saree to view</span>
                  </div>

                  {analytics.mostViewed.length === 0 ? (
                    <p className="text-sm text-ink-muted py-6 text-center">
                      No saree views recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-accent/15">
                      {analytics.mostViewed.map((item: any, idx: number) => (
                        <motion.div
                          key={item.id}
                          whileHover={{ x: 4 }}
                          onClick={() => handleProductClickFromAnalytics(item.id)}
                          className="py-3 flex items-center gap-3 cursor-pointer group"
                        >
                          <span className="font-mono text-sm font-bold text-accent w-6">
                            #{idx + 1}
                          </span>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-12 h-14 object-cover rounded-lg border border-accent/20 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-14 rounded-lg bg-canvas border border-accent/20 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-serif text-base font-semibold text-ink-primary group-hover:text-primary truncate transition-colors">
                              {item.title}
                            </p>
                            <p className="text-xs text-ink-muted">{item.viewsCount} views</p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            <span>View</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-accent/25 shadow-xs space-y-3">
                    <h3 className="font-serif text-xl font-semibold text-primary">
                      Top Ordered Sarees
                    </h3>
                    {analytics.mostOrdered.length === 0 ? (
                      <p className="text-sm text-ink-muted py-4 text-center">No orders placed yet.</p>
                    ) : (
                      <div className="divide-y divide-accent/15">
                        {analytics.mostOrdered.map((item: any) => (
                          <div
                            key={item.id}
                            onClick={() => handleProductClickFromAnalytics(item.id)}
                            className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-canvas/50 px-2 rounded-lg transition"
                          >
                            <span className="text-sm font-semibold text-ink-primary truncate">
                              {item.title}
                            </span>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold text-primary tabular-nums block">
                                {item.orderCount} sold
                              </span>
                              <span className="text-xs text-ink-muted tabular-nums">
                                {formatRupees(item.totalSoldPaise)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {lowStockProducts.length > 0 && (
                    <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300/60 space-y-3">
                      <h3 className="font-serif text-lg font-semibold text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                        <span>Low Stock Alerts (≤ 3 units)</span>
                      </h3>
                      <div className="space-y-2">
                        {lowStockProducts.slice(0, 5).map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-sm gap-2">
                            <span className="truncate font-medium text-amber-950">{p.title}</span>
                            <button
                              onClick={() => openEditSareePage(p)}
                              className="shrink-0 px-3 py-1 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800"
                            >
                              Restock ({p.availableStock})
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PENDING PAYMENT APPROVALS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">
                  UPI Payment Approval Queue
                </h2>
                <p className="text-sm text-ink-muted">
                  Match submitted 12-digit UTR references with bank credits. Approving commits real stock & notifies the customer.
                </p>
              </div>

              {(() => {
                const deepLinkedOrder = deepLinkOrderId
                  ? orders.find((o) => o.id === deepLinkOrderId || o.orderNumber === deepLinkOrderId)
                  : undefined;
                const displayOrders =
                  deepLinkedOrder && !pendingPayments.some((o) => o.id === deepLinkedOrder.id)
                    ? [deepLinkedOrder, ...pendingPayments]
                    : pendingPayments;

                if (displayOrders.length === 0) {
                  return (
                    <div className="text-center py-16 bg-surface rounded-2xl border border-accent/20 p-8 space-y-2">
                      <Check className="w-10 h-10 text-emerald-600 mx-auto" />
                      <h3 className="font-serif text-xl font-semibold text-primary">All Clear!</h3>
                      <p className="text-sm text-ink-muted">
                        No pending payment references awaiting approval.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {displayOrders.map((order) => {
                      const isHighlighted =
                        !!deepLinkOrderId &&
                        (order.id === deepLinkOrderId || order.orderNumber === deepLinkOrderId);
                      const isPendingVerify = order.status === 'payment_submitted' && !!order.payment;

                      return (
                        <div
                          key={order.id}
                          id={`verify-order-${order.id}`}
                          className={`p-5 rounded-2xl bg-surface border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
                            isHighlighted
                              ? 'border-primary ring-2 ring-primary/40 ring-offset-2 bg-amber-50/40'
                              : 'border-accent/30'
                          }`}
                        >
                          <div className="space-y-2.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-base font-bold text-primary">
                                #{order.orderNumber}
                              </span>
                              <span className="bg-amber-100 text-amber-800 text-xs font-bold uppercase px-2.5 py-0.5 rounded">
                                {order.status.replace('_', ' ')}
                              </span>
                              {isHighlighted && (
                                <span className="bg-primary text-canvas text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                                  Telegram Verify Link
                                </span>
                              )}
                            </div>

                            {order.items && order.items.length > 0 && (
                              <div className="text-xs bg-canvas/80 border border-accent/20 rounded-xl p-3 space-y-1">
                                <p className="font-semibold text-primary uppercase tracking-wider text-[11px]">
                                  Saree Details
                                </p>
                                {order.items.map((item: any, idx: number) => (
                                  <p key={item.id || idx} className="text-ink-primary">
                                    • <strong>{item.title}</strong> ({item.colorName}) × {item.quantity} —{' '}
                                    <span className="font-semibold">{formatRupees(item.totalPaise)}</span>
                                  </p>
                                ))}
                              </div>
                            )}

                            <div className="text-sm space-y-1 text-ink-muted">
                              <p>
                                <strong>Customer:</strong> {order.shippingName} ({order.shippingPhone})
                              </p>
                              <p>
                                <strong>Payable Total:</strong>{' '}
                                <span className="font-bold text-primary font-sans tabular-nums text-base">
                                  {formatRupees(order.totalPaise)}
                                </span>
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <strong>Submitted UTR Reference:</strong>
                                <code className="font-mono font-bold text-accent bg-canvas px-2.5 py-0.5 rounded border border-accent/30 text-sm select-all">
                                  {order.payment?.utrReference || 'N/A'}
                                </code>
                                {order.payment?.utrReference && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyUtr(order.id, order.payment!.utrReference)}
                                    className="text-xs px-2 py-0.5 rounded border border-accent/30 bg-canvas hover:bg-accent/10 text-primary font-semibold transition"
                                  >
                                    {copiedUtrOrderId === order.id ? 'Copied!' : 'Copy UTR'}
                                  </button>
                                )}
                              </div>
                              {order.payment?.proofR2Key && (
                                <p>
                                  <strong>Payment Proof:</strong>{' '}
                                  <a
                                    href={`/api/upload/${order.payment.proofR2Key}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary underline font-semibold"
                                  >
                                    View Uploaded Screenshot ↗
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>

                          {isPendingVerify && (
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                onClick={() => setRejectModalOrder(order)}
                                className="px-4 py-2.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-sm font-semibold transition"
                              >
                                Reject Payment
                              </button>

                              <button
                                onClick={() => handleApprovePayment(order.payment!.id)}
                                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-canvas text-sm font-bold shadow transition flex items-center gap-1.5"
                              >
                                <Check className="w-4 h-4" />
                                <span>Approve Payment</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: DELHIVERY TRACKING & SHIPMENTS */}
          {activeTab === 'shipments' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">
                  Delhivery Tracking & Orders
                </h2>
                <p className="text-sm text-ink-muted">
                  {delhiveryPersonal
                    ? 'Personal Delhivery Mode active: Add your Delhivery tracking link so customers can track their parcel directly.'
                    : 'Enter the Delhivery AWB / Delivery ID. Live tracking syncs automatically when your Delhivery token is configured.'}
                </p>
              </div>

              <div className="bg-surface rounded-2xl border border-accent/25 overflow-x-auto shadow-xs">
                <table className="w-full text-sm text-left min-w-[680px]">
                  <thead className="bg-canvas border-b border-accent/20 text-accent uppercase font-bold text-xs tracking-wider">
                    <tr>
                      <th className="p-4">Order #</th>
                      <th className="p-4">Customer & City</th>
                      <th className="p-4">Order Status</th>
                      <th className="p-4">Tracking Link / AWB</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-accent/15">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-canvas/40 transition">
                        <td className="p-4 font-mono font-bold text-primary">#{ord.orderNumber}</td>
                        <td className="p-4">
                          <strong>{ord.shippingName}</strong>
                          <div className="text-ink-muted text-xs">
                            {ord.shippingCity}, {ord.shippingState}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="capitalize px-2.5 py-1 rounded-full font-semibold text-xs bg-canvas border border-accent/30">
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 font-mono">
                          {ord.shipment?.trackingUrl || ord.shipment?.awbNumber ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={ord.shipment.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary font-bold underline"
                              >
                                {ord.shipment.awbNumber && ord.shipment.awbNumber !== 'DIRECT-LINK'
                                  ? ord.shipment.awbNumber
                                  : 'Open Tracking Link ↗'}
                              </a>
                              <span className="text-xs text-accent uppercase">
                                ({ord.shipment.status.replace(/_/g, ' ')})
                              </span>
                            </div>
                          ) : (
                            <span className="text-ink-muted italic">Not added yet</span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {!delhiveryPersonal && ord.shipment?.awbNumber && (
                            <button
                              onClick={() => handleSyncDelhivery(ord.id)}
                              disabled={syncingOrderId === ord.id}
                              className="bg-canvas border border-accent/30 text-ink-primary px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-primary transition"
                            >
                              {syncingOrderId === ord.id ? 'Syncing...' : 'Sync Delhivery'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShipmentModalOrder(ord);
                              setShipmentForm({
                                awbNumber:
                                  ord.shipment?.awbNumber === 'DIRECT-LINK'
                                    ? ''
                                    : ord.shipment?.awbNumber || '',
                                trackingUrl: ord.shipment?.trackingUrl || '',
                                courierName: 'Delhivery',
                                status: (ord.shipment?.status as any) || 'booked',
                                location: '',
                                remarks: '',
                              });
                            }}
                            className="bg-primary text-canvas px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-hover shadow-xs transition"
                          >
                            {ord.shipment
                              ? delhiveryPersonal
                                ? 'Update Link'
                                : 'Update AWB'
                              : delhiveryPersonal
                              ? 'Add Tracking Link'
                              : 'Add Delhivery ID'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: MERCHANDISING & CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">
                    Saree Catalog & Merchandising
                  </h2>
                  <p className="text-sm text-ink-muted">
                    Add new sarees, edit prices & variants, pin items to top, or toggle sold-out status.
                  </p>
                </div>
                <button
                  onClick={openAddSareePage}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-canvas px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-hover shadow transition active:scale-95"
                >
                  <Plus className="w-4 h-4 text-accent" />
                  <span>Add New Saree</span>
                </button>
              </div>

              <div className="bg-surface rounded-2xl border border-accent/25 overflow-x-auto shadow-xs">
                <table className="w-full text-sm text-left min-w-[740px]">
                  <thead className="bg-canvas border-b border-accent/20 text-accent uppercase font-bold text-xs tracking-wider">
                    <tr>
                      <th className="p-4">Saree</th>
                      <th className="p-4">Fabric</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">Pin</th>
                      <th className="p-4">Availability</th>
                      <th className="p-4 text-right">Edit / Archive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-accent/15">
                    {catalogProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-ink-muted">
                          No sarees added yet. Click <strong>Add New Saree</strong> to publish your first piece!
                        </td>
                      </tr>
                    ) : (
                      catalogProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-canvas/40 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {p.images?.[0]?.imageUrl ? (
                                <img
                                  src={p.images[0].imageUrl}
                                  alt=""
                                  className="w-12 h-14 object-cover rounded-lg border border-accent/20"
                                />
                              ) : (
                                <div className="w-12 h-14 rounded-lg bg-canvas border border-accent/20" />
                              )}
                              <div>
                                <strong className="font-serif text-base text-ink-primary block">
                                  {p.title}
                                </strong>
                                <span className="text-xs text-ink-muted">
                                  {p.variants?.filter((v: any) => v.isActive !== false).length || 0} variant(s) • {p.status}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-ink-muted">{p.fabric || '—'}</td>
                          <td className="p-4 font-bold text-primary font-sans tabular-nums">
                            {formatRupees(p.basePricePaise)}
                          </td>
                          <td className="p-4">
                            <span
                              className={`font-semibold ${
                                p.availableStock <= 3 ? 'text-secondary' : 'text-emerald-700'
                              }`}
                            >
                              {p.availableStock} available
                            </span>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleTogglePriority(p.id, p.isPinned)}
                              className={`p-2 rounded-lg border transition ${
                                p.isPinned
                                  ? 'bg-primary text-canvas border-primary shadow-xs'
                                  : 'bg-canvas text-ink-muted border-accent/30 hover:border-primary'
                              }`}
                              title="Toggle Pin to Top"
                            >
                              <Pin className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleOutOfStock(p.id, p.isOutOfStock)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                p.isOutOfStock
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.isOutOfStock ? 'Sold Out' : 'Available'}
                            </button>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => openEditSareePage(p)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-canvas border border-accent/30 hover:border-primary text-ink-primary text-xs font-semibold"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            {p.status !== 'archived' && (
                              <button
                                onClick={() => handleArchiveProduct(p.id, p.title)}
                                className="inline-flex items-center p-2 rounded-lg text-red-700 hover:bg-red-50"
                                title="Archive Saree"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4b: DEDICATED ADD / EDIT SAREE PAGE (Not a Modal) */}
          {activeTab === 'saree-editor' && (
            <form
              onSubmit={handleSaveSaree}
              className="bg-surface p-5 sm:p-8 rounded-2xl border border-accent/30 shadow-xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-accent/20">
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-primary mb-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Saree Catalog</span>
                  </button>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">
                    {sareeForm.id ? 'Edit Saree Details' : 'Add New Saree'}
                  </h2>
                  <p className="text-sm text-ink-muted">
                    Fields marked with * are required. All other fields are optional.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1.5">Saree Title *</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    placeholder="e.g. Royal Crimson Kanjeevaram Silk"
                    value={sareeForm.title}
                    onChange={(e) => setSareeForm({ ...sareeForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1.5">
                    Subtitle <span className="text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pure zari border with festive pallu"
                    value={sareeForm.subtitle}
                    onChange={(e) => setSareeForm({ ...sareeForm, subtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1.5">
                    Fabric <span className="text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pure Mulberry Silk"
                    value={sareeForm.fabric}
                    onChange={(e) => setSareeForm({ ...sareeForm, fabric: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1.5">
                    Weave Type <span className="text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Korvai / Kadhwa"
                    value={sareeForm.weaveType}
                    onChange={(e) => setSareeForm({ ...sareeForm, weaveType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1.5">
                    Occasion <span className="text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bridal, Festive"
                    value={sareeForm.occasion}
                    onChange={(e) => setSareeForm({ ...sareeForm, occasion: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1.5">Description *</label>
                  <textarea
                    rows={4}
                    required
                    minLength={10}
                    placeholder="Describe the saree weave, zari, pallu, and drape..."
                    value={sareeForm.description}
                    onChange={(e) => setSareeForm({ ...sareeForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1.5">
                    Blouse Details <span className="text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unstitched matching brocade blouse piece"
                    value={sareeForm.blouseDetails}
                    onChange={(e) => setSareeForm({ ...sareeForm, blouseDetails: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1.5">
                    Care Instructions <span className="text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dry clean only"
                    value={sareeForm.careInstructions}
                    onChange={(e) => setSareeForm({ ...sareeForm, careInstructions: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1.5">
                    Instagram Reel / Post URL <span className="text-ink-muted font-normal">(Optional — embeds drape video on saree page)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.instagram.com/reel/..."
                    value={sareeForm.instagramUrl}
                    onChange={(e) => setSareeForm({ ...sareeForm, instagramUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Photo Upload or URL (Optional) */}
                <div className="md:col-span-2 p-4 rounded-xl bg-canvas border border-accent/20 space-y-3">
                  <label className="block font-semibold">
                    Saree Photo <span className="text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-canvas cursor-pointer hover:bg-primary-hover shrink-0 text-sm font-semibold">
                      <Upload className="w-4 h-4 text-accent" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Or paste image URL (https://...)"
                      value={sareeForm.imageUrl}
                      onChange={(e) => setSareeForm({ ...sareeForm, imageUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-accent/30"
                    />
                  </div>
                  {sareeForm.imageUrl && (
                    <img
                      src={sareeForm.imageUrl}
                      alt="Preview"
                      className="h-28 w-24 object-cover rounded-lg border border-accent/30 mt-2"
                    />
                  )}
                </div>

                {/* Variants with Delete Variant Button */}
                <div className="md:col-span-2 space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-base text-primary">
                      Color Variants, Stock & Pricing (₹) *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSareeForm({
                          ...sareeForm,
                          variants: [
                            ...sareeForm.variants,
                            {
                              id: '',
                              colorName: 'Gold',
                              colorHex: '#A8793E',
                              sku: `AVS-${Math.floor(1000 + Math.random() * 9000)}`,
                              stockQty: 3,
                              priceInr: sareeForm.variants[0]?.priceInr || 4999,
                              mrpInr: sareeForm.variants[0]?.mrpInr || 6499,
                              isDefault: false,
                              isActive: true,
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variant</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sareeForm.variants.map((v, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-2 sm:grid-cols-7 gap-3 p-3.5 rounded-xl bg-canvas border border-accent/25 items-end"
                      >
                        <div>
                          <span className="text-xs text-ink-muted block mb-1">Color *</span>
                          <input
                            type="text"
                            required
                            value={v.colorName}
                            onChange={(e) => {
                              const next = [...sareeForm.variants];
                              next[idx].colorName = e.target.value;
                              setSareeForm({ ...sareeForm, variants: next });
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-surface border border-accent/25"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-ink-muted block mb-1">Swatch</span>
                          <input
                            type="color"
                            value={v.colorHex}
                            onChange={(e) => {
                              const next = [...sareeForm.variants];
                              next[idx].colorHex = e.target.value;
                              setSareeForm({ ...sareeForm, variants: next });
                            }}
                            className="w-full h-10 rounded-lg bg-surface border border-accent/25 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-ink-muted block mb-1">SKU *</span>
                          <input
                            type="text"
                            required
                            value={v.sku}
                            onChange={(e) => {
                              const next = [...sareeForm.variants];
                              next[idx].sku = e.target.value;
                              setSareeForm({ ...sareeForm, variants: next });
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-surface border border-accent/25 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-ink-muted block mb-1">Stock *</span>
                          <input
                            type="number"
                            min={0}
                            required
                            value={v.stockQty}
                            onChange={(e) => {
                              const next = [...sareeForm.variants];
                              next[idx].stockQty = Number(e.target.value);
                              setSareeForm({ ...sareeForm, variants: next });
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-surface border border-accent/25"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-ink-muted block mb-1">Sale Price (₹) *</span>
                          <input
                            type="number"
                            min={1}
                            required
                            value={v.priceInr}
                            onChange={(e) => {
                              const next = [...sareeForm.variants];
                              next[idx].priceInr = Number(e.target.value);
                              setSareeForm({ ...sareeForm, variants: next });
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-surface border border-accent/25"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-ink-muted block mb-1">MRP (₹) *</span>
                          <input
                            type="number"
                            min={1}
                            required
                            value={v.mrpInr}
                            onChange={(e) => {
                              const next = [...sareeForm.variants];
                              next[idx].mrpInr = Number(e.target.value);
                              setSareeForm({ ...sareeForm, variants: next });
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-surface border border-accent/25"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteVariant(idx)}
                            disabled={sareeForm.variants.length <= 1}
                            title={
                              sareeForm.variants.length <= 1
                                ? 'At least 1 variant required'
                                : 'Delete variant'
                            }
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sm:hidden">Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Merchandising Checkboxes */}
                <div className="md:col-span-2 flex flex-wrap items-center gap-5 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sareeForm.isNewArrival}
                      onChange={(e) => setSareeForm({ ...sareeForm, isNewArrival: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span>New Arrival</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sareeForm.isFeatured}
                      onChange={(e) => setSareeForm({ ...sareeForm, isFeatured: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span>Featured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sareeForm.isPinned}
                      onChange={(e) => setSareeForm({ ...sareeForm, isPinned: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span>Pin to Top</span>
                  </label>
                  <select
                    value={sareeForm.status}
                    onChange={(e) => setSareeForm({ ...sareeForm, status: e.target.value as any })}
                    className="px-3 py-1.5 rounded-lg bg-canvas border border-accent/30"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-accent/20">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-5 py-2.5 text-sm font-semibold text-ink-muted hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSaree}
                  className="px-6 py-2.5 text-sm font-semibold bg-primary text-canvas rounded-xl hover:bg-primary-hover shadow"
                >
                  {savingSaree ? 'Saving...' : sareeForm.id ? 'Update Saree' : 'Publish Saree'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">
                    Coupons & Festival Discounts
                  </h2>
                  <p className="text-sm text-ink-muted">
                    Create flat or percentage promo codes with minimum order and maximum discount rules.
                  </p>
                </div>
                <button
                  onClick={() => setIsCouponModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-canvas px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-hover shadow transition active:scale-95"
                >
                  <Plus className="w-4 h-4 text-accent" />
                  <span>Create Coupon</span>
                </button>
              </div>

              {coupons.length === 0 ? (
                <div className="text-center py-14 bg-surface rounded-2xl border border-accent/20 text-sm text-ink-muted">
                  No coupons created yet. Click <strong>Create Coupon</strong> to add a festival offer.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-2xl bg-surface border border-accent/25 shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-base font-bold text-primary bg-primary/10 px-3 py-1 rounded tracking-wider">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleToggleCoupon(c)}
                            className={`text-xs uppercase font-bold px-3 py-1 rounded-full transition ${
                              c.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {c.isActive ? 'Active' : 'Paused'}
                          </button>
                        </div>
                        <div className="text-sm text-ink-muted space-y-1">
                          <p>
                            <strong>Discount:</strong>{' '}
                            {c.discountType === 'percentage'
                              ? `${c.discountValue}% Off`
                              : formatRupees(c.discountValue)}
                          </p>
                          <p>
                            <strong>Min Order:</strong> {formatRupees(c.minOrderPaise)}
                          </p>
                          {c.maxDiscountPaise && (
                            <p>
                              <strong>Max Cap:</strong> {formatRupees(c.maxDiscountPaise)}
                            </p>
                          )}
                          <p>
                            <strong>Redemptions:</strong> {c.usageCount} times
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-accent/15 flex justify-end">
                        <button
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: STORE SETTINGS & REVIEWS */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <form
                onSubmit={handleSaveSettings}
                className="p-6 rounded-2xl bg-surface border border-accent/25 shadow-xs space-y-4"
              >
                <h2 className="font-serif text-xl font-semibold text-primary flex items-center gap-2">
                  <Settings className="w-5 h-5 text-accent" />
                  <span>Store & UPI Settings</span>
                </h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block font-semibold mb-1">Store UPI ID</label>
                    <input
                      type="text"
                      value={storeSettings.upiId || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, upiId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">UPI Payee Name</label>
                    <input
                      type="text"
                      value={storeSettings.payeeName || ''}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, payeeName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      Announcement Bar Message <span className="text-ink-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={storeSettings.announcementText || ''}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, announcementText: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Free Shipping Above (₹)</label>
                      <input
                        type="number"
                        value={Math.round((storeSettings.freeShippingThresholdPaise || 299900) / 100)}
                        onChange={(e) =>
                          setStoreSettings({
                            ...storeSettings,
                            freeShippingThresholdPaise: Number(e.target.value) * 100,
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Default Shipping Fee (₹)</label>
                      <input
                        type="number"
                        value={Math.round((storeSettings.defaultShippingChargePaise || 15000) / 100)}
                        onChange={(e) =>
                          setStoreSettings({
                            ...storeSettings,
                            defaultShippingChargePaise: Number(e.target.value) * 100,
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-primary text-canvas px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-hover shadow"
                >
                  {settingsSaved ? 'Settings Saved!' : 'Save Store Settings'}
                </button>
              </form>

              <div className="p-6 rounded-2xl bg-surface border border-accent/25 shadow-xs space-y-4">
                <h2 className="font-serif text-xl font-semibold text-primary flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent" />
                  <span>Customer Reviews Moderation</span>
                </h2>
                {reviews.length === 0 ? (
                  <p className="text-sm text-ink-muted py-6 text-center">No customer reviews yet.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {reviews.map((r) => (
                      <div
                        key={r.id}
                        className="p-4 rounded-xl bg-canvas border border-accent/20 text-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">
                            {r.rating}★ — {r.reviewTitle}
                          </span>
                          <button
                            onClick={async () => {
                              await api.moderateReview(r.id, !r.isApproved);
                              loadData();
                            }}
                            className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                              r.isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {r.isApproved ? 'Visible' : 'Hidden'}
                          </button>
                        </div>
                        <p className="text-ink-muted text-xs">{r.reviewText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Rejection Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 bg-ink-primary/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface p-6 rounded-2xl max-w-md w-full border border-accent/40 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-semibold text-primary">
              Reject Payment Reference
            </h3>
            <p className="text-sm text-ink-muted">
              Specify reason why payment could not be matched with bank credit. Stock hold will be released immediately.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Credit not found in bank statement; UTR mismatch."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 text-sm rounded-xl bg-canvas border border-accent/30 text-ink-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 text-sm font-semibold text-ink-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                className="px-4 py-2 text-sm font-semibold bg-red-700 text-white rounded-xl hover:bg-red-800"
              >
                Reject & Release Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delhivery Shipment Modal */}
      {shipmentModalOrder && (
        <div className="fixed inset-0 z-50 bg-ink-primary/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveShipment}
            className="bg-surface p-6 rounded-2xl max-w-md w-full border border-accent/40 shadow-2xl space-y-4"
          >
            <h3 className="font-serif text-xl font-semibold text-primary">
              {delhiveryPersonal ? 'Delhivery Tracking Link' : 'Delhivery Tracking ID'}
            </h3>
            <p className="text-sm text-ink-muted">
              {delhiveryPersonal
                ? `Order #${shipmentModalOrder.orderNumber} — Paste your personal Delhivery tracking link so the customer can track their order directly.`
                : `Order #${shipmentModalOrder.orderNumber} — Enter the Delhivery AWB. Tracking syncs automatically when your Delhivery token is active.`}
            </p>

            <div className="space-y-3 text-sm">
              {delhiveryPersonal ? (
                <>
                  <div>
                    <label className="block font-semibold mb-1">Delhivery Tracking Link *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.delhivery.com/track/package/..."
                      value={shipmentForm.trackingUrl}
                      onChange={(e) =>
                        setShipmentForm({ ...shipmentForm, trackingUrl: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 text-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      AWB / Reference ID <span className="text-ink-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DEL1234567890"
                      value={shipmentForm.awbNumber}
                      onChange={(e) =>
                        setShipmentForm({ ...shipmentForm, awbNumber: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold mb-1">Delhivery AWB / Tracking ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DEL1234567890"
                      value={shipmentForm.awbNumber}
                      onChange={(e) =>
                        setShipmentForm({ ...shipmentForm, awbNumber: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 font-mono font-bold text-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Custom Tracking Link <span className="text-ink-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="Auto-generated if left blank"
                      value={shipmentForm.trackingUrl}
                      onChange={(e) =>
                        setShipmentForm({ ...shipmentForm, trackingUrl: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold mb-1">
                  Status <span className="text-ink-muted font-normal">({delhiveryPersonal ? 'Required' : 'Optional override'})</span>
                </label>
                <select
                  value={shipmentForm.status}
                  onChange={(e) =>
                    setShipmentForm({ ...shipmentForm, status: e.target.value as any })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                >
                  <option value="booked">Booked</option>
                  <option value="picked_up">Picked Up (Sends Shipped Email)</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered (Unlocks Review & Email)</option>
                  <option value="rto">RTO (Returned to Origin)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Location / Remarks <span className="text-ink-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chennai Hub"
                  value={shipmentForm.location}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-accent/20">
              <button
                type="button"
                onClick={() => setShipmentModalOrder(null)}
                className="px-4 py-2 text-sm font-semibold text-ink-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold bg-primary text-canvas rounded-xl hover:bg-primary-hover shadow"
              >
                {delhiveryPersonal ? 'Save Tracking Link' : 'Save AWB & Sync'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-primary/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCoupon}
            className="bg-surface p-6 rounded-2xl max-w-md w-full border border-accent/40 shadow-2xl space-y-4"
          >
            <h3 className="font-serif text-xl font-semibold text-primary">Create Promo Coupon</h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  placeholder="e.g. DIWALI15"
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30 font-mono uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Discount Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discountType: e.target.value as any })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    {couponForm.discountType === 'percentage' ? 'Discount (%) *' : 'Discount (₹) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={couponForm.discountValue}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    Min Order (₹) <span className="text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.minOrderInr}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, minOrderInr: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                  />
                </div>
                {couponForm.discountType === 'percentage' && (
                  <div>
                    <label className="block font-semibold mb-1">
                      Max Cap (₹) <span className="text-ink-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={couponForm.maxDiscountInr}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, maxDiscountInr: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-accent/30"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-accent/20">
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-ink-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold bg-primary text-canvas rounded-xl hover:bg-primary-hover shadow"
              >
                Create Coupon
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
