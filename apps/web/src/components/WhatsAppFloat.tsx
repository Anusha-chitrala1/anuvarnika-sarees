import React from 'react';
import { motion } from 'framer-motion';
import { useCartStore } from '../store/useCartStore.js';

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.25-8.24m-3.52 3.66c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1.01 2.56.13.17 1.75 2.67 4.24 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.28-.24-.13-1.44-.72-1.66-.8-.23-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.15.17-.29.19-.54.07-.24-.13-1.26-.46-2.46-1.53-.93-.83-1.57-1.86-1.75-2.17-.18-.31-.02-.48.14-.64.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.99-2.38-.26-.63-.52-.55-.72-.56h-.62z"
    />
  </svg>
);

export const WhatsAppFloat: React.FC = () => {
  const { isDrawerOpen } = useCartStore();
  const whatsappUrl =
    'https://wa.me/917013622760?text=Hi%20AnuVarnika%20Sarees!%20I%20would%20like%20to%20know%20more%20about%20your%20sarees.';

  // Hide WhatsApp float when bag drawer is open to prevent overlapping
  if (isDrawerOpen) return null;

  return (
    <div
      className="fixed right-3.5 md:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-30 pointer-events-none"
    >
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
        className="pointer-events-auto group flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white p-3 md:px-4 md:py-3 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.45)] border-2 border-white/95"
      >
        <WhatsAppIcon className="w-5 h-5 md:w-6 md:h-6 relative z-10" />
        <span className="hidden md:inline text-xs font-bold tracking-wide relative z-10">
          WhatsApp Us
        </span>
      </motion.a>
    </div>
  );
};
