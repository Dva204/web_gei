import { describe, expect, it } from 'vitest';
import { normalizeVi } from './normalizeVi';
describe('normalizeVi', () => {
  it('removes Vietnamese marks', () =>
    expect(normalizeVi('Tổng tài Đẹp')).toBe('tong tai dep'));
});
