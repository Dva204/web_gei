export const MODES = [
  { id: 'light', name: 'Sáng', desc: 'Nền trắng, rõ ràng và thoáng' },
  { id: 'dark', name: 'Tối', desc: 'Nền tối dịu mắt khi đọc ban đêm' },
] as const;
export type Mode = (typeof MODES)[number]['id'];
