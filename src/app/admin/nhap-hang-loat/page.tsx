import { requireStaffPage } from '@/server/auth/authorization';
import { ImportManager } from '@/features/admin/components/import/ImportManager'; export default async function Page(){
await requireStaffPage('import.manage');
return <ImportManager/>}
