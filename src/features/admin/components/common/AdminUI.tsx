import type { LucideIcon } from 'lucide-react';
import { ADMIN_COPY } from '@/features/admin/lib/copy';
export function PageHeader({title,description,actions}:{title:string;description?:string;actions?:React.ReactNode}){return <div className="admin-page-head"><div><p className="admin-eyebrow">Vườn Ngôn Tình · Quản trị</p><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="admin-head-actions">{actions}</div>}</div>}
export function StatCard({label,value,detail,icon:Icon,tone='accent'}:{label:string;value:string;detail:string;icon:LucideIcon;tone?:string}){return <article className={`admin-stat tone-${tone}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i><Icon size={20}/></i></article>}
export function StatusBadge({value}:{value:string}){return <span className={`admin-badge status-${value}`}>{ADMIN_COPY.statuses[value]??value}</span>}
export function EmptyState({title='Chưa có dữ liệu',description='Thử thay đổi bộ lọc hoặc quay lại sau.'}:{title?:string;description?:string}){return <div className="admin-empty"><strong>{title}</strong><span>{description}</span></div>}
export function ProgressBar({value}:{value:number}){return <div className="admin-progress" aria-label={`${value}%`}><span style={{width:`${Math.min(100,value)}%`}}/></div>}
