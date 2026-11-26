import React from 'react';
import { motion } from 'framer-motion';
import { useCartStore } from '../store/useCartStore.js';

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.46 1.71 6.4L3.1 28.9l6.67-1.75a12.74 12.74 0 0 0 6.23 1.62h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.64-3.75-9.05A12.71 12.71 0 0 0 16.004 3.2Zm0 23.42h-.01a10.6 10.6 0 0 1-5.41-1.48l-.39-.23-3.96 1.04 1.06-3.86-.25-.4a10.58 10.58 0 0 1-1.63-5.69c0-5.85 4.76-10.61 10.61-10.61 2.83 0 5.5 1.1 7.5 3.1a10.54 10.54 0 0 1 3.1 7.51c0 5.85-4.76 10.62-10.62 10.62Zm5.82-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.14 3.09 1.3 3.3.16.21 2.25 3.44 5.45 4.82.76.33 1.35.53 1.81.67.76.24 1.46.21 2.01.13.61-.09 1.89-.77 2.15-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
  </svg>
);

export const WhatsAppFloat: React.FC = () => {
  const { isDrawerOpen } = useCartStore();
  const whatsappUrl =
    'https://wa.me/917013622760?text=Hi%20AnuVarnika%20Sarees!%20I%20would%20like%20to%20know%20more%20about%20your%20sarees.';

  // Hide WhatsApp float when bag drawer is open to prevent overlapping
  if (isDrawerOpen) return null;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with AnuVarnika Sarees on WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="fixed right-3.5 md:right-6 md:bottom-6 z-30 group flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white p-3 md:px-4 md:py-3 rounded-full shadow-lg border-2 border-white/90"
      style={{
        bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
      }}
    >
      <WhatsAppIcon className="w-5 h-5 md:w-6 md:h-6 relative z-10" />
      <span className="hidden md:inline text-xs font-bold tracking-wide relative z-10">
        WhatsApp Us
      </span>
    </motion.a>
  );
};
