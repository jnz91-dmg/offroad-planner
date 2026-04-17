import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Offroad Loop Planner — RatataLabs',
  description:
    'Plan offroad round-trip routes on actual trails. Choose distance, difficulty, and direction — get a GPX file for your GPS device. Free, no signup required.',
  keywords: [
    'offroad route planner',
    'GPX generator',
    'round trip planner',
    'enduro route',
    'offroad loop',
    'trail planner',
    'DMD2 routes',
    'gravel route',
  ],
  openGraph: {
    title: 'Offroad Loop Planner — RatataLabs',
    description:
      'Plan offroad round-trip routes on actual trails. Download GPX for your GPS.',
    type: 'website',
    locale: 'en_US',
    siteName: 'RatataLabs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Offroad Loop Planner — RatataLabs',
    description:
      'Plan offroad round-trip routes on actual trails. Download GPX for your GPS.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data for rich search results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Offroad Loop Planner',
  description:
    'Plan offroad round-trip routes on actual trails. Choose distance, difficulty, and direction to generate loop routes with GPX export.',
  applicationCategory: 'NavigationApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  creator: {
    '@type': 'Organization',
    name: 'RatataLabs',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
