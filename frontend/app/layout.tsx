import type { Metadata, Viewport } from 'next';
import { Fraunces, DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';
import AuthGate from '../components/AuthGate';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cat Care',
  description: 'Shared household cat care checklist',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cat Care',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#fdf6ec',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="bg-cream text-brown font-sans max-w-[430px] mx-auto min-h-screen pb-10">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
