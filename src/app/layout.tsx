import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: {
    default: 'Smart Timetable Portal — GEC Palanpur',
    template: '%s | GEC Palanpur Timetable',
  },
  description: 'Government Engineering College Palanpur — Smart Timetable Portal. View your personalized timetable, current lecture, room changes, and campus updates instantly.',
  keywords: ['GEC Palanpur', 'timetable', 'college', 'schedule', 'student', 'portal', 'Government Engineering College'],
  authors: [{ name: 'GEC Palanpur' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GEC Timetable',
  },
  openGraph: {
    title: 'Smart Timetable Portal — GEC Palanpur',
    description: 'Your personalized college timetable — live, real-time, and always up to date.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#080c14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
