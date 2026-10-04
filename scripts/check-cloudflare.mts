import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkPublicApp } from './check-public-app.mjs';
import { freshProgress } from '../lib/scenarios';

const root = new URL('../', import.meta.url);
const origin = 'http://127.0.0.1:8787';
assert.equal(readFileSync(new URL('.open-next/cloudflare/next-env.mjs', root), 'utf8'),
  'export const production = {};\nexport const development = {};\nexport const test = {};\n', 'Workerにローカルの.env値が残っています。');
const server = spawn(process.execPath, [
  fileURLToPath(new URL('node_modules/wrangler/bin/wrangler.js', root)),
  'dev', '--local', '--ip', '127.0.0.1', '--port', '8787',
], { cwd: fileURLToPath(root), stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' } });
let logs = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { logs = (logs + chunk).slice(-12_000); });
try {
  let ready = false;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline && server.exitCode === null) {
    try { ready = (await fetch(origin, { signal: AbortSignal.timeout(1_000) })).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Workersローカルプレビューが起動しません。');
  await checkPublicApp(origin);
  const get = await fetch(`${origin}/api/progress`, { signal: AbortSignal.timeout(10_000) });
  assert.equal(get.status, 200);
  assert.deepEqual(await get.json(), { storage: 'browser', progress: null });
  const put = (requestOrigin: string) => fetch(`${origin}/api/progress?namespace=devnet`, {
    method: 'PUT', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify(freshProgress()), signal: AbortSignal.timeout(10_000),
  });
  const saved = await put(origin);
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { storage: 'browser' });
  assert.equal((await put('https://other.example')).status, 403);
  console.log('成功: Workers上の保存API・Origin検査・ローカル.envの除外を確認しました。Devnetへの送信はありません。');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Cloudflare確認に失敗しました。');
  console.error(logs);
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
}
