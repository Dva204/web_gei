import fs from 'node:fs';
import path from 'node:path';
const allowed = [
  'src\\styles\\themes',
  'src/styles/themes',
  'src\\app\\fonts.ts',
  'src/app/fonts.ts',
];
const color = /(#[0-9a-fA-F]{3,8}\b|\brgb\()/g;
let bad = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (
      /\.(ts|tsx|css)$/.test(e.name) &&
      !allowed.some((x) => p.includes(x))
    ) {
      const s = fs.readFileSync(p, 'utf8');
      if (color.test(s)) bad.push(p);
    }
  }
}
walk('src');
if (bad.length) {
  console.error('Màu viết cứng ngoài styles/themes:', bad);
  process.exit(1);
}
console.log('Token check: đạt.');
