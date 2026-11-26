import React from 'react';
import { ArrowRight, Sparkles, Shield, Award, Truck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedVisitorCounter } from './AnimatedVisitorCounter.js';

interface HeroBannerProps {
  onExplore: () => void;
  onAbout?: () => void;
  visitorCount?: number | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExplore, onAbout, visitorCount }) => {
  return (
    <section className="relative overflow-hidden bg-canvas py-10 sm:py-16 lg:py-24 border-b border-accent/20">
      {/* Ambient Luxury Backdrop Glows (Compositor-only transforms/opacity) */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-24 -right-24 w-80 sm:w-[32rem] h-80 sm:h-[32rem] bg-accent/20 rounded-full blur-3xl -z-10 pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        className="absolute -bottom-28 -left-24 w-72 sm:w-[28rem] h-72 sm:h-[28rem] bg-primary/15 rounded-full blur-3xl -z-10 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Editorial Content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Badges row with live visitor counter */}
            <div className="flex flex-wrap items-center gap-2.5">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/90 border border-accent/35 text-accent text-[11px] sm:text-xs font-semibold tracking-widest uppercase shadow-xs hover:border-accent transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Festive 2026 Collection</span>
              </motion.div>

              {/* Prominent Live Visitor Counter Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <AnimatedVisitorCounter variant="hero-badge" initialCount={visitorCount} />
              </motion.div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.12] text-ink-primary tracking-tight"
            >
              Graceful Sarees,{' '}
              <span className="text-primary italic font-normal relative inline-block">
                Curated
                <span className="absolute bottom-1 left-0 right-0 h-1.5 bg-accent/25 -z-10 rounded-full" />
              </span>{' '}
              for Every Occasion.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-ink-muted text-sm sm:text-lg leading-relaxed max-w-2xl font-light"
            >
              Discover comfortable everyday cottons, lightweight georgettes, and festive drapes crafted for effortless elegance. Each AnuVarnika saree brings timeless charm to daily wear, festivals, and special gatherings.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1"
            >
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: '0 12px 30px -8px rgba(122,35,30,0.35)' }}
                whileTap={{ scale: 0.97 }}
                onClick={onExplore}
                className="group inline-flex items-center justify-center gap-2.5 bg-primary text-canvas px-8 py-4 rounded-full text-sm font-semibold tracking-wide hover:bg-primary-hover shadow-lg transition-all"
              >
                <span>Explore Sarees</span>
                <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {onAbout && (
                <motion.button
                  whileHover={{ scale: 1.03, backgroundColor: 'var(--surface-card)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onAbout}
                  className="inline-flex items-center justify-center gap-2 bg-surface/90 hover:bg-surface text-ink-primary border border-accent/35 px-7 py-4 rounded-full text-sm font-semibold transition-all shadow-xs hover:border-accent"
                >
                  <span>Our Story</span>
                </motion.button>
              )}
            </motion.div>

            {/* Verified Store Pillars */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 border-t border-accent/20"
            >
              <div className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-ink-primary">100% Pure Quality</span>
              </div>
              <div className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-ink-primary">Zero-Fee Direct UPI</span>
              </div>
              <div className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-ink-primary">Tracked Courier Dispatch</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none">
              <div className="absolute -inset-2.5 sm:-inset-3.5 rounded-3xl border border-accent/45 transform rotate-2 pointer-events-none transition-transform duration-500 group-hover:rotate-3" />

              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-surface border border-accent/30 aspect-[4/5] group silk-shimmer-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85"
                  alt="AnuVarnika Signature Crimson Silk Saree"
                  className="w-full h-full object-cover object-top group-hover:scale-108 transition-transform duration-700 ease-out"
                />

                {/* Ambient vignette shadow for text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

                {/* High-Contrast Floating Glass Card with Glow */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 p-4 rounded-xl bg-surface/95 backdrop-blur-md border border-accent/40 shadow-xl transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(168,121,62,0.3)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-accent block">
                      Signature Collection
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock
                    </span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-semibold text-primary truncate mt-0.5">
                    Royal Crimson Zari Silk
                  </h3>
                  <p className="text-xs text-ink-muted truncate mt-0.5">
                    Pure Mulberry Silk • Festive Edition
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
