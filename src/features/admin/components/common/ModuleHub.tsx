'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { PageHeader, StatusBadge } from './AdminUI';
import { Modal } from '@/shared/components/ui/Modal';
import {
  listChapterReports,
  listChatReports,
  listModerationComments,
  listTakedowns,
  moderateComment,
  updateChapterReport,
  updateTakedown,
} from '@/features/admin/services/moderation';
import {
  getSettings,
  getStats,
  listAudit,
  listUsers,
  saveSettings,
  sanctionUser,
  changeRole,
  exportAll,
  listManagedContent,
  listManagedRedirects,
  saveManagedContent,
  saveManagedRedirect,
} from '@/features/admin/services/operations';
import { getAdminSession } from '@/features/admin/services/auth';
import { can } from '@/features/admin/lib/permissions';
import {
  readModuleRows,
  saveModuleRows,
  downloadJson,
  type ModuleRow as Row,
} from '@/features/admin/lib/moduleRows';
import { writeAudit } from '@/features/admin/mocks/store';
import type { Role, SiteSettings } from '@/features/admin/types';
const configs = {
  taxonomy: ['Thể loại và nhãn', 'Sắp xếp, gộp và quản lý các nhóm nội dung.'],
  authors: ['Tác giả', 'Hồ sơ tác giả và số truyện đang sử dụng.'],
  comments: [
    'Kiểm duyệt bình luận',
    'Duyệt nhanh hàng đợi và bảo vệ cuộc trò chuyện lành mạnh.',
  ],
  reports: [
    'Báo lỗi chap',
    'Theo dõi lỗi hiển thị, thiếu chap và yêu cầu chỉnh sửa.',
  ],
  takedowns: [
    'Yêu cầu gỡ nội dung',
    'Ưu tiên hạn phản hồi và lưu đầy đủ nhật ký xử lý.',
  ],
  chat: ['Kiểm duyệt chat', 'Quản lý phòng và tin nhắn bị báo cáo.'],
  users: [
    'Người dùng và vai trò',
    'Tìm thành viên, xử phạt và cấp quyền có kiểm soát.',
  ],
  ads: ['Quảng cáo', 'Vị trí hiển thị và chiến dịch trực tiếp.'],
  affiliate: [
    'Affiliate',
    'Liên kết theo dõi, lượt click và doanh thu nhập tay.',
  ],
  stats: ['Thống kê', 'Hiệu quả nội dung và hành vi đọc.'],
  seo: ['SEO', 'Ghi đè metadata, chuyển hướng 301 và trạng thái sitemap.'],
  content: ['Nội dung trang', 'Đề cử, banner, thông báo và trang tĩnh.'],
  settings: ['Cài đặt', 'Cấu hình chung cho website và cộng đồng.'],
  audit: [
    'Nhật ký hoạt động',
    'Dòng thời gian chỉ đọc của mọi thao tác quản trị.',
  ],
  backup: [
    'Sao lưu và xuất dữ liệu',
    'Xuất dữ liệu và duy trì nguyên tắc sao lưu 3-2-1.',
  ],
} as const;

