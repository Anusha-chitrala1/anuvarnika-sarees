import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Award, Truck, ShieldCheck, ArrowRight } from 'lucide-react';

interface AboutUsViewProps {
  onExplore: () => void;
  onContact: () => void;
}

export const AboutUsView: React.FC<AboutUsViewProps> = ({ onExplore, onContact }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Our Story</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-primary leading-tight">
          Celebrating Timeless Indian Silk Sarees
        </h1>
        <p className="text-base text-ink-muted leading-relaxed font-light">
          AnuVarnika Sarees was founded with a simple promise: to bring authentic, graceful silk sarees directly to women who cherish timeless elegance, rich weaves, and honest pricing.
        </p>
      </motion.div>

      {/* Brand Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: <Award className="w-6 h-6 text-primary" />,
            title: 'Curated Quality',
            desc: 'Every saree is personally inspected for fabric richness, zari finish, colour depth, and comfortable drape before reaching your wardrobe.',
          },
          {
            icon: <ShieldCheck className="w-6 h-6 text-primary" />,
            title: 'Zero Hidden Fees',
            desc: 'We accept direct UPI payments with zero payment gateway markups, passing complete value directly to you.',
          },
          {
            icon: <Truck className="w-6 h-6 text-primary" />,
            title: 'Andhra Pradesh & Telangana',
            desc: 'Currently delivering across Andhra Pradesh and Telangana with insured, carefully packed Delhivery dispatch.',
          },
        ].map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl bg-surface border border-accent/25 shadow-xs space-y-3"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {item.icon}
            </div>
            <h3 className="font-serif text-xl font-semibold text-primary">{item.title}</h3>
            <p className="text-sm text-ink-muted leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* CTA Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl bg-gradient-to-r from-primary via-[#8A2923] to-primary text-canvas p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-accent/40"
      >
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold">
            Ready to find your next celebration drape?
          </h2>
          <p className="text-sm text-canvas/85 font-light">
            Explore our latest arrivals or reach out on WhatsApp for personal styling help.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-canvas px-6 py-3 rounded-full text-sm font-semibold transition shadow"
          >
            <span>Explore Sarees</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onContact}
            className="inline-flex items-center gap-2 bg-surface/15 hover:bg-surface/25 text-canvas border border-canvas/30 px-6 py-3 rounded-full text-sm font-semibold transition"
          >
            <span>Contact Us</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
