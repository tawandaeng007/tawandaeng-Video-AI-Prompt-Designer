const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = new Set();
function inspect(relative) {
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(root + path.sep)) throw new Error(`Asset outside project: ${relative}`);
  const normalized = path.relative(root, absolute).replaceAll(path.sep, '/');
  if (files.has(normalized)) return;
  if (!fs.existsSync(absolute)) throw new Error(`Missing asset: ${normalized}`);
  files.add(normalized);
  if (!/\.(?:html|css)$/i.test(normalized)) return;
  const source = fs.readFileSync(absolute, 'utf8');
  const references = [
    ...source.matchAll(/(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi),
    ...source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi),
    ...source.matchAll(/["']([^"'<>\r\n]+\.(?:png|jpg|jpeg|webp|svg|gif|mp4|woff2?|ttf))["']/gi)
  ];
  for (const [, value] of references) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(value) || value.includes('${')) continue;
    const asset = decodeURIComponent(value.split(/[?#]/)[0].replaceAll('&amp;', '&'));
    if (asset) inspect(path.join(path.dirname(normalized), asset));
  }
}
inspect('index.html');
inspect('resume.html');
for (const file of ['tests/portfolio-content.cjs', 'tests/resume-interactions.cjs', 'tests/deployment-assets.cjs', 'card/brand-assets.md']) inspect(file);
const manifest = [...files].sort();
if (process.argv.includes('--check-index')) {
  const indexed = new Set(cp.execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0'));
  const missing = manifest.filter(file => !indexed.has(file));
  if (missing.length) throw new Error(`Assets not staged/tracked: ${missing.join(', ')}`);
}
console.log(JSON.stringify({ files: manifest, count: manifest.length, bytes: manifest.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0) }, null, 2));
