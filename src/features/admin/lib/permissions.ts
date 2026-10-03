import type { AdminUser, Role } from '@/features/admin/types';
type Resource={type:string;assigneeIds?:string[]};
const permissions:Record<Role,string[]>={
 admin:['*'], mod:['comments.moderate','reports.manage','takedowns.view','takedowns.hide','chat.manage','users.sanction','audit.own'], editor:['stories.manage','stories.publish','chapters.manage','chapters.publish','import.manage','taxonomy.manage','reports.view','stats.content','seo.manage','content.manage'], author:['stories.assigned','chapters.assigned','import.assigned','stats.assigned'], beta:['chapters.beta']
};
export function can(user:AdminUser,action:string,resource?:Resource){if(permissions[user.role].includes('*')||permissions[user.role].includes(action)) return true; const assigned=resource?.assigneeIds?.includes(user.id); return Boolean(assigned&&permissions[user.role].some(p=>p.endsWith('.assigned')&&action.startsWith(p.split('.')[0]+'.')));}
