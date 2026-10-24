import 'server-only';
import { ApiError } from '../http/errors';
import { validPassword } from './password';

export function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') throw new ApiError('INVALID_REQUEST', 'Email không hợp lệ.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email)) {
    throw new ApiError('INVALID_REQUEST', 'Email không hợp lệ.');
  }
  return email;
}
export function credentials(body: Record<string, unknown>, register = false) {
  const allowed = register ? ['name', 'email', 'password'] : ['email', 'password', 'audience'];
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    throw new ApiError('INVALID_REQUEST', 'Yêu cầu có trường không được hỗ trợ.');
  }
  const email = normalizeEmail(body.email);
  if (!validPassword(body.password)) throw new ApiError('INVALID_REQUEST', 'Mật khẩu cần từ 12 đến 128 ký tự.');
  const name = register && typeof body.name === 'string' ? body.name.trim() : '';
  if (register && (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name))) {
    throw new ApiError('INVALID_REQUEST', 'Tên hiển thị cần từ 2 đến 80 ký tự.');
  }
  if (!register && body.audience !== undefined && !['reader', 'admin'].includes(String(body.audience))) {
    throw new ApiError('INVALID_REQUEST', 'Loại đăng nhập không hợp lệ.');
  }
  return { email, password: body.password, name, admin: !register && body.audience === 'admin' };
}
