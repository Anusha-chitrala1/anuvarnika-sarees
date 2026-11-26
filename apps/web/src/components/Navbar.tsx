import React, { useState } from 'react';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  Sliders,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore.js';
import { useCartStore } from '../store/useCartStore.js';
import { useWishlistStore } from '../store/useWishlistStore.js';
import { useThemeStore } from '../store/useThemeStore.js';

const AUTHORIZED_THEME_ADMIN_EMAIL = 'anuvarnika.sarees@gmail.com';

interface NavbarProps {
  onNavigate: (view: string, payload?: any) => void;
  currentView: string;
  locationLabel?: string;
  onOpenLocation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  currentView,
  locationLabel,
  onOpenLocation,
}) => {
  const { user, openLoginModal, logout } = useAuthStore();
  const { items, openDrawer } = useCartStore();
  const { wishlistIds } = useWishlistStore();
  const { toggleCustomizer } = useThemeStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const canCustomizeTheme =
    user?.role === 'admin' &&
    user?.email?.toLowerCase() === AUTHORIZED_THEME_ADMIN_EMAIL;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('shop', { search: searchQuery.trim() });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-accent/20 shadow-[0_2px_20px_rgba(43,30,26,0.04)] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16 sm:h-20">
          {/* Left: Mobile Secondary Menu + Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 -ml-1 text-ink-primary hover:text-primary transition shrink-0"
              aria-label="More pages and search"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0"
            >
              <img
                src="/logo.jpeg"
                alt="AnuVarnika Sarees Logo"
                className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover border-2 border-accent/40 shadow-sm group-hover:scale-105 transition-transform shrink-0"
              />
              <span className="font-serif text-xl sm:text-2xl font-semibold tracking-wide text-primary whitespace-nowrap">
                AnuVarnika
              </span>
            </div>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav aria-label="Primary" className="hidden md:flex items-center space-x-6 xl:space-x-8 font-medium text-sm text-ink-primary shrink-0">
            {[
              { id: 'home', label: 'Home' },
              { id: 'shop', label: 'Sarees' },
              { id: 'about', label: 'About Us' },
              { id: 'contact', label: 'Contact Us' },
            ].map((nav) => {
              const active = currentView === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => onNavigate(nav.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-1.5 whitespace-nowrap hover:text-primary transition ${
                    active ? 'text-primary font-semibold' : ''
                  }`}
                >
                  {nav.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active-underline"
                      className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onOpenLocation && (
              <button
                onClick={onOpenLocation}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-canvas/80 border border-accent/30 text-[11px] sm:text-xs font-medium text-ink-primary hover:border-primary transition whitespace-nowrap"
                title="Check delivery PIN code"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{locationLabel || 'Check PIN'}</span>
              </button>
            )}

            {/* Search Input (Desktop XL) */}
            <form onSubmit={handleSearchSubmit} className="hidden xl:flex items-center relative">
              <input
                type="text"
                placeholder="Search sarees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 2xl:w-48 pl-8 pr-3 py-1.5 text-xs rounded-full bg-canvas border border-accent/30 focus:outline-none focus:border-primary text-ink-primary transition-all"
              />
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-2.5 pointer-events-none" />
            </form>

            {/* Wishlist (Desktop — mobile uses Bottom Nav) */}
            <button
              onClick={() => onNavigate('wishlist')}
              className="hidden md:inline-flex p-2 text-ink-primary hover:text-primary relative transition active:scale-95"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistIds.length > 0 && (
                <motion.span
                  key={wishlistIds.length}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0.5 right-0.5 bg-secondary text-canvas text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
                >
                  {wishlistIds.length}
                </motion.span>
              )}
            </button>

            {/* Shopping Bag (Desktop — mobile uses Bottom Nav) */}
            <button
              onClick={openDrawer}
              className="hidden md:inline-flex p-2 text-ink-primary hover:text-primary relative transition active:scale-95"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [1.25, 1] }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="absolute top-0.5 right-0.5 bg-primary text-canvas text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Auth / Account */}
            {user ? (
              <div className="flex items-center gap-1">
                {user.role === 'admin' ? (
                  <button
                    onClick={() => onNavigate('admin')}
                    className="flex items-center gap-1 bg-primary text-canvas text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-primary-hover shadow-sm transition active:scale-95"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                    <span className="hidden sm:inline">Admin Hub</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('orders')}
                    className="hidden md:flex items-center gap-1 text-xs text-ink-primary hover:text-primary font-medium px-2.5 py-1.5 rounded-full hover:bg-canvas transition"
                  >
                    <User className="w-4 h-4" />
                    <span>My Orders</span>
                  </button>
                )}
                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="p-1.5 text-ink-muted hover:text-primary transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openLoginModal()}
                className="hidden md:flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/40 px-3.5 py-1.5 rounded-full hover:bg-primary hover:text-canvas transition shadow-xs active:scale-95"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}

            {/* Theme Studio Button — Visible ONLY for anuvarnika.sarees@gmail.com */}
            {canCustomizeTheme && (
              <button
                onClick={toggleCustomizer}
                className="p-1.5 sm:p-2 text-accent hover:text-primary transition active:scale-95"
                title="Open Live Theme Customizer"
                aria-label="Open Live Theme Customizer"
              >
                <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Secondary Menu Drawer (Search + About Us + Contact Us) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="md:hidden overflow-hidden bg-surface border-t border-accent/20 shadow-lg"
          >
            <div className="px-4 py-4 space-y-3">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search sarees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary"
                />
                <Search className="w-4 h-4 text-ink-muted absolute left-3 top-3 pointer-events-none" />
              </form>

              <div className="grid grid-cols-2 gap-2 font-medium text-ink-primary">
                <button
                  onClick={() => {
                    onNavigate('about');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-sm border transition ${
                    currentView === 'about'
                      ? 'bg-primary text-canvas border-primary font-semibold'
                      : 'bg-canvas/60 border-accent/20 hover:border-primary'
                  }`}
                >
                  About Us
                </button>
                <button
                  onClick={() => {
                    onNavigate('contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-sm border transition ${
                    currentView === 'contact'
                      ? 'bg-primary text-canvas border-primary font-semibold'
                      : 'bg-canvas/60 border-accent/20 hover:border-primary'
                  }`}
                >
                  Contact Us
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
