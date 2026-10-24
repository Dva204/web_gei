'use client';
import Link from 'next/link';
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="container section">
      <section className="card p-8 text-center" role="alert">
        <h1 className="text-2xl font-bold">Chưa tải được nội dung</h1>
        <p className="muted mt-3">Hãy kiểm tra kết nối và thử tải lại.</p>
        <div className="mt-5 flex justify-center gap-3">
          <button className="btn btn-primary" onClick={retry}>
            Thử lại
          </button>
          <Link className="btn" href="/">
            Về trang chủ
          </Link>
        </div>
      </section>
    </div>
  );
}
