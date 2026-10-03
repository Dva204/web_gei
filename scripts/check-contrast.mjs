const pairs = [
  ['light', '#ffffff', '#18181b'],
  ['dark neon', '#05070d', '#eafbff'],
];
const lum = (h) => {
  const v = h
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
for (const [n, a, b] of pairs) {
  const x = lum(a),
    y = lum(b),
    r = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  console.log(n, r.toFixed(2));
  if (r < 4.5) process.exitCode = 1;
}
if (!process.exitCode)
  console.log('Contrast check: hai giao diện đạt WCAG AA.');
