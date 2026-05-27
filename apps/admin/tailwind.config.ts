import type { Config } from 'tailwindcss';

/**
 * Compact enterprise admin theme for the operations console.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.css'],
  theme: {
    extend: {
      colors: {
        /** Cooler graphite surface system with steel-blue and muted plum accents. */
        canvas: '#edf2f7',
        surface: '#f7f9fc',
        'surface-container-low': '#eff3f8',
        'surface-container-lowest': '#fbfdff',
        'surface-container': '#e4eaf2',
        'surface-container-high': '#d8e0eb',
        'surface-dim': '#cbd5e1',
        'surface-variant': '#e9edf4',
        'on-canvas': '#111827',
        'on-surface': '#162033',
        'on-surface-variant': '#5d6a7f',
        secondary: '#44658d',
        'on-secondary': '#f4f7fb',
        tertiary: '#6a5a83',
        'secondary-container': '#dbe7f4',
        'tertiary-container': '#e8e1f2',
        'primary-container': '#e6edf5',
        primary: '#253446',
        chocolate: '#342d45',
        'outline-variant': '#d2dbe7',
        outline: '#74839a',
        error: '#b84f60',
        'error-container': '#f6dfe4',
        accent: '#557399',
        sidebar: '#f4f7fb',
        'sidebar-foreground': '#162033',
        'sidebar-muted': '#68778c',
        'sidebar-accent': '#253446',
        'sidebar-accent-foreground': '#f8fbff',
        'sidebar-border': 'rgba(37, 52, 70, 0.08)',
        'sidebar-surface': '#ffffff',
        'sidebar-highlight': '#e8eef7',
      },
      spacing: {
        gutter: '1rem',
        'stack-lg': '2rem',
        'stack-md': '1rem',
        'stack-sm': '0.625rem',
        'margin-desktop': '1.5rem',
        'container-max': '78rem',
      },
      borderRadius: {
        card: '1rem',
      },
      boxShadow: {
        bakery: '0 8px 24px rgba(24, 32, 43, 0.06)',
      },
      fontFamily: {
        sans: ['var(--font-admin)', 'system-ui', 'sans-serif'],
        display: ['var(--font-admin)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
