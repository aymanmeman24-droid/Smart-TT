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
    default: 'ShalaSync — GEC Palanpur',
    template: '%s | ShalaSync',
  },
  description: 'ShalaSync — Government Engineering College Palanpur. View your personalized timetable, live room changes, and real-time campus updates instantly.',
  keywords: ['ShalaSync', 'GEC Palanpur', 'timetable', 'college schedule', 'student portal', 'Government Engineering College', 'live updates'],
  authors: [{ name: 'GEC Palanpur' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ShalaSync',
  },
  openGraph: {
    title: 'ShalaSync — GEC Palanpur',
    description: 'Your personalized college timetable — live, real-time, and always in sync.',
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
