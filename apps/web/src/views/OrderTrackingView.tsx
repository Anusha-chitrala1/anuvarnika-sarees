import React, { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Star,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { OrderDTO, formatRupees } from '@anuvarnika/shared';
import { ReviewModal } from '../components/ReviewModal.js';
import { api } from '../lib/api.js';

interface OrderTrackingViewProps {
  orderNumber: string;
  onBack: () => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  orderNumber,
  onBack,
}) => {
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopiedAwb, setIsCopiedAwb] = useState(false);

  // Review modal state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<{ id: string; title: string } | null>(null);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getOrder(orderNumber);
      setOrder(res.order);
    } catch (err: any) {
      setError(err.message || 'Order could not be found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderNumber]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-serif text-lg text-primary">Fetching live order status...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="font-serif text-2xl font-semibold text-primary">Order Not Found</h2>
        <p className="text-xs text-ink-muted">{error || 'Please check your order reference number'}</p>
        <button
          onClick={onBack}
          className="bg-primary text-canvas px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-hover shadow"
        >
          Return to Store
        </button>
      </div>
    );
  }

  const handleCopyAwb = () => {
    if (!order.shipment?.awbNumber) return;
    navigator.clipboard.writeText(order.shipment.awbNumber);
    setIsCopiedAwb(true);
    setTimeout(() => setIsCopiedAwb(false), 2000);
  };

  // Stepper logic
  const steps = [
    { key: 'payment_submitted', label: 'Payment Reference Logged' },
    { key: 'payment_verified', label: 'Payment Approved by Owner' },
    { key: 'booked', label: 'Delhivery AWB Booked' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const getStepIndex = (status: string, shipmentStatus?: string) => {
    if (status === 'delivered') return 4;
    if (shipmentStatus === 'in_transit' || shipmentStatus === 'out_for_delivery') return 3;
    if (shipmentStatus === 'booked' || shipmentStatus === 'picked_up') return 2;
    if (status === 'payment_verified' || status === 'processing') return 1;
    return 0;
  };

  const currentStepIdx = getStepIndex(order.status, order.shipment?.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      {/* Top Bar */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-primary transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-accent/25 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-accent/20">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-accent">
              Live Order Progression
            </span>
            <h1 className="font-serif text-3xl font-semibold text-primary">
              Order #{order.orderNumber}
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                order.status === 'delivered'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.status === 'shipped'
                  ? 'bg-blue-100 text-blue-800'
                  : order.status === 'payment_verified'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {order.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Visual Progress Stepper */}
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {steps.map((st, idx) => {
              const isPastOrCurrent = idx <= currentStepIdx;
              return (
                <div
                  key={st.key}
                  className={`p-3 rounded-xl border text-center space-y-1.5 transition ${
                    isPastOrCurrent
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-accent/20 bg-canvas text-ink-muted'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {isPastOrCurrent ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <Clock className="w-5 h-5 text-accent/50" />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold leading-tight">{st.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delhivery Tracking Card if AWB is generated */}
        {order.shipment ? (
          <div className="p-5 rounded-xl bg-canvas border border-accent/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-accent" />
                <h3 className="font-serif text-base font-semibold text-primary">
                  Delhivery Express Shipment
                </h3>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold uppercase px-2 py-0.5 rounded">
                {order.shipment.status.replace('_', ' ')}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {order.shipment.awbNumber && order.shipment.awbNumber !== 'DIRECT-LINK' ? (
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted">Tracking AWB:</span>
                  <code className="font-mono text-sm font-bold text-primary bg-surface px-2.5 py-1 rounded border border-accent/20 select-all">
                    {order.shipment.awbNumber}
                  </code>
                  <button
                    onClick={handleCopyAwb}
                    className="p-1 rounded text-ink-muted hover:text-primary transition"
                    title="Copy AWB Number"
                  >
                    {isCopiedAwb ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <span className="text-ink-muted">Direct courier tracking link available</span>
              )}

              <a
                href={order.shipment.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-canvas px-4 py-2 rounded-lg text-xs font-semibold transition shadow-xs"
              >
                <span>Track on Delhivery Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Shipment Updates Timeline */}
            {order.shipment.statusUpdates && order.shipment.statusUpdates.length > 0 && (
              <div className="pt-3 border-t border-accent/15 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                  Latest Transit Updates
                </span>
                <div className="space-y-1.5">
                  {order.shipment.statusUpdates.map((update: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-ink-muted">
                      <span>{update.location ? `${update.location} — ` : ''}{update.remarks || update.status.replace('_', ' ')}</span>
                      <span>{new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-canvas border border-accent/20 text-xs text-ink-muted flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p>
              Your payment reference is currently under review by our store admin. Once verified against our bank statement, the parcel will be booked in Delhivery and your live AWB number will appear here.
            </p>
          </div>
        )}

        {/* Items Ordered List */}
        <div className="space-y-3 pt-4 border-t border-accent/20">
          <h3 className="font-serif text-lg font-semibold text-primary">Ordered Sarees</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-canvas/40 border border-accent/15 gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-14 h-18 object-cover object-top rounded border border-accent/20 shrink-0"
                  />
                  <div>
                    <h4 className="font-serif font-semibold text-ink-primary text-sm line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-ink-muted">
                      {item.colorName} • Qty: {item.quantity} • SKU: {item.sku}
                    </p>
                    <span className="font-bold text-primary text-xs mt-1 block">
                      {formatRupees(item.pricePaise * item.quantity)}
                    </span>
                  </div>
                </div>

                {/* Verified Post-Delivery Review Button */}
                {order.status === 'delivered' && (
                  <button
                    onClick={() => {
                      setReviewProduct({ id: item.productId, title: item.title });
                      setIsReviewOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-accent/10 text-accent hover:bg-accent/20 px-3.5 py-2 rounded-lg transition"
                  >
                    <Star className="w-3.5 h-3.5 text-accent" />
                    <span>Write Verified Review</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shipping & Financial Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-accent/20 text-xs">
          <div>
            <h4 className="font-bold text-ink-primary mb-1 uppercase tracking-wider text-[11px]">
              Delivery Recipient
            </h4>
            <p className="text-ink-muted leading-relaxed font-light">
              <strong>{order.shippingName}</strong><br />
              {order.shippingAddressLine1}<br />
              {order.shippingCity}, {order.shippingState} - {order.shippingPincode}<br />
              Phone: {order.shippingPhone}
            </p>
          </div>

          <div className="space-y-1.5 text-right sm:text-right">
            <div className="flex justify-between sm:justify-end gap-6 text-ink-muted">
              <span>Subtotal:</span>
              <span>{formatRupees(order.subtotalPaise)}</span>
            </div>
            {order.discountPaise > 0 && (
              <div className="flex justify-between sm:justify-end gap-6 text-emerald-700 font-medium">
                <span>Coupon Discount:</span>
                <span>-{formatRupees(order.discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between sm:justify-end gap-6 text-ink-muted">
              <span>Insured Shipping:</span>
              <span>{order.shippingFeePaise === 0 ? 'Free' : formatRupees(order.shippingFeePaise)}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6 font-bold text-ink-primary text-sm pt-2 border-t border-accent/20">
              <span>Total Paid:</span>
              <span className="font-serif text-lg text-primary">{formatRupees(order.totalPaise)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewProduct && (
        <ReviewModal
          isOpen={isReviewOpen}
          onClose={() => {
            setIsReviewOpen(false);
            setReviewProduct(null);
          }}
          orderId={order.id}
          productId={reviewProduct.id}
          productTitle={reviewProduct.title}
          onSuccess={() => {
            alert('Review submitted! Thank you for sharing your experience.');
          }}
        />
      )}
    </motion.div>
  );
};
