import fs from 'node:fs';
const styles = fs.readFileSync(
  new URL('../src/styles/themes/site.css', import.meta.url),
  'utf8',
);
const pairs = [];
for (const mode of ['light', 'dark']) {
  const block = styles.match(
    new RegExp("\\[data-mode='" + mode + "'\\]\\s*\\{([^}]+)\\}"),
  )?.[1];
  if (!block) throw new Error('Missing theme: ' + mode);
  const tokens = Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map((match) => [
      match[1],
      match[2],
    ]),
  );
  for (const [background, foreground] of [
    ['bg', 'text'],
    ['surface', 'text'],
    ['surface-2', 'text-muted'],
    ['surface', 'accent'],
    ['accent', 'accent-contrast'],
    ['mint-large', 'mint-ink'],
  ]) {
    if (!tokens[background] || !tokens[foreground])
      throw new Error(
        'Missing contrast token: ' + background + '/' + foreground,
      );
    pairs.push([
      mode + ' ' + background + '/' + foreground,
      tokens[background],
      tokens[foreground],
    ]);
  }
}
const lum = (hex) => {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
for (const [name, background, foreground] of pairs) {
  const a = lum(background),
    b = lum(foreground),
    ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  console.log(name, ratio.toFixed(2));
  if (ratio < 4.5) process.exitCode = 1;
}
if (!process.exitCode)
  console.log(
    'Contrast check: các cặp token đã kiểm tra đạt 4.5:1. Không thay thế kiểm tra giao diện thực tế.',
  );
