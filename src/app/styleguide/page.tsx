import { MODES } from '@/shared/lib/theme/themes';
import { GeneratedCover } from '@/features/catalog/components/GeneratedCover';
export default function Styleguide() {
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <div className="container section">
      <h1 className="section-title">Hai giao diện website</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        {MODES.map((mode) => (
          <section
            key={mode.id}
            data-mode={mode.id}
            className="card bg-bg p-5 text-text"
          >
            <h2 className="text-xl font-bold">{mode.name}</h2>
            <div className="mt-4 grid grid-cols-[100px_1fr] gap-4">
              <GeneratedCover title="Mùa hạ" />
              <div>
                <button className="btn btn-primary">Nút chính</button>
                <span className="chip ml-2">Chữa lành</span>
                <p className="muted mt-3">Chữ phụ trên nền và bề mặt.</p>
                <input
                  className="mt-3 w-full rounded-[var(--radius-md)] border border-border bg-surface p-3"
                  placeholder="Ô nhập liệu"
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
