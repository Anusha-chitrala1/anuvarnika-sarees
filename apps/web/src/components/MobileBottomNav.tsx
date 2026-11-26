import React from 'react';
import { Home, Sparkles, Heart, ShoppingBag, User, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore.js';
import { useCartStore } from '../store/useCartStore.js';
import { useWishlistStore } from '../store/useWishlistStore.js';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string, payload?: any) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
}) => {
  const { user, openLoginModal } = useAuthStore();
  const { items, openDrawer, isDrawerOpen } = useCartStore();
  const { wishlistIds } = useWishlistStore();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleAccountTap = () => {
    if (!user) {
      openLoginModal();
      return;
    }
    onNavigate(user.role === 'admin' ? 'admin' : 'orders');
  };

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      active: currentView === 'home' && !isDrawerOpen,
      onClick: () => onNavigate('home'),
    },
    {
      id: 'shop',
      label: 'Sarees',
      icon: <Sparkles className="w-5 h-5" />,
      active: (currentView === 'shop' || currentView === 'product-detail') && !isDrawerOpen,
      onClick: () => onNavigate('shop'),
    },
    {
      id: 'wishlist',
      label: 'Saved',
      icon: <Heart className="w-5 h-5" />,
      badge: wishlistIds.length,
      active: currentView === 'wishlist' && !isDrawerOpen,
      onClick: () => onNavigate('wishlist'),
    },
    {
      id: 'bag',
      label: 'Bag',
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: cartCount,
      active: isDrawerOpen,
      onClick: () => openDrawer(),
    },
    {
      id: 'account',
      label: user?.role === 'admin' ? 'Admin' : user ? 'Orders' : 'Sign In',
      icon: user?.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />,
      active: (currentView === 'orders' || currentView === 'admin' || currentView === 'tracking') && !isDrawerOpen,
      onClick: handleAccountTap,
    },
  ];

  // Don't render bottom nav when cart drawer is active to prevent overlapping
  if (isDrawerOpen) return null;

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/98 backdrop-blur-xl border-t border-accent/20 shadow-[0_-4px_24px_rgba(43,30,26,0.08)] px-2 pt-1.5"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="grid grid-cols-5 gap-1 items-center max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            aria-current={tab.active ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] select-none ${
              tab.active
                ? 'bg-primary text-canvas shadow-xs font-bold'
                : 'text-ink-muted hover:text-primary active:scale-95'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center">
              {tab.icon}
              {tab.badge && tab.badge > 0 ? (
                <span
                  className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs ${
                    tab.active
                      ? 'bg-accent text-canvas'
                      : 'bg-primary text-canvas'
                  }`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </span>

            <span className="relative z-10 text-[10px] tracking-tight mt-0.5 leading-none">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
