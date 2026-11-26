/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'color-mix(in srgb, var(--bg-canvas) calc(<alpha-value> * 100%), transparent)',
        surface: 'color-mix(in srgb, var(--surface-card) calc(<alpha-value> * 100%), transparent)',
        primary: {
          DEFAULT: 'color-mix(in srgb, var(--brand-primary) calc(<alpha-value> * 100%), transparent)',
          hover: 'color-mix(in srgb, var(--brand-primary) 85%, black)',
          light: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
        },
        accent: {
          DEFAULT: 'color-mix(in srgb, var(--brand-accent) calc(<alpha-value> * 100%), transparent)',
          hover: 'color-mix(in srgb, var(--brand-accent) 85%, black)',
          light: 'color-mix(in srgb, var(--brand-accent) 15%, transparent)',
        },
        secondary: 'color-mix(in srgb, var(--brand-secondary) calc(<alpha-value> * 100%), transparent)',
        ink: {
          primary: 'color-mix(in srgb, var(--ink-primary) calc(<alpha-value> * 100%), transparent)',
          muted: 'color-mix(in srgb, var(--ink-muted) calc(<alpha-value> * 100%), transparent)',
        },
      },
      fontFamily: {
        serif: ['var(--font-heading)', 'Lora', 'Playfair Display', 'serif'],
        sans: ['var(--font-body)', 'DM Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        theme: 'var(--border-radius)',
      },
    },
  },
  plugins: [],
};
