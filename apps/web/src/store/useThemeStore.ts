import { create } from 'zustand';
import { DEFAULT_THEME_TOKENS, THEME_PRESETS, ThemeTokens } from '@anuvarnika/shared';
import { api } from '../lib/api.js';

interface ThemeState {
  theme: ThemeTokens;
  presets: Record<string, ThemeTokens>;
  isLoading: boolean;
  isCustomizerOpen: boolean;
  initTheme: () => Promise<void>;
  setTheme: (tokens: Partial<ThemeTokens>) => void;
  applyPreset: (presetKey: string) => void;
  saveThemeToD1: () => Promise<boolean>;
  toggleCustomizer: () => void;
}

function applyTokensToDom(theme: ThemeTokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--bg-canvas', theme.colors.bgCanvas);
  root.style.setProperty('--surface-card', theme.colors.surfaceCard);
  root.style.setProperty('--brand-primary', theme.colors.brandPrimary);
  root.style.setProperty('--brand-accent', theme.colors.brandAccent);
  root.style.setProperty('--brand-secondary', theme.colors.brandSecondary);
  root.style.setProperty('--ink-primary', theme.colors.inkPrimary);
  root.style.setProperty('--ink-muted', theme.colors.inkMuted);
  root.style.setProperty('--font-heading', `'${theme.fonts.heading}', serif`);
  root.style.setProperty('--font-body', `'${theme.fonts.body}', sans-serif`);

  const radiusMap: Record<string, string> = {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  };
  root.style.setProperty('--border-radius', radiusMap[theme.borderRadius] || '8px');
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: DEFAULT_THEME_TOKENS,
  presets: THEME_PRESETS,
  isLoading: false,
  isCustomizerOpen: false,

  initTheme: async () => {
    try {
      set({ isLoading: true });
      const data = await api.getTheme();
      if (data.theme) {
        set({ theme: data.theme, presets: data.presets || THEME_PRESETS });
        applyTokensToDom(data.theme);
      }
    } catch (e) {
      console.warn('Failed to fetch theme settings, applying defaults:', e);
      applyTokensToDom(DEFAULT_THEME_TOKENS);
    } finally {
      set({ isLoading: false });
    }
  },

  setTheme: (tokens) => {
    const current = get().theme;
    const updated: ThemeTokens = {
      ...current,
      ...tokens,
      colors: { ...current.colors, ...(tokens.colors || {}) },
      fonts: { ...current.fonts, ...(tokens.fonts || {}) },
    };
    set({ theme: updated });
    applyTokensToDom(updated);
  },

  applyPreset: (presetKey) => {
    const target = get().presets[presetKey];
    if (target) {
      set({ theme: target });
      applyTokensToDom(target);
    }
  },

  saveThemeToD1: async () => {
    try {
      await api.updateTheme(get().theme);
      return true;
    } catch (e) {
      console.error('Failed to persist theme to D1:', e);
      return false;
    }
  },

  toggleCustomizer: () => set((state) => ({ isCustomizerOpen: !state.isCustomizerOpen })),
}));
