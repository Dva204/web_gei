export type ModuleRow = {
  id: string;
  primary: string;
  secondary: string;
  status?: string;
  meta?: string;
  revision?: number;
  dataKey?: string;
  statusCode?: 301 | 302;
  dataRole?: string;
  originalRole?: string;
};
export function readModuleRows(
  kind: string,
  fallback: ModuleRow[],
): ModuleRow[] {
  try {
    const raw = localStorage.getItem('vuon-admin-module:' + kind);
    if (!raw) return fallback;
    const data: unknown = JSON.parse(raw);
    if (
      Array.isArray(data) &&
      data.length <= 5000 &&
      new Set(data.map((row) => row?.id)).size === data.length &&
      data.every(
        (row) =>
          row &&
          typeof row.id === 'string' &&
          typeof row.primary === 'string' &&
          typeof row.secondary === 'string' &&
          (row.status === undefined || typeof row.status === 'string') &&
          (row.meta === undefined || typeof row.meta === 'string'),
      )
    )
      return data;
  } catch {
    /* Use the demo seed when no valid local snapshot exists. */
  }
  return fallback;
}
export function saveModuleRows(kind: string, rows: ModuleRow[]) {
  try {
    localStorage.setItem('vuon-admin-module:' + kind, JSON.stringify(rows));
  } catch {
    throw new Error(
      'Không thể lưu cấu hình cục bộ. Kiểm tra quyền hoặc dung lượng trình duyệt.',
    );
  }
}
export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
