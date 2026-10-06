import { test, expect } from '@playwright/test';
import { JOURNAL_KEY } from '../lib/transaction-journal';
import { LOCALE_KEY } from '../lib/i18n';

test('English journey, live switching, sharing and reload preserve progress', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { sessionStorage.setItem('shared-certificate', JSON.stringify(data)); } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '日本語', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(/lang=en/);
  await expect(page.getByRole('heading', { name: 'First, a 2-question quiz' })).toBeVisible();
  await page.locator('fieldset').nth(0).getByRole('radio').nth(0).check();
  await page.locator('fieldset').nth(1).getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'Submit answers and unlock', exact: false }).click();
  await expect(page.getByText('Read the explanations and try again.')).toBeVisible();
  // Switching with answers and feedback present must not reset either.
  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await expect(page.getByText('解説を確認して、もう一度挑戦しましょう。')).toBeVisible();
  await expect(page.locator('fieldset').nth(0).getByRole('radio').nth(0)).toBeChecked();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const answers = [[1, 0], [2, 0], [1, 2]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) await page.locator('fieldset').nth(j).getByRole('radio').nth(answers[i][j]).check();
    await page.getByRole('button', { name: 'Submit answers and unlock', exact: false }).click();
    for (const name of ['Mint NFT', 'Transfer NFT', 'Redeem and burn NFT']) await page.getByRole('button', { name, exact: false }).click();
    if (i < 2) await page.getByRole('button', { name: 'Next scenario', exact: false }).click();
  }
  await page.getByRole('button', { name: 'Mint certificate', exact: false }).click();
  const certificate = await page.evaluate(() => JSON.parse(localStorage.getItem('nftlab-v1-demo')!).certificate.id);
  await page.getByRole('button', { name: 'Share certificate', exact: false }).click();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('shared-certificate')!).text)).toContain(`I completed 3 NFT scenarios with NFTLab Sim! Simulation certificate: ${certificate}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Share certificate', exact: false })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await expect(page.getByRole('button', { name: '修了証を共有', exact: false })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('nftlab-v1-demo')!).certificate.id)).toBe(certificate);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/?lang=ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  expect(errors).toEqual([]);
});

test('English Devnet recovery and certificate survive switching without sends', async ({ page, context }) => {
  let sends = 0;
  await context.route('https://api.devnet.solana.com/**', async route => { sends++; await route.abort(); });
  await context.addInitScript(({ localeKey, journalKey }) => {
    const progress = { version: 1, records: { ticket: { stage: 'redeemed' }, loyalty: { stage: 'redeemed' }, membership: { stage: 'redeemed' } }, certificate: { id: '6J8sX1je9fFSfLjQo4G8aUCNLAq93e8Q4oNDU8uixo4j', date: '2026-10-03T15:01:16.000Z' } };
    localStorage.setItem(localeKey, 'ja');
    localStorage.setItem('nftlab-v1-devnet', JSON.stringify(progress));
    localStorage.setItem(journalKey, '{bad json');
  }, { localeKey: LOCALE_KEY, journalKey: JOURNAL_KEY });
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Try on Devnet', exact: false }).click();
  await expect(page.getByText('Could not read the pending transaction record. New transactions are paused.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share certificate', exact: false })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reset progress' })).toBeDisabled();
  const saved = await page.evaluate(key => ({ progress: localStorage.getItem('nftlab-v1-devnet'), journal: localStorage.getItem(key) }), JOURNAL_KEY);
  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await expect(page.getByText('確認待ち取引の保存内容を読み取れません。新しい取引を停止しています。')).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select wallet' })).toBeVisible();
  expect(await page.evaluate(key => ({ progress: localStorage.getItem('nftlab-v1-devnet'), journal: localStorage.getItem(key) }), JOURNAL_KEY)).toEqual(saved);
  // Only the language control should contain Japanese in the English UI.
  expect((await page.locator('main').innerText()).replace('日本語', '')).not.toMatch(/[ぁ-んァ-ヶ一-龠]/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(sends).toBe(0);
});

test('explicit English works when local storage is unavailable', async ({ page, context }) => {
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await page.goto('/?lang=en');
  await expect(page.getByRole('heading', { name: 'First, a 2-question quiz' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: '日本語', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
