export interface ThemeTokens {
  colors: {
    bgCanvas: string;
    surfaceCard: string;
    brandPrimary: string;
    brandAccent: string;
    brandSecondary: string;
    inkPrimary: string;
    inkMuted: string;
  };
  fonts: {
    heading: 'Playfair Display' | 'Lora' | 'Cormorant Garamond' | 'Cinzel' | 'Prata';
    body: 'Inter' | 'DM Sans' | 'Plus Jakarta Sans' | 'Outfit';
  };
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  heroStyle: 'editorial' | 'minimal' | 'festive';
  activePreset: 'anu-signature' | 'royal-crimson' | 'festive-gold' | 'monochrome-rose';
  showVisitorCounter?: boolean;
}

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    bgCanvas: '#FAF5EB',       // Warm Ivory
    surfaceCard: '#FFFDF9',    // Soft Elevated Ivory
    brandPrimary: '#7A231E',   // Deep Crimson Maroon from Logo
    brandAccent: '#A8793E',    // Heritage Brass Gold from Logo
    brandSecondary: '#D98273', // Blush Rose Accent
    inkPrimary: '#2B1E1A',     // Deep Espresso Ink
    inkMuted: '#6E5A52',       // Warm Muted Soil
  },
  fonts: {
    heading: 'Lora',
    body: 'DM Sans',
  },
  borderRadius: 'md',
  heroStyle: 'editorial',
  activePreset: 'anu-signature',
  showVisitorCounter: true,
};

export const THEME_PRESETS: Record<string, ThemeTokens> = {
  'anu-signature': DEFAULT_THEME_TOKENS,
  'royal-crimson': {
    colors: {
      bgCanvas: '#F8F4EE',
      surfaceCard: '#FFFFFF',
      brandPrimary: '#631814',
      brandAccent: '#B8860B',
      brandSecondary: '#C97A6D',
      inkPrimary: '#1F1411',
      inkMuted: '#5C4A43',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Plus Jakarta Sans',
    },
    borderRadius: 'sm',
    heroStyle: 'editorial',
    activePreset: 'royal-crimson',
  },
  'festive-gold': {
    colors: {
      bgCanvas: '#FBF7F0',
      surfaceCard: '#FFFDF8',
      brandPrimary: '#872822',
      brandAccent: '#C59341',
      brandSecondary: '#E08E80',
      inkPrimary: '#261914',
      inkMuted: '#6B5850',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Outfit',
    },
    borderRadius: 'md',
    heroStyle: 'festive',
    activePreset: 'festive-gold',
  },
  'monochrome-rose': {
    colors: {
      bgCanvas: '#FAF6F4',
      surfaceCard: '#FFFFFF',
      brandPrimary: '#802B28',
      brandAccent: '#9E6B56',
      brandSecondary: '#D47E72',
      inkPrimary: '#2D1F1C',
      inkMuted: '#66534E',
    },
    fonts: {
      heading: 'Cinzel',
      body: 'Inter',
    },
    borderRadius: 'none',
    heroStyle: 'minimal',
    activePreset: 'monochrome-rose',
  },
};
