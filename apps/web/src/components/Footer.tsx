import React, { useEffect, useState } from 'react';
import { Award, ShieldCheck, Truck, RefreshCw, Mail, Heart, Instagram } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppFloat.js';
import { useThemeStore } from '../store/useThemeStore.js';
import { api } from '../lib/api.js';

interface FooterProps {
  onNavigate?: (view: string) => void;
  visitorCount?: number | null;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, visitorCount: propVisitorCount }) => {
  const { theme } = useThemeStore();
  const [fetchedCount, setFetchedCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof propVisitorCount === 'number') return;
    api
      .getVisitorCount()
      .then((res) => setFetchedCount(res.totalVisitors))
      .catch(() => {});
  }, [propVisitorCount]);

  const totalVisitors = typeof propVisitorCount === 'number' ? propVisitorCount : fetchedCount;
  const showVisitorCounter = theme.showVisitorCounter !== false;
  return (
    <footer className="bg-canvas border-t border-accent/20 text-ink-primary pt-14 pb-28 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top 4 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-accent/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-serif text-base font-semibold text-primary">Pure Silk Quality</h4>
              <p className="text-xs text-ink-muted leading-relaxed font-light">
                Every saree is carefully selected for rich texture, authentic zari, and graceful drape.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-serif text-base font-semibold text-primary">Direct UPI Checkout</h4>
              <p className="text-xs text-ink-muted leading-relaxed font-light">
                Zero payment gateway surcharges with fast manual bank verification.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-serif text-base font-semibold text-primary">AP & Telangana Delivery</h4>
              <p className="text-xs text-ink-muted leading-relaxed font-light">
                Insured Delhivery shipping across Andhra Pradesh & Telangana with tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-serif text-base font-semibold text-primary">Dedicated Support</h4>
              <p className="text-xs text-ink-muted leading-relaxed font-light">
                Direct WhatsApp & email assistance for colour checks, styling, and orders.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-10">
          {/* Brand Bio & Socials */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpeg"
                alt="AnuVarnika Sarees"
                className="w-10 h-10 rounded-full object-cover border border-accent/40"
              />
              <span className="font-serif text-2xl font-bold text-primary">AnuVarnika</span>
            </div>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-light max-w-md">
              AnuVarnika Sarees brings beautiful, everyday and festive sarees directly to shoppers across Andhra Pradesh & Telangana.
            </p>
            <div className="text-xs sm:text-sm text-ink-muted space-y-2">
              <a
                href="mailto:anuvarnika.sarees@gmail.com"
                className="flex items-center gap-2 hover:text-primary transition"
              >
                <Mail className="w-4 h-4 text-accent" />
                <span>anuvarnika.sarees@gmail.com</span>
              </a>
              <a
                href="https://wa.me/917013622760"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-primary transition"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp: +91 70136 22760</span>
              </a>
              <a
                href="https://www.instagram.com/anuvarnika_sarees/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-primary transition"
              >
                <Instagram className="w-4 h-4 text-primary" />
                <span>Instagram: @anuvarnika_sarees</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3 text-sm">
            <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-primary">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-ink-muted">
              {[
                { id: 'home', label: 'Home' },
                { id: 'shop', label: 'Sarees' },
                { id: 'about', label: 'About Us' },
                { id: 'contact', label: 'Contact Us' },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => onNavigate?.(link.id)}
                    className="hover:text-primary transition"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Silk Care */}
          <div className="md:col-span-4 space-y-3 text-xs">
            <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-primary">
              Heirloom Silk Care
            </h4>
            <div className="p-4 rounded-xl bg-surface border border-accent/20 space-y-2 text-xs text-ink-muted leading-relaxed">
              <p>
                <strong>Storage:</strong> Always roll pure silk sarees or fold gently wrapped in unbleached white muslin. Never store in plastic pouches.
              </p>
              <p>
                <strong>Maintenance:</strong> Dry clean only. Periodically unfold and change creases once every 4 months to prevent zari friction.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-accent/15 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-4">
          <p>© 2026 AnuVarnika Sarees. All rights reserved.</p>

          {showVisitorCounter && typeof totalVisitors === 'number' && (
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-accent/30 text-primary shadow-sm"
              aria-label="Storefront visitor counter"
            >
              <span className="text-accent text-[11px]">✦</span>
              <span className="font-semibold tracking-wide">
                {new Intl.NumberFormat('en-IN').format(totalVisitors)} Saree Lovers Visited
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 text-xs">
            <span>Curated with devotion in India</span>
            <Heart className="w-3.5 h-3.5 text-secondary fill-current" />
          </div>
        </div>
      </div>
    </footer>
  );
};
