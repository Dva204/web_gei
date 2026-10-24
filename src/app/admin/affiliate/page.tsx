import { requireStaffPage } from '@/server/auth/authorization';
import { AdvertisingManager } from '@/features/admin/components/ads/AdvertisingManager';
export default async function Page() {
await requireStaffPage('ads.manage');

  return <AdvertisingManager affiliate />;
}
