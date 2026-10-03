import { Be_Vietnam_Pro, Literata } from 'next/font/google';
export const uiFont = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-be-vietnam',
  weight: ['400', '500', '600', '700'],
});
export const readFont = Literata({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-literata',
});
