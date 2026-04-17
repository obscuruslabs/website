import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import PlausibleProvider from 'next-plausible';
import ProductJsonLd from '@/components/ProductJsonLd';
import { SITE_MODE, SITE_URL } from '@/lib/env';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const PLAUSIBLE_SCRIPT_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "obscurus labs — VISO .01 'Ghost'",
    template: '%s',
  },
  description:
    'Anti-surveillance eyewear. Invisible to eyes. Blinding to sensors.',
  openGraph: {
    title: "obscurus labs — VISO .01 'Ghost'",
    description:
      'Anti-surveillance eyewear. Invisible to eyes. Blinding to sensors.',
    url: SITE_URL,
    siteName: 'obscurus labs',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "obscurus labs — VISO .01 'Ghost'",
    description:
      'Anti-surveillance eyewear. Invisible to eyes. Blinding to sensors.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        {PLAUSIBLE_SCRIPT_SRC && (
          <PlausibleProvider src={PLAUSIBLE_SCRIPT_SRC} />
        )}
        {SITE_MODE === 'full' && <ProductJsonLd />}
      </head>
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-[#EDEDED]">
        {children}
      </body>
    </html>
  );
}
