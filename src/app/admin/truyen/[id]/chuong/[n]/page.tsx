import { requireStaffPage } from '@/server/auth/authorization';
import { ChapterEditor } from '@/features/admin/components/chapters/ChapterWorkspace'; export default async function Page({params}:{params:Promise<{id:string;n:string}>}){
await requireStaffPage('chapters.manage', (await params).id);
const{id,n}=await params;return <ChapterEditor storyId={id} number={Number(n)}/>}
