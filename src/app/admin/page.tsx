import { requireStaffPage } from '@/server/auth/authorization';
import { Dashboard } from '@/features/admin/components/dashboard/Dashboard';
export default async function AdminPage(){
await requireStaffPage('dashboard.view');
return <Dashboard/>}
