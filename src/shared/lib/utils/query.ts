export function positiveInteger(value: unknown, fallback = 1) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}
