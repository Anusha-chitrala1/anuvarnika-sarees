import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AnnouncementBar } from './components/AnnouncementBar.js';
import { Navbar } from './components/Navbar.js';
import { CartDrawer } from './components/CartDrawer.js';
import { AuthOtpModal } from './components/AuthOtpModal.js';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal.js';
import { Footer } from './components/Footer.js';
import { LocationPromptModal, SavedLocation } from './components/LocationPromptModal.js';
import { WhatsAppFloat } from './components/WhatsAppFloat.js';
import { MobileBottomNav } from './components/MobileBottomNav.js';
import { VisitorTracker } from './components/VisitorTracker.js';

import { HomeView } from './views/HomeView.js';
import { ShopView } from './views/ShopView.js';
import { ProductDetailView } from './views/ProductDetailView.js';
import { CheckoutView } from './views/CheckoutView.js';
import { OrderTrackingView } from './views/OrderTrackingView.js';
import { MyOrdersView } from './views/MyOrdersView.js';
import { WishlistView } from './views/WishlistView.js';
import { AdminDashboardView } from './views/AdminDashboardView.js';
import { AboutUsView } from './views/AboutUsView.js';
import { ContactUsView } from './views/ContactUsView.js';

import { useThemeStore } from './store/useThemeStore.js';
import { useAuthStore } from './store/useAuthStore.js';
import { api } from './lib/api.js';
import { ProductDTO, CategoryDTO } from '@anuvarnika/shared';

