export function chapterNumberFromPath(path: string): number | null {
  const match = path.match(/(?:^|[\/\\])chap[-_\s]*(\d+)(?=[\/\\_.\s-]|$)/i);
  const number = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
export function importWarnings(
  numbers: number[],
  existing: number[],
): string[] {
  const warnings: string[] = [];
  if (new Set(numbers).size !== numbers.length)
    warnings.push('Có số chap trùng trong bản nhập.');
  if (numbers.some((number) => !Number.isSafeInteger(number) || number < 1))
    warnings.push('Số chap phải là số nguyên dương.');
  if (numbers.some((number) => existing.includes(number)))
    warnings.push('Có chap đã tồn tại. Hãy đổi số; không nhập đè.');
  return warnings;
}
