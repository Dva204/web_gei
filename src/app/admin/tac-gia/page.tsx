import { requireStaffPage } from '@/server/auth/authorization';
import { TaxonomyManager } from '@/features/admin/components/stories/TaxonomyManager'; export default async function Page(){
await requireStaffPage('taxonomy.manage');
return <TaxonomyManager kind="authors"/>}
