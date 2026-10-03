import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../styles/mobile.css';
import '../styles/advertising.css';
import { uiFont, readFont } from './fonts';
import { noFlashScript } from '@/lib/theme/noFlashScript';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { ScrollToTop } from '@/components/shared/ScrollToTop';

export const metadata: Metadata = {
  metadataBase: new URL('https://vuonngontinh.example'),
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
