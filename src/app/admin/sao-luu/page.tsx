import { requireStaffPage } from '@/server/auth/authorization';
import { ModuleHub } from '@/features/admin/components/common/ModuleHub'; export default async function Page(){
await requireStaffPage('backup.manage');
return <ModuleHub kind="backup"/>}
