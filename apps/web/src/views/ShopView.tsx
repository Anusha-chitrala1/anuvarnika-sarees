import React, { useState, useMemo, useEffect } from 'react';
import { ProductDTO, CategoryDTO } from '@anuvarnika/shared';
import { ProductCard } from '../components/ProductCard.js';
import { RotateCcw, Sparkles, Tag, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';

interface PriceBracket {
  id: string;
  label: string;
  minPaise: number;
  maxPaise: number | null;
}

const PRICE_BRACKETS: PriceBracket[] = [
  { id: 'all', label: 'All Prices', minPaise: 0, maxPaise: null },
  { id: '0-1k', label: '₹0 – ₹1,000', minPaise: 0, maxPaise: 100000 },
  { id: '1k-2k', label: '₹1,000 – ₹2,000', minPaise: 100000, maxPaise: 200000 },
  { id: '2k-5k', label: '₹2,000 – ₹5,000', minPaise: 200000, maxPaise: 500000 },
  { id: '5k-10k', label: '₹5,000 – ₹10,000', minPaise: 500000, maxPaise: 1000000 },
  { id: '10k+', label: '₹10,000+', minPaise: 1000000, maxPaise: null },
];

interface ShopViewProps {
  products: ProductDTO[];
  categories?: CategoryDTO[];
  initialCategory?: string;
  initialSearch?: string;
  initialLayoutMode?: 'grid' | 'row';
  onSelectProduct: (product: ProductDTO) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  products,
  initialSearch,
  initialLayoutMode = 'grid',
  onSelectProduct,
}) => {
  const [selectedPriceId, setSelectedPriceId] = useState<string>('all');
  const [newArrivalsOnly, setNewArrivalsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [search, setSearch] = useState<string>(initialSearch || '');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'row'>(initialLayoutMode);

  useEffect(() => {
    setLayoutMode(initialLayoutMode);
  }, [initialLayoutMode]);

  const activeBracket = useMemo(
    () => PRICE_BRACKETS.find((b) => b.id === selectedPriceId) || PRICE_BRACKETS[0],
    [selectedPriceId]
  );

  // Client filtering & sorting (Price bracket + New Arrivals)
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (newArrivalsOnly && !p.isNewArrival) {
          return false;
        }
        if (p.basePricePaise < activeBracket.minPaise) {
          return false;
        }
        if (activeBracket.maxPaise !== null && p.basePricePaise > activeBracket.maxPaise) {
          return false;
        }
        if (search) {
          const q = search.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return a.displayOrder - b.displayOrder;
        }
        if (sortBy === 'price_asc') return a.basePricePaise - b.basePricePaise;
        if (sortBy === 'price_desc') return b.basePricePaise - a.basePricePaise;
        if (sortBy === 'newest') return b.createdAt - a.createdAt;
        return 0;
      });
  }, [products, newArrivalsOnly, activeBracket, sortBy, search]);

  const handleResetFilters = () => {
    setSelectedPriceId('all');
    setNewArrivalsOnly(false);
    setSearch('');
    setSortBy('newest');
  };

  const hasActiveFilters = Boolean(
    selectedPriceId !== 'all' || newArrivalsOnly || search
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-accent/20">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">
            {layoutMode === 'row' ? 'Saree Catalogue' : 'Sarees'}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted font-light mt-1">
            {products.length === 0
              ? 'New saree collections are arriving soon.'
              : `Showing ${filteredProducts.length} sarees`}
          </p>
        </div>

        {/* Layout Switcher (Grid vs List Row) & Sort */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          {/* Grid / Row Switcher */}
          <div
            className="inline-flex items-center p-1 rounded-xl bg-surface border border-accent/25 shadow-xs"
            role="group"
            aria-label="Catalogue view layout"
          >
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                layoutMode === 'grid' ? 'text-canvas' : 'text-ink-muted hover:text-primary'
              }`}
              title="Grid View"
            >
              {layoutMode === 'grid' && (
                <motion.span
                  layoutId="catalogue-view-pill"
                  className="absolute inset-0 bg-primary rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                />
              )}
              <LayoutGrid className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('row')}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                layoutMode === 'row' ? 'text-canvas' : 'text-ink-muted hover:text-primary'
              }`}
              title="List Row View"
            >
              {layoutMode === 'row' && (
                <motion.span
                  layoutId="catalogue-view-pill"
                  className="absolute inset-0 bg-primary rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                />
              )}
              <List className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">List</span>
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface border border-accent/30 text-ink-primary text-xs font-medium focus:outline-none focus:border-primary"
          >
            <option value="newest">New Arrivals</option>
            <option value="priority">Featured First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Mobile Quick-Tap Filter Pills (Horizontal Scroll) */}
      <div className="md:hidden -mx-3 px-3 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setNewArrivalsOnly(!newArrivalsOnly)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            newArrivalsOnly
              ? 'bg-primary text-canvas border-primary shadow-sm'
              : 'bg-surface text-ink-primary border-accent/30'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>New Arrivals</span>
        </button>

        <button
          onClick={() => setSortBy(sortBy === 'price_asc' ? 'newest' : 'price_asc')}
          className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            sortBy === 'price_asc'
              ? 'bg-primary text-canvas border-primary shadow-sm'
              : 'bg-surface text-ink-primary border-accent/30'
          }`}
        >
          Price: Low → High
        </button>

        <button
          onClick={() => setSortBy(sortBy === 'price_desc' ? 'newest' : 'price_desc')}
          className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            sortBy === 'price_desc'
              ? 'bg-primary text-canvas border-primary shadow-sm'
              : 'bg-surface text-ink-primary border-accent/30'
          }`}
        >
          Price: High → Low
        </button>

        {PRICE_BRACKETS.map((bracket) => {
          const active = selectedPriceId === bracket.id;
          return (
            <button
              key={bracket.id}
              onClick={() => setSelectedPriceId(bracket.id)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                active
                  ? 'bg-accent text-canvas border-accent shadow-sm font-semibold'
                  : 'bg-surface text-ink-primary border-accent/30'
              }`}
            >
              {bracket.label}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-primary bg-primary/10"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block md:col-span-3 space-y-5 sticky top-24">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* New Arrivals Filter */}
          <div className="p-4 rounded-xl bg-surface border border-accent/20 shadow-xs">
            <label className="flex items-center justify-between text-xs cursor-pointer select-none">
              <span className="flex items-center gap-2 font-semibold text-ink-primary">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>New Arrivals Only</span>
              </span>
              <input
                type="checkbox"
                checked={newArrivalsOnly}
                onChange={(e) => setNewArrivalsOnly(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
            </label>
          </div>

          {/* Price Sort Quick Options */}
          <div className="p-4 rounded-xl bg-surface border border-accent/20 shadow-xs space-y-2.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-accent">
              Sort by Price
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSortBy(sortBy === 'price_asc' ? 'newest' : 'price_asc')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  sortBy === 'price_asc'
                    ? 'bg-primary text-canvas font-semibold shadow-xs'
                    : 'bg-canvas/60 text-ink-primary hover:bg-canvas border border-transparent hover:border-accent/20'
                }`}
              >
                Price: Low to High
              </button>
              <button
                onClick={() => setSortBy(sortBy === 'price_desc' ? 'newest' : 'price_desc')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  sortBy === 'price_desc'
                    ? 'bg-primary text-canvas font-semibold shadow-xs'
                    : 'bg-canvas/60 text-ink-primary hover:bg-canvas border border-transparent hover:border-accent/20'
                }`}
              >
                Price: High to Low
              </button>
            </div>
          </div>

          {/* Price Bracket Pills */}
          <div className="p-4 rounded-xl bg-surface border border-accent/20 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
              <Tag className="w-3.5 h-3.5" />
              <span>Price Range</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {PRICE_BRACKETS.map((bracket) => {
                const active = selectedPriceId === bracket.id;
                return (
                  <button
                    key={bracket.id}
                    onClick={() => setSelectedPriceId(bracket.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-primary text-canvas font-semibold shadow-xs'
                        : 'bg-canvas/60 text-ink-primary hover:bg-canvas border border-transparent hover:border-accent/20'
                    }`}
                  >
                    {bracket.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Product Grid or List Row */}
        <main className="md:col-span-9">
          {filteredProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 sm:py-20 bg-surface rounded-2xl border border-accent/20 p-6 sm:p-8 space-y-4"
            >
              <p className="font-serif text-2xl font-semibold text-ink-primary">
                {products.length === 0
                  ? 'Saree Collection Arriving Soon'
                  : 'No Sarees Match Your Filter'}
              </p>
              <p className="text-xs sm:text-sm text-ink-muted max-w-sm mx-auto">
                {products.length === 0
                  ? 'We are curating our saree collection. Please check back shortly!'
                  : 'Try selecting a different price range or clearing New Arrivals.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="bg-primary text-canvas px-6 py-2.5 rounded-full text-xs font-semibold hover:bg-primary-hover shadow transition active:scale-95"
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              layout
              className={
                layoutMode === 'row'
                  ? 'flex flex-col gap-4'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6'
              }
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  layout
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.25) }}
                >
                  <ProductCard
                    product={product}
                    onSelect={onSelectProduct}
                    layoutMode={layoutMode}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};
