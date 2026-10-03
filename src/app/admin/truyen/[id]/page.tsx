import { StoryForm } from '@/components/admin/stories/StoryForm'; export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <StoryForm id={id}/>}
