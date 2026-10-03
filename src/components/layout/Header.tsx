'use client';
import Link from 'next/link';
import { Menu, Search, X } from 'lucide-react';
import { copy } from '@/lib/copy';
import { ModeToggle } from '@/components/theme/ModeToggle';
export function Header() {
  return <header className="site-header sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur"><div className="container site-header-row">
    <Link href="/" className="site-logo" aria-label={`${copy.siteName} — Trang chủ`}><svg viewBox="0 0 32 32" aria-hidden><path d="M16 29C8 23 5 15 9 6c5 2 8 5 9 10 2-4 5-7 10-8 1 10-4 17-12 21Z" fill="none" stroke="currentColor" strokeWidth="2"/></svg><span>{copy.siteName}</span></Link>
    <nav className="header-desktop-nav" aria-label="Điều hướng chính"><Link className="btn border-0" href="/danh-sach/truyen-moi">Danh sách</Link><Link className="btn border-0" href="/the-loai/hien-dai">{copy.genres}</Link><Link className="btn border-0" href="/bang-xep-hang">Xếp hạng</Link></nav>
    <Link className="btn header-search" href="/tim-kiem" aria-label="Tìm kiếm"><Search size={18}/><span>Tìm kiếm</span></Link>
    <ModeToggle />
    <details className="header-menu-details"><summary className="btn header-menu-button" aria-label="Mở menu"><span className="menu-open-icon"><Menu/></span><span className="menu-close-icon"><X/></span></summary><nav className="header-mobile-menu" aria-label="Menu mobile"><Link className="btn" href="/danh-sach/truyen-moi">Truyện mới</Link><Link className="btn" href="/the-loai/co-dai">Thể loại</Link><Link className="btn" href="/tim-kiem">Tìm kiếm</Link><Link className="btn" href="/cai-dat">Cài đặt</Link></nav></details>
  </div></header>
}
