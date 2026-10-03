import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container section text-center">
      <p className="text-7xl font-bold text-accent">404</p>
      <h1 className="section-title mt-5">
        Trang này đã đi lạc trong một câu chuyện khác
      </h1>
      <p className="muted">
        Bạn có thể trở về vườn truyện và tìm một chap mới.
      </p>
      <Link href="/" className="btn btn-primary mt-6">
        Về trang chủ
      </Link>
    </div>
  );
}
