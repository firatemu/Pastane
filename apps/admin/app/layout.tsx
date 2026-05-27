import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

const adminSans = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-admin',
  display: 'swap',
});

const materialSymbolsOutlined = localFont({
  src: './fonts/material-symbols-outlined-400.ttf',
  variable: '--font-material-symbols',
  display: 'block',
});

export const metadata: Metadata = {
  title: 'Pastane — Yönetim paneli',
  description: 'Pastane operasyon yönetim paneli.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html className={`${adminSans.variable} ${materialSymbolsOutlined.variable}`} lang="tr">
      <body className="bg-canvas text-on-canvas antialiased">{children}</body>
    </html>
  );
}
