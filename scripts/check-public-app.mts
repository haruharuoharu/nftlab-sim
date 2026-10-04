import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { scenarios } from '../lib/scenarios';

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export async function checkPublicApp(origin: string) {
  const images = new Set<string>();
  const request = (path: string) => fetch(new URL(path, origin), { signal: AbortSignal.timeout(10_000) });
  const page = await request('/');
  assert.equal(page.status, 200, '画面がHTTP 200で応答しません。');
  assert.match(await page.text(), /NFTLab Sim/, '画面のタイトルを確認できません。');
  for (const id of [...scenarios.map(s => s.id), 'certificate']) {
    const response = await request(`/api/metadata/${id}`);
    assert.equal(response.status, 200, `${id}: メタデータを取得できません。`);
    assert.match(response.headers.get('content-type') || '', /application\/json/);
    const data = await response.json();
    assert.equal(data.name, id === 'certificate' ? 'NFTLab Sim completion certificate' : `NFTLab ${scenarios.find(s => s.id === id)!.title}`);
    assert.equal(data.category, 'image');
    assert.equal(new URL(data.image).origin, origin, '画像URLが公開先のoriginと一致しません。');
    assert.ok(data.attributes.some((a: { trait_type: string; value: string }) => a.trait_type === 'Network' && a.value === 'Devnet'));
    assert.deepEqual(data.properties.files, [{ uri: data.image, type: 'image/png' }]);
    images.add(data.image);
  }
  for (const url of images) {
    const response = await request(url);
    assert.equal(response.status, 200, 'NFT画像を取得できません。');
    assert.match(response.headers.get('content-type') || '', /^image\/png\b/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.subarray(0, 8).equals(pngSignature), 'PNG画像の実データを確認できません。');
    assert.equal(bytes.subarray(12, 16).toString(), 'IHDR');
    assert.equal(bytes.readUInt32BE(16), 800);
    assert.equal(bytes.readUInt32BE(20), 800);
  }
  assert.equal((await request('/api/metadata/unknown')).status, 404);
  console.log('成功: 画面・4種類のメタデータ・800×800 PNGの取得・未定義IDの404を確認しました。');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values, positionals } = parseArgs({ options: { local: { type: 'boolean' } }, allowPositionals: true });
    assert.equal(positionals.length, 1, 'npm run check:public -- https://公開URL の形式で指定してください。');
    const base = new URL(positionals[0]);
    const local = values.local && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    assert.ok(base.protocol === 'https:' || (local && base.protocol === 'http:'), '公開URLはHTTPSを指定してください。');
    assert.ok(!base.username && !base.password && base.pathname === '/' && !base.search && !base.hash, '公開URLはoriginのみを指定してください。');
    await checkPublicApp(base.origin);
  } catch (error) {
    console.error(error instanceof assert.AssertionError ? error.message : '公開アプリの取得に失敗しました。URL・接続・タイムアウトを確認してください。');
    process.exitCode = 1;
  }
}
