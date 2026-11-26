import React from 'react';
import { Sparkles } from 'lucide-react';

interface AnnouncementBarProps {
  text?: string;
  onShopClick?: () => void;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  text = 'Festive Special: 10% OFF with code FESTIVE10 • Free Shipping above ₹2,999',
  onShopClick,
}) => {
  return (
    <aside
      aria-label="Announcement"
      className="bg-primary text-surface py-2 px-3 sm:px-4 text-[11px] sm:text-xs font-medium text-center tracking-wide border-b border-accent/20 flex items-center justify-center gap-1.5 sm:gap-2 relative z-20"
    >
      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent animate-pulse shrink-0" />
      <span className="leading-snug line-clamp-1 sm:line-clamp-none max-w-4xl">{text}</span>
      {onShopClick && (
        <button
          onClick={onShopClick}
          className="underline hover:text-accent font-semibold ml-1 shrink-0 transition-colors"
        >
          Shop
        </button>
      )}
    </aside>
  );
};
