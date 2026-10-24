export async function adminApi<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || !('data' in result))
    throw new Error(
      result?.error?.message || 'Không kết nối được máy chủ. Hãy thử lại.',
    );
  return result.data as T;
}
export function queryString(input: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return '?' + params.toString();
}
