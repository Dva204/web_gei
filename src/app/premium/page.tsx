import type { Metadata } from 'next';
import { PremiumDemo } from '@/features/advertising/components/PremiumDemo';
export const metadata: Metadata = {
  title: 'Trải nghiệm Premium mẫu',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="container section max-w-3xl">
      <h1 className="section-title">Trải nghiệm không quảng cáo</h1>
      <PremiumDemo />
    </div>
  );
}
