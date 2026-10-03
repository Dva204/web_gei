import Link from 'next/link';
export function Pagination({
  page,
  totalPages,
  base,
}: {
  page: number;
  totalPages: number;
  base: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Phân trang" className="mt-8 flex justify-center gap-2">
      {page > 1 && (
        <Link
          className="btn"
          href={`${base}${base.includes('?') ? '&' : '?'}page=${page - 1}`}
        >
          Trang trước
        </Link>
      )}
      <span className="btn" aria-current="page">
        {page} / {totalPages}
      </span>
      {page < totalPages && (
        <Link
          className="btn"
          href={`${base}${base.includes('?') ? '&' : '?'}page=${page + 1}`}
        >
          Trang sau
        </Link>
      )}
    </nav>
  );
}
