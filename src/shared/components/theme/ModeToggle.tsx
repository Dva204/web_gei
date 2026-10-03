'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/hooks/useTheme';
export function ModeToggle() { const { mode }=useTheme(); return <button type="button" className="btn" data-mode-toggle aria-label="Đổi chế độ sáng tối" title={mode==='dark'?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối'}>{mode==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button> }
