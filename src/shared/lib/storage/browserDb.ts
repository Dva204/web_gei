const DATABASE = 'vuon-comics-fe';
const TABLE = 'records';
async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined')
    throw new Error('Trình duyệt không hỗ trợ lưu ảnh cục bộ.');
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(TABLE, { keyPath: 'key' });
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(
        new Error(
          'Không thể mở kho ảnh cục bộ. Kiểm tra quyền lưu trữ của trình duyệt.',
        ),
      );
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Hãy đóng tab cũ rồi thử lại để mở kho ảnh.'));
    };
  });
}
export async function readBrowserRecord<T>(
  key: string,
): Promise<T | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(TABLE, 'readonly');
      const request = transaction.objectStore(TABLE).get(key);
      transaction.oncomplete = () =>
        resolve(request.result?.value as T | undefined);
      transaction.onabort = () =>
        reject(new Error('Không thể đọc dữ liệu cục bộ.'));
    });
  } finally {
    database.close();
  }
}
export async function writeBrowserRecords(
  records: { key: string; value: unknown }[],
  overwrite = true,
  indexUpdate?:
    { key: string; numbers: number[] } | { key: string; numbers: number[] }[],
) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(TABLE, 'readwrite'),
        table = transaction.objectStore(TABLE);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(
          new Error(
            transaction.error?.name === 'ConstraintError'
              ? 'Chap đã tồn tại. Không nhập đè dữ liệu.'
              : 'Không thể lưu ảnh. Dung lượng trình duyệt có thể đã đầy.',
          ),
        );
      try {
        for (const record of records) {
          if (overwrite) table.put(record);
          else table.add(record);
        }
        for (const index of indexUpdate
          ? Array.isArray(indexUpdate)
            ? indexUpdate
            : [indexUpdate]
          : []) {
          const request = table.get(index.key);
          request.onsuccess = () =>
            table.put({
              key: index.key,
              value: [
                ...new Set([
                  ...(request.result?.value || []),
                  ...index.numbers,
                ]),
              ].sort((a, b) => a - b),
            });
        }
      } catch {
        // A synchronous DataCloneError must also roll back earlier requests.
        transaction.abort();
        reject(
          new Error('Không thể lưu dữ liệu ảnh. Không có chap nào được nhập.'),
        );
      }
    });
  } finally {
    database.close();
  }
  window.dispatchEvent(new Event('vuon-comics-change'));
  try {
    localStorage.setItem('vuon-comics-revision', String(Date.now()));
  } catch {
    /* IndexedDB remains the source of truth. */
  }
}
