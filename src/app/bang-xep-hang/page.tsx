import { getRanking } from '@/lib/data';
import Link from 'next/link';
export default async function Ranking({
  searchParams,
}: {
  searchParams: Promise<{ period?: 'day' | 'week' | 'month' }>;
}) {
  const period = (await searchParams).period || 'day',
    items = await getRanking(period);
  return (
    <div className="container section">
      <h1 className="section-title">Bảng xếp hạng</h1>
      <div className="mb-6 flex gap-2">
        {[
          ['day', 'Ngày'],
          ['week', 'Tuần'],
          ['month', 'Tháng'],
        ].map((x) => (
          <Link
            className={period === x[0] ? 'btn btn-primary' : 'btn'}
            key={x[0]}
            href={`/bang-xep-hang?period=${x[0]}`}
          >
            {x[1]}
          </Link>
        ))}
      </div>
      <ol className="card divide-y divide-border">
        {items.map((s, i) => (
          <li key={s.id}>
            <Link
              className="flex min-h-16 items-center gap-4 px-4"
              href={`/truyen/${s.slug}`}
            >
              <strong className={`text-xl ${i < 3 ? 'text-accent' : ''}`}>
                {i + 1}
              </strong>
              <span className="flex-1 font-semibold">{s.title}</span>
              <span className="muted text-sm">
                {s.views.toLocaleString('vi-VN')} lượt
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
