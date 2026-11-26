import React, { useState, useEffect } from 'react';
import { Package, Truck, ArrowRight, ShoppingBag, ExternalLink } from 'lucide-react';
import { OrderDTO, formatRupees } from '@anuvarnika/shared';
import { motion } from 'framer-motion';
import { api } from '../lib/api.js';

interface MyOrdersViewProps {
  onTrackOrder: (orderNumber: string) => void;
  onExplore: () => void;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  onTrackOrder,
  onExplore,
}) => {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getMyOrders()
      .then((res) => setOrders(res.orders))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="pb-4 border-b border-accent/20">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">My Saree Orders</h1>
        <p className="text-xs sm:text-sm text-ink-muted mt-1">Track payment approval, Delhivery dispatch, and leave reviews</p>
      </div>

      {orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-14 sm:py-16 bg-surface rounded-2xl border border-accent/20 p-6 sm:p-8 space-y-4"
        >
          <Package className="w-12 h-12 text-accent mx-auto" />
          <h3 className="font-serif text-xl font-semibold text-primary">No orders placed yet</h3>
          <p className="text-xs sm:text-sm text-ink-muted max-w-sm mx-auto">
            Explore our silk sarees and place your first order.
          </p>
          <button
            onClick={onExplore}
            className="bg-primary text-canvas px-6 py-2.5 rounded-full text-xs font-semibold hover:bg-primary-hover shadow transition active:scale-95"
          >
            Explore Sarees
          </button>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {orders.map((ord, index) => (
            <motion.div
              key={ord.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.25) }}
              className="p-4 sm:p-5 rounded-2xl bg-surface border border-accent/25 shadow-xs hover:shadow-md transition-shadow space-y-4"
            >
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-accent/15">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-primary">#{ord.orderNumber}</span>
                  <span className="text-xs text-ink-muted">
                    {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-canvas border border-accent/30 text-ink-primary">
                  {ord.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Ordered Sarees List (Image, Name, Variant, Qty, Price) */}
              <div className="divide-y divide-accent/10">
                {ord.items.map((item) => (
                  <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3 sm:gap-4">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-14 h-16 sm:w-16 sm:h-20 object-cover rounded-lg border border-accent/20 shrink-0 bg-canvas"
                      />
                    ) : (
                      <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-lg border border-accent/20 bg-canvas flex items-center justify-center text-accent shrink-0">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-sm sm:text-base font-semibold text-ink-primary line-clamp-1">
                        {item.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink-muted">
                        {item.colorName && <span>Shade: {item.colorName}</span>}
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-canvas border border-accent/20 font-medium text-ink-primary">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-sans font-bold tabular-nums text-xs sm:text-sm text-ink-primary">
                        {formatRupees(item.totalPaise)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Footer: Total, AWB & Direct Delhivery Tracking */}
              {(() => {
                const trackingUrl =
                  ord.shipment?.trackingUrl ||
                  (ord.shipment?.awbNumber && ord.shipment.awbNumber !== 'DIRECT-LINK'
                    ? `https://www.delhivery.com/track/package/${encodeURIComponent(ord.shipment.awbNumber.trim())}`
                    : null);

                return (
                  <div className="pt-3 border-t border-accent/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-ink-muted">
                        {ord.items.reduce((sum, i) => sum + i.quantity, 0)} item(s) • Order Total:{' '}
                        <strong className="text-primary font-sans text-sm sm:text-base font-bold tabular-nums">
                          {formatRupees(ord.totalPaise)}
                        </strong>
                      </p>
                      {ord.shipment?.awbNumber && ord.shipment.awbNumber !== 'DIRECT-LINK' && (
                        <p className="text-xs text-ink-muted flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-accent" />
                          <span>
                            Delhivery AWB: <code className="font-bold text-primary">{ord.shipment.awbNumber}</code>
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {trackingUrl && (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover text-canvas px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-xs font-semibold transition shadow-xs"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Track on Delhivery</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        onClick={() => onTrackOrder(ord.orderNumber)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-primary text-canvas px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-xs font-semibold hover:bg-primary-hover transition shadow-xs active:scale-95"
                      >
                        <span>Order Details</span>
                        <ArrowRight className="w-3.5 h-3.5 text-accent" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
