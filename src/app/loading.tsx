export default function Loading() {
  return (
    <div className="container section" role="status" aria-live="polite">
      <p className="muted">Đang tải nội dung…</p>
      <div
        className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4"
        aria-hidden="true"
      >
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="card aspect-[2/3] bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
