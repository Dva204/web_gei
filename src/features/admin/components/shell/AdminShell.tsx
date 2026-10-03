'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, Bot, ChevronLeft, FileText, Flag, Gauge, LogOut, Menu, MessageCircle, Megaphone, Search, Settings, Shield, Tags, Users, X } from 'lucide-react';
import { ModeToggle } from '@/shared/components/theme/ModeToggle';
import { ADMIN_COPY } from '@/features/admin/lib/copy';
import { getAdminSession, logoutAdmin, switchRole } from '@/features/admin/services/auth';
import { can } from '@/features/admin/lib/permissions';
import type { AdminUser, Role } from '@/features/admin/types';

const nav=[
  ['/',ADMIN_COPY.nav.overview,Gauge,'dashboard.view'],['/truyen',ADMIN_COPY.nav.stories,BookOpen,'stories.manage'],['/nhap-hang-loat',ADMIN_COPY.nav.import,FileText,'import.manage'],['/the-loai',ADMIN_COPY.nav.taxonomy,Tags,'taxonomy.manage'],['/tac-gia',ADMIN_COPY.nav.authors,Users,'taxonomy.manage'],['/binh-luan',ADMIN_COPY.nav.comments,MessageCircle,'comments.moderate'],['/bao-loi',ADMIN_COPY.nav.reports,Flag,'reports.manage'],['/yeu-cau-go',ADMIN_COPY.nav.takedowns,Shield,'takedowns.view'],['/chat',ADMIN_COPY.nav.chat,Bot,'chat.manage'],['/nguoi-dung',ADMIN_COPY.nav.users,Users,'users.sanction'],['/quang-cao',ADMIN_COPY.nav.ads,Megaphone,'ads.manage'],['/affiliate',ADMIN_COPY.nav.affiliate,BarChart3,'ads.manage'],['/thong-ke',ADMIN_COPY.nav.stats,BarChart3,'stats.content'],['/seo',ADMIN_COPY.nav.seo,Search,'seo.manage'],['/noi-dung-trang',ADMIN_COPY.nav.content,FileText,'content.manage'],['/cai-dat',ADMIN_COPY.nav.settings,Settings,'settings.manage'],['/nhat-ky',ADMIN_COPY.nav.audit,Shield,'audit.own'],['/sao-luu',ADMIN_COPY.nav.backup,FileText,'backup.manage'],
] as const;
export function AdminShell({children}:{children:React.ReactNode}){
 const path=usePathname(),router=useRouter(),isLogin=path==='/admin/dang-nhap';
 const [user,setUser]=useState<AdminUser|null>(null),[ready,setReady]=useState(false),[open,setOpen]=useState(false);
 useEffect(()=>{const sync=()=>{setUser(getAdminSession());setReady(true)};sync();window.addEventListener('admin-session',sync);return()=>window.removeEventListener('admin-session',sync)},[]);
 useEffect(()=>{if(ready&&!user&&!isLogin)router.replace('/admin/dang-nhap');if(ready&&user&&isLogin)router.replace('/admin')},[ready,user,isLogin,router]);
 const links=useMemo(()=>user?nav.filter(([, , ,permission])=>permission==='dashboard.view'||can(user,permission)):[],[user]);
 if(isLogin)return <>{children}</>;
 if(!ready||!user)return <div className="admin-boot">{ADMIN_COPY.loading}</div>;
 return <div className="admin-shell" data-density="compact">
   <button className="admin-menu-btn btn" aria-label={ADMIN_COPY.openMenu} onClick={()=>setOpen(true)}><Menu size={20}/></button>
   {open&&<button className="admin-backdrop" aria-label={ADMIN_COPY.closeMenu} onClick={()=>setOpen(false)}/>} 
   <aside className={`admin-sidebar ${open?'is-open':''}`}>
    <div className="admin-brand"><span>V</span><div><strong>{ADMIN_COPY.brand}</strong><small>Không gian vận hành</small></div><button className="admin-close" onClick={()=>setOpen(false)} aria-label={ADMIN_COPY.closeMenu}><X/></button></div>
    <nav aria-label="Điều hướng quản trị">{links.map(([href,label,Icon])=>{const full='/admin'+href,active=href==='/'?path===full:path.startsWith(full);return <Link key={href} href={full} className={active?'active':''} onClick={()=>setOpen(false)}><Icon size={18}/><span>{label}</span></Link>})}</nav>
    <Link className="admin-site-link" href="/"><ChevronLeft size={17}/> Về trang đọc</Link>
   </aside>
   <div className="admin-stage">
    <header className="admin-topbar"><div className="admin-topbar-spacer"/><label className="admin-role"><span>{ADMIN_COPY.roleSwitcher}</span><select value={user.role} onChange={e=>switchRole(e.target.value as Role)}>{Object.entries(ADMIN_COPY.roles).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><ModeToggle/><button className="btn icon-btn" title={ADMIN_COPY.logout} aria-label={ADMIN_COPY.logout} onClick={()=>{logoutAdmin();router.replace('/admin/dang-nhap')}}><LogOut size={18}/></button></header>
    <main className="admin-main">{children}</main>
   </div>
 </div>
}
