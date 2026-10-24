import 'server-only';
import { ApiError } from '../http/errors';

export function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const configured = process.env.AUTH_TRUSTED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean) || [];
  const allowed = configured.length ? configured : process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : [];
  if (!origin || !allowed.includes(origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ApiError('FORBIDDEN', 'Nguồn gửi yêu cầu không được phép.');
  }
  let url: URL;
  try { url = new URL(origin); } catch { throw new ApiError('FORBIDDEN', 'Nguồn gửi yêu cầu không hợp lệ.'); }
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== origin || (url.protocol !== 'https:' && !localHttp)) {
    throw new ApiError('FORBIDDEN', 'Nguồn gửi yêu cầu không hợp lệ.');
  }
}
export async function readAuthJson(request: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new ApiError('INVALID_REQUEST', 'Yêu cầu phải dùng JSON.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('INVALID_REQUEST', 'Thiếu nội dung yêu cầu.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError('INVALID_REQUEST', 'Nội dung yêu cầu quá lớn.');
      }
      chunks.push(chunk.value);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid shape');
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('INVALID_REQUEST', 'JSON không hợp lệ.');
  } finally { reader.releaseLock(); }
}

const state = globalThis as typeof globalThis & { authPasswordWork?: number };
export async function withPasswordCapacity<T>(operation: () => Promise<T>): Promise<T> {
  if ((state.authPasswordWork || 0) >= 2) throw new ApiError('SERVICE_UNAVAILABLE', 'Đăng nhập đang bận. Vui lòng thử lại.');
  state.authPasswordWork = (state.authPasswordWork || 0) + 1;
  try { return await operation(); } finally { state.authPasswordWork -= 1; }
}
