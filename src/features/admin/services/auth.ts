'use client';
import type { AdminUser, Role } from '@/features/admin/types';
import { adminUsers } from '../mocks/store';
const KEY = 'vuon-admin-session';
export async function loginAdmin(email: string, _password: string): Promise<{pending: AdminUser}> { const user = adminUsers.find(u=>u.email===email) ?? adminUsers[0]; sessionStorage.setItem(KEY+'-pending',JSON.stringify(user)); return {pending:user}; }
export async function verifyTwoFactor(code:string):Promise<AdminUser>{ if(code!=='123456') throw new Error('Mã xác thực không đúng.'); const raw=sessionStorage.getItem(KEY+'-pending'); if(!raw) throw new Error('Phiên đăng nhập đã hết hạn.'); localStorage.setItem(KEY,raw); window.dispatchEvent(new Event('admin-session')); return JSON.parse(raw) as AdminUser; }
export function getAdminSession():AdminUser|null { if(typeof window==='undefined') return null; try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') as AdminUser|null; } catch { return null; } }
export function logoutAdmin(){localStorage.removeItem(KEY);window.dispatchEvent(new Event('admin-session'));}
export function switchRole(role:Role){const current=getAdminSession()??adminUsers[0];localStorage.setItem(KEY,JSON.stringify({...current,role}));window.dispatchEvent(new Event('admin-session'));}
