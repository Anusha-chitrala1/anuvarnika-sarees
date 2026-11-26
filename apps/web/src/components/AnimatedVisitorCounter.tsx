import React, { useEffect, useState, useRef } from 'react';
import { Users, Eye, Sparkles } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { api } from '../lib/api.js';

interface AnimatedVisitorCounterProps {
  initialCount?: number | null;
  variant?: 'hero-badge' | 'prominent-banner' | 'compact';
  className?: string;
}

export const AnimatedVisitorCounter: React.FC<AnimatedVisitorCounterProps> = ({
  initialCount,
  variant = 'prominent-banner',
  className = '',
}) => {
  const [targetCount, setTargetCount] = useState<number>(initialCount ?? 1280);
  const [displayCount, setDisplayCount] = useState<number>(0);
  const [hasFetched, setHasFetched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-20px' });
  const prefersReducedMotion = useReducedMotion();

  // Fetch real persistent visitor count from Cloudflare D1
  useEffect(() => {
    if (typeof initialCount === 'number' && initialCount > 0) {
      setTargetCount(initialCount);
      return;
    }

    let isMounted = true;
    api
      .getVisitorCount()
      .then((res) => {
        if (isMounted && typeof res.totalVisitors === 'number' && res.totalVisitors > 0) {
          setTargetCount(res.totalVisitors);
          setHasFetched(true);
        }
      })
      .catch(() => {
        // Fallback default if offline/network hiccup
      });

    return () => {
      isMounted = false;
    };
  }, [initialCount]);

  // Smooth CountUp animation using requestAnimationFrame and exponential ease-out
  useEffect(() => {
    if (!isInView && !hasFetched) return;

    if (prefersReducedMotion) {
      setDisplayCount(targetCount);
      return;
    }

    const duration = 1800; // ms
    const startTime = performance.now();
    const startValue = Math.max(0, Math.floor(targetCount * 0.4)); // start from ~40% for natural countup

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic: 1 - pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (targetCount - startValue) * easeProgress);

      setDisplayCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayCount(targetCount);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, targetCount, hasFetched, prefersReducedMotion]);

  const formattedCount = new Intl.NumberFormat('en-IN').format(displayCount);

  if (variant === 'hero-badge') {
    return (
      <div
        ref={containerRef}
        className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface/95 backdrop-blur-md border border-accent/40 shadow-[0_4px_20px_rgba(168,121,62,0.18)] hover:border-accent hover:shadow-[0_6px_28px_rgba(168,121,62,0.28)] transition-all duration-300 group ${className}`}
      >
        {/* Pulsing Live Beacon */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
        </span>

        <Eye className="w-3.5 h-3.5 text-accent group-hover:scale-110 transition-transform" />

        <div className="flex items-baseline gap-1.5 text-xs">
          <span className="font-sans font-bold tabular-nums text-primary text-sm sm:text-base tracking-tight">
            {formattedCount}
          </span>
          <span className="text-ink-muted text-[11px] sm:text-xs font-medium">
            Saree Lovers Welcomed
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        ref={containerRef}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-accent/30 text-primary text-xs shadow-xs ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="font-bold tabular-nums font-sans">{formattedCount}</span>
        <span className="text-ink-muted text-[11px]">Visited</span>
      </div>
    );
  }

  // Variant: prominent-banner
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-surface via-[#FFF9F2] to-surface border border-accent/35 shadow-[0_10px_30px_rgba(122,35,30,0.06)] p-5 sm:p-7 transition-all duration-300 hover:shadow-[0_14px_40px_rgba(168,121,62,0.15)] hover:border-accent/60 ${className}`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-44 h-44 bg-accent/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-44 h-44 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left Side: Live Badge & Heading */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Storefront Metric
              </span>
              <span className="text-[11px] text-accent font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Real-Time Traffic
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-semibold text-primary">
              Trusted by Saree Lovers Across India
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted font-light mt-0.5">
              Verified customer sessions tracked atomically in real-time.
            </p>
          </div>
        </div>

        {/* Right Side: Big Animated Metric Counter */}
        <div className="flex items-center gap-4 bg-canvas/70 border border-accent/30 rounded-2xl px-5 py-3 self-start md:self-auto shadow-inner">
          <div className="text-right">
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={displayCount}
                initial={{ opacity: 0.8, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-primary tabular-nums drop-shadow-xs"
              >
                {formattedCount}
              </motion.span>
              <span className="text-accent text-xl font-bold font-serif">+</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">
              Total Website Visits
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
