import { normalizeVi } from './normalizeVi';
export function generateSlug(value: string) {
  return normalizeVi(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
