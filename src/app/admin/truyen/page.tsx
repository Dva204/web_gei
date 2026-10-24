import { requireStaffPage } from '@/server/auth/authorization';
import { StoriesManager } from '@/features/admin/components/stories/StoriesManager';
export default async function StoriesPage(){
await requireStaffPage('stories.manage');
return <StoriesManager/>}
