import {test,expect} from '@playwright/test';

test('optional referral measurement follows successful simulation, survives reload, and stops on withdrawal',async({page})=>{
 const events:{mask:number;ref:string;id:string;mode:string}[]=[];
 await page.route('**/api/analytics',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{enabled:true}});
  const event=route.request().postDataJSON();
  expect(Object.keys(event).sort()).toEqual(['id','mask','mode','ref','version']);
  events.push(event);return route.fulfill({json:{accepted:true}});
 });
 await page.goto('/?ref=note');
 await expect(page.getByRole('button',{name:'学習計測に協力する',exact:true})).toBeVisible();
 expect(events.length).toBe(0);
 await page.getByRole('button',{name:'学習計測に協力する',exact:true}).click();
 const answers=[[1,0],[2,0],[1,2]];
 for(let i=0;i<3;i++){
  for(let j=0;j<2;j++)await page.locator('fieldset').nth(j).getByRole('radio').nth(answers[i][j]).check();
  await page.getByRole('button',{name:'回答して体験を解放',exact:false}).click();
  for(const name of ['NFTを発行する','NFTを譲渡する','NFTを利用・消費する'])await page.getByRole('button',{name,exact:false}).click();
  if(i<2)await page.getByRole('button',{name:'次のシナリオへ',exact:false}).click();
 }
 await page.getByRole('button',{name:'修了証を発行',exact:false}).click();
 await expect.poll(()=>events.at(-1)?.mask).toBe(4093); // all simulation milestones; wallet bit absent
 expect(events.every(e=>e.ref==='note'&&e.mode==='demo'&&e.id===events[0].id)).toBe(true);
 await page.waitForTimeout(500);await page.goto('/?ref=colosseum');
 await expect(page.getByRole('button',{name:'学習計測：オン',exact:false})).toBeVisible();
 await expect.poll(()=>events.at(-1)?.ref).toBe('note');
 await page.getByRole('button',{name:'English',exact:true}).click();
 await page.getByRole('button',{name:'Measurement: on',exact:false}).click();
 const count=events.length;
 page.on('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Reset progress',exact:true}).click();
 await page.locator('fieldset').nth(0).getByRole('radio').nth(1).check();
 await page.locator('fieldset').nth(1).getByRole('radio').nth(0).check();
 await page.getByRole('button',{name:'Submit answers',exact:false}).click();
 await page.waitForTimeout(300);expect(events.length).toBe(count);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
