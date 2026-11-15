import {test, expect} from '@playwright/test';
import {reachCounts} from '../lib/learning-report';

test('private reach report filters counts and CSV, distinguishes modes and clears stale graphs', async ({page}) => {
  const communities = [
    {code: 'note', name: 'note link', status: 'link_only', adoptedAt: null},
    {code: 'study-group', name: 'Study group', status: 'pilot', adoptedAt: null},
  ];
  const reports = [
    {month: '2026-11', mode: 'demo', ref: 'note', name: 'note link', ...reachCounts({started: 10, minted: 8, transferred: 4, redeemed: 3, lessonsCompleted: 2, certificate: 1, ticket_mint: 8, ticket_transfer: 4, ticket_redeem: 3}), lessonCompletionRate: .2, certificateRate: .1, feedbackResponses: 2, feedback: [{reason: 'funding', step: 'quiz', responses: 2}]},
    {month: '2026-11', mode: 'devnet', ref: 'note', name: 'note link', ...reachCounts({started: 4, walletConnected: 4, minted: 3, transferred: 2, redeemed: 2, lessonsCompleted: 1, certificate: 1}), lessonCompletionRate: .25, certificateRate: .25, feedbackResponses: 0, feedback: []},
    {month: '2026-11', mode: 'demo', ref: 'study-group', name: 'Study group', ...reachCounts({started: 2, minted: 2}), lessonCompletionRate: 0, certificateRate: 0, feedbackResponses: 0, feedback: []},
  ];
  await page.route('**/api/admin/communities', route => route.fulfill({json: {communities}}));
  await page.route('**/api/admin/monthly?**', route => {
    const url = new URL(route.request().url());
    const rows = reports.filter(row => !url.searchParams.get('ref') || row.ref === url.searchParams.get('ref'))
      .map(row => url.searchParams.get('month') === '2026-11' ? row : {...row, ...reachCounts(), month: '2026-10', lessonCompletionRate: null, certificateRate: null, feedbackResponses: 0, feedback: []});
    return route.fulfill({json: {rows}});
  });
  await page.goto('/admin');
  await expect(page.getByRole('complementary', {name: '集計対象について'})).toContainText('0件は');
  await page.getByLabel('管理用トークン', {exact: true}).fill('fixture-only-token');
  await page.getByLabel('対象月（UTCの開始月）', {exact: true}).fill('2026-11');
  const load = page.getByRole('button', {name: 'レポート・管理表を読み込む', exact: true});
  await load.click();
  const demo = page.getByRole('region', {name: 'シミュレーション', exact: true});
  const devnet = page.getByRole('region', {name: 'Solana Devnet', exact: true});
  await expect(demo.locator('.admin-reach-stage').filter({hasText: '学習開始'})).toContainText('12回');
  await expect(demo.locator('dt').filter({hasText: 'ウォレット接続'})).toHaveCount(0);
  await expect(devnet.locator('.admin-reach-stage').filter({hasText: 'ウォレット接続'})).toContainText('4回');
  await expect(page.getByText('テストSOLの取得 / クイズ：2件', {exact: true})).toBeVisible();
  await page.getByLabel('紹介元', {exact: true}).selectOption('note');
  await expect(demo).toHaveCount(0);
  await load.click();
  await expect(demo.locator('.admin-reach-stage').filter({hasText: 'Mint（発行）'})).toContainText('8回');
  await expect(demo.locator('.admin-reach-stage').filter({hasText: 'Mint（発行）'})).toContainText('80.0%');
  await expect(demo.getByRole('row', {name: 'チケット 8回 4回 3回'})).toBeVisible();
  await page.screenshot({path: `visual-previews/admin-learning-report-${test.info().project.name}.png`, fullPage: true});
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', {name: '表示中の月次CSVをダウンロード', exact: true}).click(),
  ]);
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('ticket_mint');
  expect(csv).not.toContain('study-group');
  expect(csv).not.toContain('fixture-only-token');
  await page.getByLabel('対象月（UTCの開始月）', {exact: true}).fill('2026-10');
  await load.click();
  await expect(demo).toContainText('この条件で記録された学習開始はまだありません');
  await expect(demo.locator('.admin-reach-stage').filter({hasText: '学習開始'})).toContainText('開始に対して —');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', {name: '表示とトークンを消す', exact: true}).click();
  await expect(demo).toHaveCount(0);
  await expect(page.getByLabel('管理用トークン', {exact: true})).toHaveValue('');
  expect(await page.evaluate(() => JSON.stringify({...localStorage, ...sessionStorage}))).not.toContain('fixture-only-token');
});
