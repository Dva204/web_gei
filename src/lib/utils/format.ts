export const formatNumber = (n: number) =>
  new Intl.NumberFormat('vi-VN', {
    notation: n > 999 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(n);
export const formatDate = (s: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(s));
