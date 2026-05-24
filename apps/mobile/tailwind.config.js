/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#faf9f6',
        surface: '#faf9f6',
        'surface-lowest': '#ffffff',
        'surface-low': '#f4f3f1',
        'surface-container': '#efeeeb',
        'surface-high': '#e9e8e5',
        'surface-highest': '#e3e2e0',
        primary: '#334537',
        'primary-container': '#4a5d4e',
        'primary-fixed': '#d3e8d5',
        secondary: '#735c00',
        honey: '#fed65b',
        gold: '#e9c349',
        outline: '#737872',
        'outline-soft': '#c3c8c1',
        ink: '#1a1c1a',
        muted: '#434843',
        error: '#ba1a1a',
      },
      fontFamily: {
        display: ['PlayfairDisplay_700Bold'],
        body: ['PlusJakartaSans_400Regular'],
      },
      boxShadow: {
        ambient: '0 28px 80px rgba(26, 28, 26, 0.08)',
        soft: '0 16px 48px rgba(26, 28, 26, 0.06)',
      },
    },
  },
  plugins: [],
};
