import { requireStaffPage } from '@/server/auth/authorization';
import { ChapterList } from '@/features/admin/components/chapters/ChapterWorkspace'; export default async function Page({params}:{params:Promise<{id:string}>}){
await requireStaffPage('chapters.manage', (await params).id);
const{id}=await params;return <ChapterList storyId={id}/>}
