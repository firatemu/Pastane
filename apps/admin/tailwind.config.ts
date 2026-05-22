import type { Config } from 'tailwindcss';

/**
 * Artisanal bakery admin theme — aligns with Stitch "Digital Bakery Platform" design tokens.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.css'],
  theme: {
    extend: {
      colors: {
        /** Cream page fill (avoid Tailwind/theme name `background` — breaks @apply in some builds). */
        canvas: '#fff8f5',
        surface: '#fff8f5',
        'surface-container-low': '#fff1e7',
        'surface-container-lowest': '#ffffff',
        'surface-container': '#faebe1',
        'surface-container-high': '#f4e6db',
        'surface-dim': '#e5d8ce',
        'surface-variant': '#eee0d6',
        'on-canvas': '#211a14',
        'on-surface': '#211a14',
        'on-surface-variant': '#454742',
        secondary: '#705a4c',
        tertiary: '#775a19',
        'secondary-container': '#f8dac8',
        'tertiary-container': '#fffaf8',
        'primary-container': '#fdfbf7',
        primary: '#5e5e5c',
        chocolate: '#3d2b1f',
        'outline-variant': '#c6c7c0',
        outline: '#767872',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        accent: '#d13438',
      },
      spacing: {
        gutter: '1.5rem',
        'stack-lg': '3rem',
        'stack-md': '1.5rem',
        'stack-sm': '0.75rem',
        'margin-desktop': '2rem',
        'container-max': '80rem',
      },
      borderRadius: {
        card: '1.5rem',
      },
      boxShadow: {
        bakery: '0 4px 8px rgba(61,43,31,0.05)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
