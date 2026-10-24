import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../styles/mobile.css';
import '../styles/advertising.css';
import '../styles/fe-improvements.css';
import { uiFont, readFont } from './fonts';
import { noFlashScript } from '@/shared/lib/theme/noFlashScript';
import { Header } from '@/shared/components/layout/Header';
import { Footer } from '@/shared/components/layout/Footer';
import { MobileNav } from '@/shared/components/layout/MobileNav';
import { ScrollToTop } from '@/shared/components/ScrollToTop';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: { default: 'Vườn Ngôn Tình', template: '%s | Vườn Ngôn Tình' },
  description: 'Website đọc truyện ngôn tình Việt với trải nghiệm đọc êm dịu.',
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      data-mode="light"
      suppressHydrationWarning
      className={`${uiFont.variable} ${readFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <MobileNav />
        <ScrollToTop />
      </body>
    </html>
  );
}
