'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/http';
import type { StoryAdmin } from '../../types';
type Assignee = { id: string; name: string; role: 'author' | 'beta' };
export function AssignmentEditor({
  story,
  disabled,
  onSaved,
}: {
  story: StoryAdmin;
  disabled: boolean;
  onSaved: (saved: StoryAdmin) => void;
}) {
  const [users, setUsers] = useState<Assignee[]>([]),
    [selected, setSelected] = useState(story.assigneeIds);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setSelected(story.assigneeIds);
  }, [story.assigneeIds]);
  useEffect(() => {
    let active = true;
    adminApi<Assignee[]>('/api/admin/stories/assignees')
      .then((users) => {
        if (active) setUsers(users);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="admin-card form-section">
      <h2>Phân công truyện</h2>
      <p className="muted">
        Author sửa bản nháp; beta chỉ xem truyện được giao. Không cấp quyền tài
        khoản tại đây.
      </p>
      {loading ? (
        <p>Đang tải nhân sự…</p>
      ) : (
        <fieldset disabled={disabled || busy}>
          {users.length ? (
            users.map((user) => (
              <label className="flex items-center gap-2" key={user.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(user.id)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...selected, user.id]
                        : selected.filter((id) => id !== user.id),
                    )
                  }
                />
                {user.name} · {user.role}
              </label>
            ))
          ) : (
            <p className="muted">
              Chưa có tài khoản author/beta đang hoạt động. Phần cấp vai trò sẽ
              triển khai cùng quản lý người dùng.
            </p>
          )}
          <button
            type="button"
            className="btn"
            disabled={busy || !users.length}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                // Retain inaccessible/inactive assignments until an operator explicitly replaces them through the API.
                if (
                  selected.some((id) => !users.some((user) => user.id === id))
                )
                  throw new Error(
                    'Có nhân sự không còn hoạt động hoặc ngoài 100 kết quả. Cần cập nhật phân công qua API.',
                  );
                const saved = await adminApi<StoryAdmin>(
                  '/api/admin/stories/' +
                    encodeURIComponent(story.id) +
                    '/assignments',
                  'PUT',
                  {
                    revision: story.revision,
                    assignments: users
                      .filter((user) => selected.includes(user.id))
                      .map((user) => ({ userId: user.id, kind: user.role })),
                  },
                );
                onSaved(saved);
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : 'Không thể lưu phân công.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Đang lưu…' : 'Lưu phân công'}
          </button>
        </fieldset>
      )}
      {error && (
        <p className="admin-alert danger" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
