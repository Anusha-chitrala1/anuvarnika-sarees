import React, { useEffect, useRef, useState } from 'react';
import { Instagram, ExternalLink } from 'lucide-react';

interface InstagramEmbedProps {
  url: string;
  title?: string;
}

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

export const InstagramEmbed: React.FC<InstagramEmbedProps> = ({ url, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Strip query params so Instagram permalink stays canonical
  const cleanUrl = url.split('?')[0].replace(/\/$/, '') + '/';

  // Lazy-load Instagram embed script only when scrolled near the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || shouldLoad) return;

    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;

    if (window.instgrm?.Embeds) {
      window.instgrm.Embeds.process();
      return;
    }

    const existingScript = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => {
        window.instgrm?.Embeds?.process();
      };
      document.body.appendChild(script);
    }
  }, [shouldLoad, cleanUrl]);

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Instagram className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-xl sm:text-2xl font-semibold text-primary">
            {title || 'See How This Saree Drapes'}
          </h3>
        </div>
        <a
          href={cleanUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-accent/30 hover:border-primary text-xs font-semibold text-primary transition self-start sm:self-auto"
        >
          <Instagram className="w-3.5 h-3.5" />
          <span>Watch on Instagram</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {shouldLoad && (
        <div className="flex justify-center bg-surface rounded-2xl border border-accent/20 p-3 sm:p-5 overflow-hidden">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={cleanUrl}
            data-instgrm-version="14"
            style={{
              background: '#FFFDF9',
              border: 0,
              borderRadius: '12px',
              margin: '0 auto',
              maxWidth: '420px',
              width: '100%',
            }}
          >
            <a
              href={cleanUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline p-4 block text-center"
            >
              View this saree reel on Instagram ↗
            </a>
          </blockquote>
        </div>
      )}
    </div>
  );
};
