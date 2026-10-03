import { test, expect } from '@playwright/test';
test('learn, simulate, earn certificate, retain progress and isolate modes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 const metadataResponse=await page.request.get('/api/metadata/ticket');expect(metadataResponse.status()).toBe(200);const metadata=await metadataResponse.json();expect(metadata.image).toBe(new URL('/nft-card.svg',metadataResponse.url()).href);
 await expect(page.getByRole('button',{name:'ロイヤルティ特典',exact:false})).toBeDisabled();
 // An incorrect answer does not unlock the sandbox.
 await page.locator('fieldset').nth(0).getByRole('radio').nth(0).check();
 await page.locator('fieldset').nth(1).getByRole('radio').nth(1).check();
 await page.getByRole('button',{name:'回答して体験を解放',exact:false}).click();
 await expect(page.getByText('解説を確認して、もう一度挑戦しましょう。')).toBeVisible();
 const answers=[[1,0],[2,0],[1,2]];
 for(let i=0;i<3;i++){
  for(let j=0;j<2;j++)await page.locator('fieldset').nth(j).getByRole('radio').nth(answers[i][j]).check();
  await page.getByRole('button',{name:'回答して体験を解放',exact:false}).click();
  for(const name of ['NFTを発行する','NFTを譲渡する','NFTを利用・消費する'])await page.getByRole('button',{name,exact:false}).click();
  if(i<2)await page.getByRole('button',{name:'次のシナリオへ',exact:false}).click();
 }
 await page.getByRole('button',{name:'修了証を発行',exact:false}).click();
 await expect(page.getByRole('button',{name:'修了証を共有',exact:false})).toBeVisible();
 if(process.env.DATABASE_URL){
  await expect(page.getByText('PostgreSQLに同期',{exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(async()=>{const response=await fetch('/api/progress?namespace=demo');return (await response.json()).progress?.certificate?.id??'';})).toContain('SIM-CERT-');
  await page.evaluate(()=>localStorage.removeItem('nftlab-v1-demo'));
 }
 await page.waitForTimeout(500);await page.reload();
 await expect(page.getByRole('button',{name:'修了証を共有',exact:false})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Devnetで体験',exact:false}).click();
 await expect(page.getByRole('button',{name:'回答して体験を解放',exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'あと3つで解放',exact:false})).toBeDisabled();
 expect(errors).toEqual([]);
});
