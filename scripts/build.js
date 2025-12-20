import { build, context } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const watch = args.has('--watch');

const langDir = path.resolve('src', 'localize', 'lang');
const locales = {};

if (fs.existsSync(langDir)) {
  for (const file of fs.readdirSync(langDir)) {
    if (!file.toLowerCase().endsWith('.json')) continue;
    const code = file.replace(/\.json$/i, '').toLowerCase();
    const raw = fs.readFileSync(path.join(langDir, file), 'utf8');
    const data = JSON.parse(raw);
    const normalized = data?.[code] ?? data?.en ?? data;
    locales[code] = normalized;
  }
}

const banner = Object.keys(locales).length
  ? `globalThis.FCC_LOCALES = ${JSON.stringify(locales)};`
  : '';

const buildOptions = {
  entryPoints: ['src/flex-cells-card.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/flex-cells-card.js',
  minify: true,
  banner: { js: banner },
};

if (watch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log('[build] watching for changes...');
} else {
  await build(buildOptions);
  console.log('[build] done');
}
