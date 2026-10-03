import Link from 'next/link';
import { BookHeart, Clock, Home, Settings } from 'lucide-react';
export function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-border bg-surface md:hidden"
      aria-label="Điều hướng di động"
    >
      {[
        [Home, '/', 'Trang chủ'],
        [BookHeart, '/tu-truyen', 'Tủ truyện'],
        [Clock, '/lich-su', 'Lịch sử'],
        [Settings, '/cai-dat', 'Cài đặt'],
      ].map(([Icon, href, label]) => {
        const I = Icon as typeof Home;
        return (
          <Link
            key={String(href)}
            href={String(href)}
            className="flex flex-col items-center justify-center gap-1 text-xs"
          >
            <I size={20} />
            {String(label)}
          </Link>
        );
      })}
    </nav>
  );
}