export const App: React.FC = () => {
  const { initTheme } = useThemeStore();
  const { user, isLoading: isAuthLoading, fetchMe, openLoginModal } = useAuthStore();

  const [currentView, setCurrentView] = useState<string>('home');
  const [viewPayload, setViewPayload] = useState<any>({});
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [userLocation, setUserLocation] = useState<SavedLocation | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const loadCatalog = () => {
    Promise.all([api.getProducts(), api.getCategories()])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.products);
        setCategories(catRes.categories);

        // Support direct WhatsApp / shared product links: /?product=<slug>
        const productSlug = new URLSearchParams(window.location.search).get('product');
        if (productSlug) {
          const matched = prodRes.products.find((p) => p.slug === productSlug);
          if (matched) {
            setSelectedProduct(matched);
            setCurrentView('product-detail');
          }
        }
      })
      .catch((err) => console.error('Failed to load catalog:', err));
  };

  const syncRouteFromUrl = () => {
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    const orderMatch = pathname.match(/^\/admin\/orders\/([^/]+)\/?$/);
    if (orderMatch) {
      const deepLinkOrderId = decodeURIComponent(orderMatch[1]);
      const deepLinkAction = params.get('action') || undefined;
      setCurrentView('admin');
      setViewPayload({ deepLinkOrderId, deepLinkAction });
      return;
    }

    if (pathname === '/admin/login') {
      const redirect = params.get('redirect') || '/admin';
      setCurrentView('admin-login');
      setViewPayload({ redirect });
      return;
    }

    if (pathname === '/admin') {
      setCurrentView('admin');
      setViewPayload({});
    }
  };

  // Initialize theme tokens from D1 & fetch auth session on app mount
  useEffect(() => {
    initTheme();
    fetchMe();
    loadCatalog();
    syncRouteFromUrl();

    const onPopState = () => syncRouteFromUrl();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Admin auth guard: redirect logged-out /admin/orders/:orderId?action=verify to /admin/login?redirect=...
  useEffect(() => {
    if (isAuthLoading) return;
    if (currentView === 'admin' && user?.role !== 'admin' && viewPayload.deepLinkOrderId) {
      const currentFull = `${window.location.pathname}${window.location.search}`;
      const loginUrl = `/admin/login?redirect=${encodeURIComponent(currentFull)}`;
      window.history.replaceState({}, '', loginUrl);
      setCurrentView('admin-login');
      setViewPayload({ redirect: currentFull });
    }
  }, [isAuthLoading, currentView, user, viewPayload.deepLinkOrderId]);

  const handleNavigate = (view: string, payload?: any) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view !== 'admin' && view !== 'admin-login' && window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
    setCurrentView(view);
    setViewPayload(payload || {});
  };

  const handleSelectProduct = (product: ProductDTO) => {
    setSelectedProduct(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentView('product-detail');
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink-primary transition-colors">
      {/* Top Announcement Bar */}
      <AnnouncementBar />

      {/* Main Navbar */}
      <Navbar
        onNavigate={handleNavigate}
        currentView={currentView}
        locationLabel={userLocation?.pincode || 'Check PIN'}
        onOpenLocation={() => setIsLocationModalOpen(true)}
      />

      {/* Main View Area with Smooth Page Transitions */}
      <main className="flex-1 pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentView}-${selectedProduct?.id || ''}-${viewPayload.orderNumber || ''}`}
            initial={{ opacity: 0, y: 12, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.995 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentView === 'home' && (
              <HomeView
                categories={categories}
                products={products}
                visitorCount={visitorCount}
                onSelectProduct={handleSelectProduct}
                onNavigate={handleNavigate}
              />
            )}

            {currentView === 'shop' && (
              <ShopView
                products={products}
                categories={categories}
                initialCategory={viewPayload.category}
                initialSearch={viewPayload.search}
                initialLayoutMode={viewPayload.layoutMode || 'grid'}
                onSelectProduct={handleSelectProduct}
              />
            )}

            {currentView === 'product-detail' && selectedProduct && (
              <ProductDetailView
                product={selectedProduct}
                onBack={() => handleNavigate('shop')}
                onProceedToCheckout={() => handleNavigate('checkout')}
              />
            )}

            {currentView === 'checkout' && (
              <CheckoutView
                onOrderCompleted={(orderNumber) => handleNavigate('tracking', { orderNumber })}
                onBackToShop={() => handleNavigate('shop')}
              />
            )}

            {currentView === 'tracking' && (
              <OrderTrackingView
                orderNumber={viewPayload.orderNumber || ''}
                onBack={() => handleNavigate('orders')}
              />
            )}

            {currentView === 'orders' && (
              <MyOrdersView
                onTrackOrder={(orderNumber) => handleNavigate('tracking', { orderNumber })}
                onExplore={() => handleNavigate('shop')}
              />
            )}

            {currentView === 'wishlist' && (
              <WishlistView
                products={products}
                onSelectProduct={handleSelectProduct}
                onExplore={() => handleNavigate('shop')}
              />
            )}

            {currentView === 'about' && (
              <AboutUsView
                onExplore={() => handleNavigate('shop')}
                onContact={() => handleNavigate('contact')}
              />
            )}

            {currentView === 'contact' && <ContactUsView />}

            {currentView === 'admin-login' && (
              user?.role === 'admin' ? (
                <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
                  <p className="text-xs text-ink-muted">Redirecting to order verification...</p>
                </div>
              ) : (
                <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
                  <h2 className="font-serif text-2xl font-semibold text-primary">Owner Sign In Required</h2>
                  <p className="text-xs text-ink-muted">
                    Sign in with your authorized store owner email (<code className="font-bold">anuvarnika.sarees@gmail.com</code>) to open and verify this order.
                  </p>
                  <button
                    onClick={() =>
                      openLoginModal(() => {
                        const target = viewPayload.redirect || '/admin';
                        window.history.replaceState({}, '', target);
                        syncRouteFromUrl();
                      })
                    }
                    className="bg-primary text-canvas px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-hover shadow"
                  >
                    Sign In with Owner OTP
                  </button>
                </div>
              )
            )}

            {currentView === 'admin' && (
              user?.role === 'admin' ? (
                <AdminDashboardView
                  onSelectProduct={handleSelectProduct}
                  onCatalogChanged={loadCatalog}
                  deepLinkOrderId={viewPayload.deepLinkOrderId}
                  deepLinkAction={viewPayload.deepLinkAction}
                />
              ) : (
                <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
                  <h2 className="font-serif text-2xl font-semibold text-primary">Admin Sign In Required</h2>
                  <button
                    onClick={() => openLoginModal(() => handleNavigate('admin', viewPayload))}
                    className="bg-primary text-canvas px-6 py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-hover shadow"
                  >
                    Sign In with Admin OTP
                  </button>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} visitorCount={visitorCount} />

      {/* Atomic Visitor Tracker (max 1 call per 30-minute session) */}
      <VisitorTracker onVisitorCount={setVisitorCount} />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav currentView={currentView} onNavigate={handleNavigate} />

      {/* Global Modals, Drawers & Floating WhatsApp */}
      <CartDrawer onProceedToCheckout={() => handleNavigate('checkout')} />
      <AuthOtpModal />
      <ThemeCustomizerModal />
      <LocationPromptModal
        isOpenExternal={isLocationModalOpen}
        onCloseExternal={() => setIsLocationModalOpen(false)}
        onLocationSelected={(loc) => setUserLocation(loc)}
      />
      <WhatsAppFloat />
    </div>
  );
};
