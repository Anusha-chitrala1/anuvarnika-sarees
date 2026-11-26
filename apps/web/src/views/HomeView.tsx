import React, { useState } from 'react';
import { HeroBanner } from '../components/HeroBanner.js';
import { ProductCard } from '../components/ProductCard.js';
import { AnimatedVisitorCounter } from '../components/AnimatedVisitorCounter.js';
import { ProductDTO, CategoryDTO } from '@anuvarnika/shared';
import { ArrowRight, Sparkles, Star, Instagram, ExternalLink, Copy, Check, ShieldCheck, Clock, Truck, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface HomeViewProps {
  categories?: CategoryDTO[];
  products: ProductDTO[];
  visitorCount?: number | null;
  onSelectProduct: (product: ProductDTO) => void;
  onNavigate: (view: string, payload?: any) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  visitorCount,
  onSelectProduct,
  onNavigate,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const featuredSarees = products
    .filter((p) => p.isPinned || p.isFeatured)
    .slice(0, 6);

  const newArrivals = products
    .filter((p) => p.isNewArrival)
    .slice(0, 4);

  const reelSarees = products
    .filter((p) => Boolean(p.instagramUrl))
    .slice(0, 4);

  const handleCopyPromo = () => {
    navigator.clipboard.writeText('FESTIVE10');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section with Live Visitor Counter */}
      <HeroBanner
        onExplore={() => onNavigate('shop')}
        onAbout={() => onNavigate('about')}
        visitorCount={visitorCount}
      />

      {/* 2. Prominent Live Website Visitor Counter & Trust Milestone Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatedVisitorCounter initialCount={visitorCount} variant="prominent-banner" />
        </motion.div>
      </section>

      {/* 3. Luxury Shopping Experience Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: <Clock className="w-5 h-5 text-primary" />,
              title: '15-Minute Checkout Hold',
              desc: 'When you start checkout, your selected saree is reserved exclusively for you for 15 minutes.',
            },
            {
              icon: <ShieldCheck className="w-5 h-5 text-primary" />,
              title: 'Direct UPI & Bank Verification',
              desc: 'Pay zero payment gateway fees via UPI QR and submit your 12-digit UTR for quick confirmation.',
            },
            {
              icon: <Truck className="w-5 h-5 text-primary" />,
              title: 'Live Order & Courier Tracking',
              desc: 'Follow your saree from payment approval to Delhivery dispatch with direct tracking links.',
            },
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, boxShadow: '0 12px 30px -10px rgba(122,35,30,0.12)' }}
              className="p-6 rounded-2xl bg-surface border border-accent/25 shadow-xs hover:border-accent/60 transition-all flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-primary">{item.title}</h3>
                <p className="text-xs sm:text-sm text-ink-muted mt-1 leading-relaxed font-light">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Featured & Pinned Masterpieces — hidden when there are no products */}
      {featuredSarees.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-accent mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Handpicked Selection</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">
                Featured Sarees
              </h2>
            </div>
            <button
              onClick={() => onNavigate('shop')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition self-start sm:self-auto"
            >
              <span>View All Sarees</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featuredSarees.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.06, 0.25) }}
              >
                <ProductCard
                  product={product}
                  onSelect={onSelectProduct}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Festive Offer Highlight Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          className="rounded-3xl bg-gradient-to-br from-primary via-[#8A2923] to-[#5E1A16] text-canvas p-7 sm:p-12 relative overflow-hidden shadow-xl border border-accent/40"
        >
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block bg-canvas/15 text-accent font-semibold text-xs uppercase tracking-widest px-3.5 py-1 rounded-full border border-accent/30">
              Exclusive Festive Savings
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-canvas">
              Enjoy 10% Instant Savings with Code FESTIVE10
            </h3>
            <p className="text-xs sm:text-sm text-canvas/85 font-light leading-relaxed">
              Apply code FESTIVE10 in your bag for 10% off up to ₹1,500 on orders above ₹3,000, with complimentary insured courier shipping above ₹2,999.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('shop')}
                className="bg-accent hover:bg-accent-hover text-canvas px-6 py-3 rounded-full text-xs font-bold tracking-wider uppercase transition shadow-md active:scale-95"
              >
                Shop Sarees
              </button>
              <button
                type="button"
                onClick={handleCopyPromo}
                className="inline-flex items-center gap-2 font-mono text-sm tracking-widest bg-canvas/15 hover:bg-canvas/25 px-4 py-2.5 rounded-full border border-canvas/25 transition"
              >
                <span>FESTIVE10</span>
                {copiedCode ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-accent" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 5. New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-accent">
                Latest Additions
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">
                New Arrivals
              </h2>
            </div>
            <button
              onClick={() => onNavigate('shop', { sort: 'newest' })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition"
            >
              <span>Explore All New</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. As Seen on Instagram (Shop the Reel) — shown only when sarees have Instagram links */}
      {reelSarees.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-accent mb-1">
                <Instagram className="w-3.5 h-3.5 text-primary" />
                <span>@anuvarnika_sarees</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">
                As Seen on Instagram
              </h2>
            </div>
            <a
              href="https://www.instagram.com/anuvarnika_sarees/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>Follow @anuvarnika_sarees</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reelSarees.map((saree) => (
              <div
                key={saree.id}
                onClick={() => onSelectProduct(saree)}
                className="group cursor-pointer rounded-2xl bg-surface border border-accent/25 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col"
              >
                <div className="relative aspect-[3/4] bg-canvas overflow-hidden">
                  <img
                    src={saree.images?.[0]?.imageUrl || ''}
                    alt={saree.title}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur text-primary text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <Instagram className="w-3 h-3" />
                    <span>Watch Reel</span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                  <h4 className="font-serif text-base font-semibold text-ink-primary line-clamp-1 group-hover:text-primary">
                    {saree.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-accent/15">
                    <span className="font-semibold text-primary">Shop This Saree →</span>
                    <a
                      href={saree.instagramUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-accent hover:underline font-medium"
                    >
                      Reel ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Verified Customer Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs uppercase font-bold tracking-widest text-accent">
            Verified Experiences
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">
            Loved by Our Customers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: '"Heirloom quality pure silk"',
              quote:
                'Purchased the Crimson Korvai Kanjeevaram for my daughter’s wedding. The weight, fall, and zari shimmered beautifully under ceremony lights.',
              author: 'Meenakshi S.',
              tag: 'Verified Buyer',
            },
            {
              title: '"Seamless Direct UPI & Tracking"',
              quote:
                'Submitting the UTR was effortless, and I received my confirmation email along with live Delhivery tracking updates shortly after.',
              author: 'Dr. Radhika S.',
              tag: 'Verified Buyer',
            },
            {
              title: '"Graceful drape and generous blouse"',
              quote:
                'The Chanderi saree felt featherlight yet wonderfully regal for our anniversary dinner. The matching blouse piece included was generous in length.',
              author: 'Ananya D.',
              tag: 'Verified Buyer',
            },
          ].map((rev, idx) => (
            <motion.div
              key={rev.author}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="bg-surface p-6 rounded-2xl border border-accent/20 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-accent">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <h4 className="font-serif text-base font-semibold text-ink-primary">
                  {rev.title}
                </h4>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-light">
                  {rev.quote}
                </p>
              </div>
              <div className="pt-3 flex items-center justify-between text-xs text-ink-muted border-t border-accent/15">
                <span className="font-semibold text-ink-primary">{rev.author}</span>
                <span className="text-emerald-700 font-medium">{rev.tag}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
