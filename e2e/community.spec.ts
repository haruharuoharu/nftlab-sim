import {test,expect} from '@playwright/test';
test('voluntary feedback works without analytics consent, is bilingual and retries with the same ID',async({page})=>{
 await page.route('**/api/analytics',route=>route.fulfill({json:{enabled:true,referrals:['direct','study-group']}}));
 const received:Record<string,unknown>[]=[];
 await page.route('**/api/feedback',route=>{received.push(route.request().postDataJSON());return route.fulfill({status:received.length===1?503:200,json:{accepted:received.length>1}});});
 await page.goto('/?ref=study-group');
 const section=page.getByRole('region',{name:'ひとこと感想',exact:true});
 await section.getByRole('combobox').selectOption('terms');await section.getByRole('button',{name:'感想を送信',exact:true}).click();
 await expect(section.getByRole('status')).toContainText('送信できません');
 await section.getByRole('button',{name:'感想を送信',exact:true}).click();await expect(section.getByRole('status')).toContainText('ありがとうございます');
 expect(received).toHaveLength(2);expect(received[0]).toEqual(received[1]);expect(received[0].ref).toBe('study-group');expect(Object.keys(received[0]).sort()).toEqual(['id','locale','mode','reason','ref','step','version']);
 expect(await page.evaluate(()=>localStorage.getItem('nftlab-analytics-consent-v1'))).toBeNull();
 await page.getByRole('button',{name:'English',exact:true}).click();await expect(page.getByRole('heading',{name:'Quick feedback',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('admin clears data on authorization failure and never persists its token',async({page})=>{
 await page.route('**/api/admin/**',route=>route.fulfill({status:401,json:{error:'Unauthorized'}}));
 await page.goto('/admin');await page.getByLabel('管理用トークン', {exact:true}).fill('test-token');
 await page.getByRole('button',{name:'レポート・管理表を読み込む'}).click();await expect(page.getByRole('status')).toContainText('トークンを確認');
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain('test-token');
 await page.getByRole('button',{name:'表示とトークンを消す'}).click();await expect(page.getByLabel('管理用トークン',{exact:true})).toHaveValue('');
});
