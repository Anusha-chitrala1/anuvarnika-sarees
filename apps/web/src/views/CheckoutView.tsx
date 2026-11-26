import React, { useState } from 'react';
import {
  ShieldCheck,
  Copy,
  Check,
  Clock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { formatRupees, generateUpiUrl } from '@anuvarnika/shared';
import { useCartStore } from '../store/useCartStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { api } from '../lib/api.js';

interface CheckoutViewProps {
  onOrderCompleted: (orderNumber: string) => void;
  onBackToShop: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  onOrderCompleted,
  onBackToShop,
}) => {
  const { items, couponCode, getSubtotalPaise, getTotalPaise, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [shipping, setShipping] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    addressLine1: '',
    addressLine2: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600040',
    customerNotes: '',
  });

  const [step, setStep] = useState<'address' | 'payment' | 'completed'>('address');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    totalPaise: number;
    reservationExpiresAt: number;
    upiId: string;
  } | null>(null);

  // Payment form state
  const [utrReference, setUtrReference] = useState('');
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const subtotalPaise = getSubtotalPaise();
  const isFreeShipping = subtotalPaise >= 299900;
  const shippingFeePaise = isFreeShipping ? 0 : 15000;
  const totalPaise = getTotalPaise(shippingFeePaise);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipping.name || !shipping.phone || !shipping.email || !shipping.addressLine1 || !shipping.pincode) {
      setOrderError('Please fill out all required shipping address fields');
      return;
    }

    try {
      setIsSubmittingOrder(true);
      setOrderError(null);

      const orderPayload = {
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        couponCode: couponCode || undefined,
        shipping,
      };

      const res = await api.createOrder(orderPayload);
      setCreatedOrder(res);
      setStep('payment');
    } catch (err: any) {
      setOrderError(err.message || 'Failed to place order. One or more items may be out of stock.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCopyUpi = () => {
    if (!createdOrder?.upiId) return;
    navigator.clipboard.writeText(createdOrder.upiId);
    setIsCopiedUpi(true);
    setTimeout(() => setIsCopiedUpi(false), 2000);
  };

  const handleSubmitUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder || utrReference.trim().length !== 12) {
      setPaymentError('Please enter a valid 12-digit bank UTR transaction reference');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      setPaymentError(null);

      await api.submitUpiPayment(createdOrder.orderId, utrReference.trim());

      // Trigger Confetti Celebrations!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7A231E', '#A8793E', '#D98273', '#FAF5EB'],
      });

      clearCart();
      setStep('completed');
    } catch (err: any) {
      setPaymentError(err.message || 'Payment submission failed. Check UTR number.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const upiUrl = createdOrder
    ? generateUpiUrl({
        upiId: createdOrder.upiId,
        payeeName: 'AnuVarnika Sarees',
        amountPaise: createdOrder.totalPaise,
        orderNumber: createdOrder.orderNumber,
      })
    : '';

  const qrImageUrl = upiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`
    : '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Checkout Progress Stepper */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-semibold">
        <span
          className={`px-3 py-1.5 rounded-full ${
            step === 'address'
              ? 'bg-primary text-canvas'
              : 'bg-primary/20 text-primary'
          }`}
        >
          1. Shipping Address
        </span>
        <span className="text-accent">→</span>
        <span
          className={`px-3 py-1.5 rounded-full ${
            step === 'payment'
              ? 'bg-primary text-canvas'
              : step === 'completed'
              ? 'bg-primary/20 text-primary'
              : 'bg-canvas border border-accent/20 text-ink-muted'
          }`}
        >
          2. Direct UPI Payment
        </span>
        <span className="text-accent">→</span>
        <span
          className={`px-3 py-1.5 rounded-full ${
            step === 'completed'
              ? 'bg-emerald-700 text-canvas'
              : 'bg-canvas border border-accent/20 text-ink-muted'
          }`}
        >
          3. Verification
        </span>
      </div>

      {/* Step 1: Shipping Address Form */}
      {step === 'address' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
        >
          <form onSubmit={handleCreateOrder} className="md:col-span-7 bg-surface p-6 sm:p-8 rounded-2xl border border-accent/25 shadow-md space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-primary">
              Delivery Address
            </h2>

            {orderError && (
              <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{orderError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-primary mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Priya Sharma"
                  value={shipping.name}
                  onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-primary mb-1">
                  10-Digit Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  pattern="[6-9][0-9]{9}"
                  value={shipping.phone}
                  onChange={(e) => setShipping({ ...shipping, phone: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-ink-primary mb-1">
                Email Address for Order Updates <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="priya@example.com"
                value={shipping.email}
                onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-ink-primary mb-1">
                House / Flat / Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Flat 402, Lotus Residency, 4th Avenue"
                value={shipping.addressLine1}
                onChange={(e) => setShipping({ ...shipping, addressLine1: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-ink-primary mb-1">City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink-primary mb-1">State <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={shipping.state}
                  onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink-primary mb-1">6-Digit PIN <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={shipping.pincode}
                  onChange={(e) => setShipping({ ...shipping, pincode: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-accent/20">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmittingOrder || items.length === 0}
                className="w-full bg-primary hover:bg-primary-hover text-canvas py-3.5 rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
              >
                {isSubmittingOrder ? (
                  <span>Reserving Saree Stock...</span>
                ) : (
                  <>
                    <span>Confirm Address & Place Order Hold</span>
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Bag Summary */}
          <div className="md:col-span-5 bg-surface p-6 rounded-2xl border border-accent/25 space-y-4 shadow-sm">
            <h3 className="font-serif text-lg font-semibold text-primary">Order Summary</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={i.variantId} className="flex gap-3 text-xs">
                  <img src={i.imageUrl} alt="" className="w-12 h-16 object-cover object-top rounded border border-accent/20 shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-serif font-semibold text-ink-primary line-clamp-1">{i.title}</h4>
                    <p className="text-ink-muted text-[11px]">{i.colorName} • Qty: {i.quantity}</p>
                    <p className="font-bold text-primary mt-1">{formatRupees(i.pricePaise * i.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-accent/20 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal</span>
                <span>{formatRupees(subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Insured Delhivery</span>
                <span>{isFreeShipping ? <strong className="text-emerald-700">Free</strong> : formatRupees(shippingFeePaise)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-ink-primary pt-2 border-t border-accent/20">
                <span>Payable Amount</span>
                <span className="font-serif text-xl text-primary">{formatRupees(totalPaise)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2: Direct UPI QR & 12-Digit UTR Submission Screen */}
      {step === 'payment' && createdOrder && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface p-6 sm:p-10 rounded-2xl border border-accent/30 shadow-xl space-y-8 max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="text-center space-y-2 pb-6 border-b border-accent/20">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Order #{createdOrder.orderNumber} Reserved
            </span>
            <h2 className="font-serif text-3xl font-semibold text-primary">
              Direct UPI QR Payment
            </h2>
            <p className="text-xs text-ink-muted max-w-md mx-auto font-light">
              Pay directly from GPay, PhonePe, Paytm, or BHIM. No gateway convenience fees.
            </p>
          </div>

          {/* 15-Minute Reservation Timer Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
              <span>
                <strong>15-Minute Reservation Hold Active:</strong> Your saree stock is safely held while you submit your bank UTR.
              </span>
            </div>
          </div>

          {/* QR Code & UPI Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center bg-canvas/40 p-6 rounded-xl border border-accent/20">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-white rounded-xl shadow-md border border-accent/20">
                <img
                  src={qrImageUrl}
                  alt="UPI QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <span className="text-[11px] text-ink-muted font-medium">Scan with any UPI App</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-ink-muted uppercase tracking-wider text-[10px] font-bold">
                  Exact Amount to Transfer
                </span>
                <p className="font-serif text-3xl font-bold text-primary">
                  {formatRupees(createdOrder.totalPaise)}
                </p>
              </div>

              <div>
                <span className="text-ink-muted uppercase tracking-wider text-[10px] font-bold">
                  Official Store UPI ID
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="font-mono text-sm font-bold text-accent bg-surface px-2.5 py-1.5 rounded border border-accent/30 select-all">
                    {createdOrder.upiId}
                  </code>
                  <button
                    onClick={handleCopyUpi}
                    className="p-1.5 rounded-lg bg-surface border border-accent/30 hover:border-primary text-ink-primary transition"
                    title="Copy UPI ID"
                  >
                    {isCopiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-ink-muted uppercase tracking-wider text-[10px] font-bold">
                  Payee Account Name
                </span>
                <p className="font-semibold text-ink-primary text-sm">AnuVarnika Sarees</p>
              </div>
            </div>
          </div>

          {/* UTR Submission Form */}
          <form onSubmit={handleSubmitUpiPayment} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink-primary">
                Submit 12-Digit Bank UTR / Transaction Reference Number <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-ink-muted">
                Found in your payment app under transaction details (e.g. 123456789012).
              </p>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="Enter 12-character UTR"
                value={utrReference}
                onChange={(e) => setUtrReference(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 font-mono text-base font-bold tracking-widest text-primary rounded-xl bg-canvas border-2 border-accent/40 focus:outline-none focus:border-primary uppercase"
              />
            </div>

            {paymentError && (
              <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-200">
                {paymentError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingPayment || utrReference.trim().length !== 12}
              className="w-full bg-primary hover:bg-primary-hover text-canvas py-4 rounded-xl text-sm font-semibold tracking-wide shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isSubmittingPayment ? (
                <span>Submitting Reference & Alerting Owner...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>Submit Payment Reference for Instant Approval</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* Step 3: Order Submitted & Awaiting Verification */}
      {step === 'completed' && createdOrder && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface p-8 sm:p-12 rounded-2xl border border-accent/30 shadow-xl text-center space-y-6 max-w-xl mx-auto"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-accent">
              Payment Reference Logged
            </span>
            <h2 className="font-serif text-3xl font-semibold text-primary">
              Order #{createdOrder.orderNumber} Confirmed!
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-light">
              We have dispatched an instant alert to our store owner. As soon as your bank credit of <strong>{formatRupees(createdOrder.totalPaise)}</strong> is verified, you will receive a confirmation email and <strong>Delhivery AWB tracking details</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-accent/20 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-ink-muted">Order Number:</span>
              <strong className="font-mono text-primary">{createdOrder.orderNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Submitted UTR:</span>
              <strong className="font-mono">{utrReference}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Payable Amount:</span>
              <strong className="font-serif text-primary text-sm">{formatRupees(createdOrder.totalPaise)}</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOrderCompleted(createdOrder.orderNumber)}
              className="flex-1 bg-primary text-canvas py-3 rounded-lg text-xs font-semibold hover:bg-primary-hover shadow transition"
            >
              Track Order Live
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBackToShop}
              className="flex-1 bg-canvas border border-accent/30 text-ink-primary hover:bg-surface py-3 rounded-lg text-xs font-semibold transition"
            >
              Continue Shopping
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
