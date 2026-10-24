import { requireStaffPage } from '@/server/auth/authorization';
import { StoryForm } from '@/features/admin/components/stories/StoryForm'; export default async function Page(){
await requireStaffPage('stories.manage');
return <StoryForm/>}
