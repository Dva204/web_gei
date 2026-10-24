import { requireStaffPage } from '@/server/auth/authorization';
import { StoryForm } from '@/features/admin/components/stories/StoryForm'; export default async function Page({params}:{params:Promise<{id:string}>}){
await requireStaffPage('stories.manage', (await params).id);
const{id}=await params;return <StoryForm id={id}/>}
