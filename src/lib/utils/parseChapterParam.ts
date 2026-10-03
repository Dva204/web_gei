export function parseChapterParam(param: string) {
  const match = /^chap-(\d+)$/.exec(param);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
