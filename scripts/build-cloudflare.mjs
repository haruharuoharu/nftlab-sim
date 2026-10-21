import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const config = JSON.parse(readFileSync(new URL('wrangler.json', root), 'utf8'));
// Public build values and browser-only storage must match the deployed Worker.
// In particular, a PC's localhost URL or PostgreSQL settings must not take precedence.
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('node_modules/@opennextjs/cloudflare/dist/cli/index.js', root)), 'build',
], { cwd: fileURLToPath(root), stdio: 'inherit', env: { ...process.env, ...config.vars } });
if (result.error || result.status !== 0) {
  console.error('Cloudflare用ビルドに失敗しました。');
  process.exit(result.status || 1);
}
// OpenNext also copies local .env files into this separate runtime module.
// Keep production, development and test files out of the upload; use wrangler vars instead.
writeFileSync(new URL('.open-next/cloudflare/next-env.mjs', root),
  'export const production = {};\nexport const development = {};\nexport const test = {};\n');
console.log('Cloudflare用ビルド完了。ローカルの.env値はWorkerへ同梱しません。');
