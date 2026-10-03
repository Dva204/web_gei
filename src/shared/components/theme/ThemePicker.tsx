'use client';
import { Check, Moon, Sun } from 'lucide-react';
import { MODES, type Mode } from '@/shared/lib/theme/themes';
import { useTheme } from '@/shared/hooks/useTheme';
export function ThemePicker() {
  const { mode, setMode } = useTheme();
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="section-title">Giao diện website</h2>
      <p className="muted -mt-2 mb-5">
        Chọn giao diện sáng hoặc tối. Thay đổi được áp dụng ngay và lưu trên
        thiết bị này.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((item) => {
          const Icon = item.id === 'light' ? Sun : Moon;
          return (
            <button
              key={item.id}
              onClick={() => setMode(item.id as Mode)}
              className={`theme-choice ${mode === item.id ? 'theme-choice-active' : ''}`}
              aria-pressed={mode === item.id}
            >
              <span className="theme-choice-icon">
                <Icon size={22} />
              </span>
              <span className="min-w-0 text-left">
                <strong className="block">{item.name}</strong>
                <span className="muted mt-1 block text-sm">{item.desc}</span>
              </span>
              {mode === item.id && (
                <Check className="ml-auto shrink-0 text-accent" size={20} />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