export type ModuleKind = keyof typeof configs;
const editable = ['taxonomy', 'authors', 'seo', 'content'];
const access: Record<ModuleKind, string> = {
  taxonomy: 'taxonomy.manage',
  authors: 'taxonomy.manage',
  comments: 'comments.moderate',
  reports: 'reports.view',
  takedowns: 'takedowns.view',
  chat: 'chat.manage',
  users: 'users.sanction',
  ads: 'ads.manage',
  affiliate: 'ads.manage',
  stats: 'stats.content',
  seo: 'seo.manage',
  content: 'content.manage',
  settings: 'settings.manage',
  audit: 'audit.own',
  backup: 'backup.manage',
};
export function ModuleHub({ kind }: { kind: ModuleKind }) {
  const [title, description] = configs[kind];
  const [rows, setRows] = useState<Row[]>([]),
    [settings, setSettingsState] = useState<SiteSettings | null>(null),
    [toast, setToast] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState(''),
    [selected, setSelected] = useState<Row | null>(null),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState('');
  function requirePermission(permission = access[kind]) {
    if (!can(getAdminSession(), permission))
      throw new Error(
        'Vai trò hiện tại không có quyền thực hiện thao tác này.',
      );
  }
  const load = useCallback(async (): Promise<{
    rows?: Row[];
    settings?: SiteSettings;
  }> => {
    if (!can(getAdminSession(), access[kind]))
      throw new Error('Bạn không có quyền xem mục này.');
    if (kind === 'comments') {
      const result = await listModerationComments({ pageSize: 100 });
      return {
        rows: result.items.map((item) => ({
          id: item.id,
          primary: item.user.name,
          secondary: item.content,
          status: item.status,
          meta:
            item.reportCount + ' báo cáo · Chap ' + (item.chapterNumber || '—'),
        })),
      };
    }
    if (kind === 'reports') {
      const result = await listChapterReports({ pageSize: 100 });
      return {
        rows: result.items.map((item) => ({
          id: item.id,
          primary: 'Truyện ' + item.storyId + ' · Chap ' + item.chapterNumber,
          secondary: item.message,
          status: item.status,
          meta: item.type,
        })),
      };
    }
    if (kind === 'takedowns') {
      const result = await listTakedowns({ pageSize: 100 });
      return {
        rows: result.items.map((item) => ({
          id: item.id,
          primary: item.requesterName,
          secondary: item.description,
          status: item.status,
          meta:
            'Hạn xử lý: ' + new Date(item.dueAt).toLocaleDateString('vi-VN'),
        })),
      };
    }
    if (kind === 'chat') {
      const result = await listChatReports({ pageSize: 100 });
      return {
        rows: result.items.map((item) => ({
          id: item.id,
          primary: item.message.user,
          secondary: item.message.content,
          status: item.status,
          meta: item.reason + ' · ' + item.roomId,
        })),
      };
    }
    if (kind === 'users') {
      const result = await listUsers({ pageSize: 100 });
      return {
        rows: result.items.map((item) => ({
          id: item.id,
          primary: item.name,
          secondary: item.email,
          status: item.status,
          meta: `${item.role} · ${new Date(item.createdAt).toLocaleDateString('vi-VN')}`,
          dataRole: item.role,
          originalRole: item.role,
        })),
      };
    }
    if (kind === 'audit') {
      const result = await listAudit({});
      return {
        rows: result.items.map((item) => ({
          id: item.id,
          primary: item.summary,
          secondary: item.objectType + ' · ' + item.objectId,
          meta: new Date(item.at).toLocaleString('vi-VN'),
        })),
      };
    }
    if (kind === 'settings') return { settings: await getSettings() };
    if (kind === 'content') {
      const items = await listManagedContent();
      return { rows: items.map((item) => ({ id: item.id, primary: item.title, secondary: item.content, status: item.enabled ? 'visible' : 'hidden', meta: item.key, dataKey: item.key, revision: item.revision })) };
    }
    if (kind === 'seo') {
      const items = await listManagedRedirects();
      return { rows: items.map((item) => ({ id: item.id, primary: item.sourcePath, secondary: item.targetPath, status: item.enabled ? 'visible' : 'hidden', meta: `${item.statusCode} · ${item.hitCount} lượt`, revision: item.revision, statusCode: item.statusCode })) };
    }
    if (kind === 'stats') {
      const stats = await getStats('30d');
      return { rows: [
        { id: 'summary', primary: `${stats.views.toLocaleString('vi-VN')} lượt xem`, secondary: `${stats.readers.toLocaleString('vi-VN')} trình duyệt trong 30 ngày`, meta: `${stats.previousDelta >= 0 ? '+' : ''}${stats.previousDelta}% so với kỳ trước` },
        ...stats.topStories.map((item, index) => ({ id: `story-${index}`, primary: item.name, secondary: `${item.views.toLocaleString('vi-VN')} lượt xem tổng`, meta: `Top ${index + 1}` })),
      ] };
    }
    if (kind === 'backup')
      return {
        rows: [
          {
            id: 'catalog',
            primary: 'Xuất danh mục truyện mẫu',
            secondary:
              'JSON · chỉ thông tin truyện, không chứa ảnh chap hoặc dữ liệu máy chủ.',
            meta: 'Đây không phải bản sao lưu toàn hệ thống.',
          },
        ],
      };
    const seed: Row[] =
      kind === 'taxonomy' || kind === 'authors'
        ? Array.from({ length: 8 }, (_, index) => ({
            id: String(index),
            primary:
              kind === 'taxonomy'
                ? ['Hiện đại', 'Cổ đại', 'Chữa lành', 'Học đường'][index % 4]
                : 'Tác giả hư cấu ' + (index + 1),
            secondary: 3 + index * 2 + ' truyện mẫu',
            status: 'visible',
            meta: 'Thứ tự ' + (index + 1),
          }))
        : [];
    return {
      rows: editable.includes(kind) ? readModuleRows(kind, seed) : seed,
    };
  }, [kind]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRows([]);
    setSettingsState(null);
    setQuery('');
    setStatus('');
    setSelected(null);
    void load()
      .then((result) => {
        if (active) {
          setRows(result.rows || []);
          setSettingsState(result.settings || null);
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);
  async function act(
    row: Row,
    action:
      'approve' | 'hide' | 'fixed' | 'takedown' | 'resolve' | 'delete_message' | 'pin_message' | 'mute' | 'ban' | 'restore',
  ) {
    if (busy) return;
    if (['comments', 'reports', 'takedowns', 'chat'].includes(kind) && reason.trim().length < 3) {
      setError('Cần nhập lý do xử lý ít nhất 3 ký tự.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      requirePermission(
        action === 'takedown'
          ? 'takedowns.hide'
          : kind === 'reports'
            ? 'reports.manage'
            : access[kind],
      );
      let nextStatus = row.status;
      if (kind === 'comments') {
        await moderateComment(row.id, action === 'hide' ? 'hide' : 'approve', reason);
        nextStatus = action === 'hide' ? 'hidden' : 'visible';
      } else if (kind === 'reports') {
        await updateChapterReport(row.id, { status: 'fixed', resolutionNote: reason });
        nextStatus = 'fixed';
      } else if (kind === 'takedowns') {
        await updateTakedown(row.id, {
          status: 'content_hidden',
          logNote: reason,
        });
        nextStatus = 'content_hidden';
      } else if (kind === 'chat') {
        const { resolveChatReport } =
          await import('@/features/admin/services/moderation');
        await resolveChatReport(row.id, reason, action === 'delete_message' || action === 'pin_message' ? action : 'resolve');
        nextStatus = 'resolved';
      } else if (kind === 'users') {
        const updated = await sanctionUser(row.id, action === 'restore' ? 'restore' : action === 'mute' ? 'mute' : 'ban', {
          reason,
        });
        nextStatus = updated.status;
      }
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, status: nextStatus } : item,
        ),
      );
      setToast(['comments', 'reports', 'takedowns', 'chat', 'users'].includes(kind) ? 'Đã cập nhật backend và ghi nhật ký kiểm duyệt.' : 'Đã cập nhật dữ liệu demo.');
      setSelected(null);
      setReason('');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportCatalog() {
    setBusy(true);
    setError('');
    try {
      requirePermission('backup.manage');
      const blob = await exportAll();
      downloadJson(JSON.parse(await blob.text()), 'vuon-danh-muc-demo.json');
      setToast('Đã xuất danh mục JSON. Không bao gồm ảnh chap.');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = rows.filter(
    (row) =>
      (!status || row.status === status) &&
      (row.primary + ' ' + row.secondary + ' ' + (row.meta || ''))
        .toLocaleLowerCase('vi')
        .includes(query.toLocaleLowerCase('vi')),
  );
  if (loading)
    return (
      <>
        <PageHeader title={title} description={description} />
        <p role="status">Đang tải dữ liệu…</p>
      </>
    );
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          editable.includes(kind) ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelected({
                  id: crypto.randomUUID(),
                  primary: '',
                  secondary: '',
                  status: 'visible',
                });
                setEditing(true);
                setError('');
              }}
            >
              <Plus size={17} />
              Thêm mới
            </button>
          ) : kind === 'backup' ? (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void exportCatalog()}
            >
              <Download size={17} />
              Xuất danh mục JSON
            </button>
          ) : undefined
        }
      />
      <p className="admin-alert">
        {['comments', 'reports', 'takedowns', 'chat', 'users', 'settings', 'stats', 'seo', 'content', 'audit', 'backup'].includes(kind)
          ? 'Dữ liệu thật từ PostgreSQL. Mọi thao tác xử lý cần lý do và được ghi vào nhật ký.'
          : 'Các cấu hình chưa nối backend vẫn chỉ lưu cục bộ để thử giao diện.'}
      </p>
      {toast && (
        <p className="admin-alert success" role="status">
          {toast}
        </p>
      )}
      {error && (
        <p className="admin-alert danger" role="alert">
          {error}
        </p>
      )}
      {kind === 'settings' && settings ? (
        <form
          className="admin-card settings-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              requirePermission();
              const saved = await saveSettings(settings);
              setSettingsState(saved);
              setToast(
                'Đã lưu cấu hình website vào PostgreSQL.',
              );
            } catch (failure) {
              setError((failure as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-two">
            <label>
              Tên website
              <input
                required
                value={settings.siteName}
                onChange={(event) =>
                  setSettingsState({
                    ...settings,
                    siteName: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Email liên hệ
              <input
                type="email"
                required
                value={settings.contactEmail}
                onChange={(event) =>
                  setSettingsState({
                    ...settings,
                    contactEmail: event.target.value,
                  })
                }
              />
            </label>
          </div>
          {[
            ['chatEnabled', 'Bật chat'],
            ['commentsEnabled', 'Bật bình luận'],
            ['commentPremoderation', 'Duyệt trước bình luận'],
            ['adsEnabled', 'Bật quảng cáo'],
          ].map(([key, label]) => (
            <label className="switch-row" key={key}>
              <span>
                <strong>{label}</strong>
                <small>
                  Áp dụng cho toàn bộ website sau khi lưu.
                </small>
              </span>
              <input
                type="checkbox"
                checked={Boolean(settings[key as keyof SiteSettings])}
                onChange={(event) =>
                  setSettingsState({ ...settings, [key]: event.target.checked })
                }
              />
            </label>
          ))}
          <label>
            Số ngày nhắc sao lưu
            <input
              type="number"
              min="1"
              max="365"
              required
              value={settings.backupReminderDays}
              onChange={(event) =>
                setSettingsState({
                  ...settings,
                  backupReminderDays: Number(event.target.value),
                })
              }
            />
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
        </form>
      ) : (
        <>
          <div className="admin-toolbar">
            <label className="admin-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Tìm trong danh sách"
                placeholder="Tìm trong danh sách…"
              />
            </label>
            <select
              value={status}
              aria-label="Lọc trạng thái"
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {[...new Set(rows.map((row) => row.status).filter(Boolean))].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
            <button
              className="btn"
              disabled={!filtered.length}
              onClick={() =>
                downloadJson(
                  { module: kind, demo: true, rows: filtered },
                  'vuon-' + kind + '-demo.json',
                )
              }
            >
              <Download size={17} />
              Xuất danh sách
            </button>
          </div>
          {!filtered.length && (
            <p className="admin-empty">Không có dữ liệu phù hợp.</p>
          )}
          <div className="admin-list">
            {filtered.map((row) => (
              <article className="admin-list-row" key={row.id}>
                <div className="list-main">
                  <span>
                    <strong>{row.primary}</strong>
                    <p>{row.secondary}</p>
                    <small>{row.meta}</small>
                  </span>
                </div>
                {row.status && <StatusBadge value={row.status} />}
                <div className="row-actions">
                  <button
                    className="btn"
                    onClick={() => {
                      setSelected({ ...row });
                      setEditing(editable.includes(kind));
                      setReason('');
                      setError('');
                    }}
                  >
                    {editable.includes(kind) ? 'Chỉnh sửa' : 'Chi tiết'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <Modal
        open={Boolean(selected)}
        title={editing ? 'Chỉnh sửa · ' + title : 'Chi tiết · ' + title}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
      >
        {selected &&
          (editing ? (
            <form
              className="admin-form mt-4 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError('');
                setBusy(true);
                try {
                  requirePermission();
                  const row = {
                    ...selected,
                    primary: selected.primary.trim(),
                    secondary: selected.secondary.trim(),
                  };
                  if (!row.primary) throw new Error('Cần nhập tên.');
                  let savedRow = row;
                  if (kind === 'content') {
                    const saved = await saveManagedContent({
                      ...(row.revision ? { id: row.id, revision: row.revision } : {}),
                      key: row.dataKey || `page.${row.primary.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
                      title: row.primary,
                      content: row.secondary,
                      enabled: row.status !== 'hidden',
                    });
                    savedRow = { id: saved.id, primary: saved.title, secondary: saved.content, status: saved.enabled ? 'visible' : 'hidden', meta: saved.key, dataKey: saved.key, revision: saved.revision };
                  } else if (kind === 'seo') {
                    const saved = await saveManagedRedirect({ ...(row.revision ? { id: row.id, revision: row.revision } : {}), sourcePath: row.primary, targetPath: row.secondary, statusCode: row.statusCode || 301, enabled: row.status !== 'hidden' });
                    savedRow = { id: saved.id, primary: saved.sourcePath, secondary: saved.targetPath, status: saved.enabled ? 'visible' : 'hidden', meta: `${saved.statusCode} · ${saved.hitCount} lượt`, revision: saved.revision, statusCode: saved.statusCode };
                  }
                  const nextRows = rows.some((item) => item.id === row.id)
                    ? rows.map((item) => (item.id === row.id ? savedRow : item))
                    : [...rows, savedRow];
                  if (kind !== 'content' && kind !== 'seo') saveModuleRows(kind, nextRows);
                  setRows(nextRows);
                  if (kind !== 'content' && kind !== 'seo') writeAudit('save', kind, row.id, 'Lưu cấu hình FE: ' + row.primary);
                  setSelected(null);
                  setToast(kind === 'content' || kind === 'seo' ? 'Đã lưu vào PostgreSQL.' : 'Đã lưu cấu hình mẫu trên trình duyệt này.');
                } catch (failure) {
                  setError((failure as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Tên / đường dẫn
                <input
                  className="btn mt-2 w-full text-left"
                  required
                  maxLength={200}
                  value={selected.primary}
                  onChange={(event) =>
                    setSelected({ ...selected, primary: event.target.value })
                  }
                />
              </label>
              <label>
                Mô tả / giá trị
                <textarea
                  className="btn mt-2 w-full text-left"
                  rows={4}
                  maxLength={4000}
                  value={selected.secondary}
                  onChange={(event) =>
                    setSelected({ ...selected, secondary: event.target.value })
                  }
                />
              </label>
              <label>
                Trạng thái
                <select
                  className="btn mt-2 w-full"
                  value={selected.status}
                  onChange={(event) =>
                    setSelected({ ...selected, status: event.target.value })
                  }
                >
                  <option value="visible">Hiện</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </label>
              <button className="btn btn-primary">Lưu cục bộ</button>
              {error && <p role="alert">{error}</p>}
            </form>
          ) : (
            <div className="mt-4 grid gap-4">
              <h3 className="font-semibold">{selected.primary}</h3>
              <p className="whitespace-pre-wrap break-words">
                {selected.secondary}
              </p>
              <p className="muted">{selected.meta}</p>
              {selected.status && <StatusBadge value={selected.status} />}
              {['comments', 'reports', 'takedowns', 'chat'].includes(kind) && (
                <label>
                  Lý do xử lý
                  <textarea className="btn mt-2 w-full text-left" required minLength={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} />
                </label>
              )}
              {kind === 'comments' && (
                <div className="flex gap-2"><button className="btn btn-primary" disabled={busy || selected.status === 'visible' || reason.trim().length < 3} onClick={() => void act(selected, 'approve')}>Duyệt hiển thị</button><button className="btn" disabled={busy || selected.status === 'hidden' || reason.trim().length < 3} onClick={() => void act(selected, 'hide')}>Ẩn bình luận</button></div>
              )}
              {kind === 'reports' && can(getAdminSession(), 'reports.manage') && (
                <button className="btn btn-primary" disabled={busy || selected.status === 'fixed' || reason.trim().length < 3} onClick={() => void act(selected, 'fixed')}>Xác nhận đã sửa</button>
              )}
              {kind === 'takedowns' && (
                <button
                  className="btn"
                  disabled={busy || selected.status === 'content_hidden' || reason.trim().length < 3}
                  onClick={() => void act(selected, 'takedown')}
                >
                  Xác nhận ẩn nội dung
                </button>
              )}
              {kind === 'chat' && (
                <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy || selected.status === 'resolved' || reason.trim().length < 3} onClick={() => void act(selected, 'resolve')}>Xác nhận đã xử lý</button><button className="btn" disabled={busy || reason.trim().length < 3} onClick={() => void act(selected, 'delete_message')}>Gỡ tin nhắn</button><button className="btn" disabled={busy || reason.trim().length < 3} onClick={() => void act(selected, 'pin_message')}>Ghim tin nhắn</button></div>
              )}
              {kind === 'users' && (
                <>
                  <label>
                    Lý do xử lý
                    <textarea
                      className="btn mt-2 w-full text-left"
                      value={reason}
                      minLength={8}
                      maxLength={500}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </label>
                  {selected.status === 'active' ? <div className="flex flex-wrap gap-2">
                    <button className="btn" disabled={busy || reason.trim().length < 8} onClick={() => void act(selected, 'mute')}>Tạm khóa tài khoản</button>
                    {can(getAdminSession(), 'users.roles') && <button className="btn" disabled={busy || reason.trim().length < 8} onClick={() => void act(selected, 'ban')}>Vô hiệu hóa tài khoản</button>}
                  </div> : <button className="btn" disabled={busy || reason.trim().length < 8} onClick={() => void act(selected, 'restore')}>Khôi phục tài khoản</button>}
                  {can(getAdminSession(), 'users.roles') && (
                    <div className="grid gap-2">
                      <label>
                        Vai trò
                        <select className="btn mt-2 w-full" value={selected.dataRole || 'member'} onChange={(event) => setSelected({ ...selected, dataRole: event.target.value })}>
                          <option value="member">Thành viên</option><option value="author">Tác giả</option><option value="beta">Beta</option><option value="editor">Biên tập</option><option value="mod">Điều hành</option><option value="admin">Quản trị viên</option>
                        </select>
                      </label>
                      <button className="btn btn-primary" disabled={busy || reason.trim().length < 8 || selected.dataRole === selected.originalRole} onClick={async () => {
                        setBusy(true); setError('');
                        try {
                          const updated = await changeRole(selected.id, (selected.dataRole || 'member') as Role, reason);
                          setRows((current) => current.map((item) => item.id === selected.id ? { ...item, dataRole: updated.role, originalRole: updated.role, meta: `${updated.role} · ${new Date(updated.createdAt).toLocaleDateString('vi-VN')}` } : item));
                          setSelected(null); setReason(''); setToast('Đã đổi vai trò, thu hồi các phiên cũ và ghi audit.');
                        } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
                      }}>Lưu vai trò</button>
                    </div>
                  )}
                  <Link
                    className="btn"
                    href={'/admin/nguoi-dung/' + selected.id}
                  >
                    Xem hồ sơ
                  </Link>
                </>
              )}
              {kind === 'backup' && (
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => void exportCatalog()}
                >
                  Xuất danh mục JSON
                </button>
              )}
              {error && <p role="alert">{error}</p>}
            </div>
          ))}
      </Modal>
    </>
  );
}
