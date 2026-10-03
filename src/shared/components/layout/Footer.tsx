import Link from 'next/link';
export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface py-10">
      <div className="container">
        <strong>Vườn Ngôn Tình</strong>
        <p className="muted mt-2 max-w-2xl text-sm">
          Không gian đọc truyện chữ lành mạnh. Vui lòng liên hệ khi cần gửi yêu
          cầu gỡ nội dung vi phạm.
        </p>
        <nav className="mt-5 flex flex-wrap gap-4 text-sm">
          <Link href="/dieu-khoan">Điều khoản</Link>
          <Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
          <Link href="/quy-dinh-noi-dung">Quy định nội dung</Link>
          <Link href="/lien-he">Liên hệ</Link>
          <Link href="/gui-yeu-cau-go-noi-dung">Gửi yêu cầu gỡ nội dung</Link>
        </nav>
      </div>
    </footer>
  );
}
