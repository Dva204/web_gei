import { requireStaffPage } from '@/server/auth/authorization';
import { ChapterEditor } from '@/features/admin/components/chapters/ChapterWorkspace'; export default async function Page({params}:{params:Promise<{id:string}>}){
await requireStaffPage('chapters.manage', (await params).id);
const{id}=await params;return <ChapterEditor storyId={id}/>}
