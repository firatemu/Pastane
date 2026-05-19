import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pastane — Kurye paneli',
  description: 'Atanan teslimat işleriniz için kurye paneli.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  );
}
