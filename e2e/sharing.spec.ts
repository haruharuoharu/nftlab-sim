import { test, expect } from '@playwright/test';

const id = '6J8sX1je9fFSfLjQo4G8aUCNLAq93e8Q4oNDU8uixo4j';
const url = `https://explorer.solana.com/address/${id}?cluster=devnet`;
for (const locale of ['ja', 'en'] as const) {
  for (const behavior of ['success', 'closed', 'failed', 'unavailable'] as const) {
    test(`${locale} certificate sharing: ${behavior}, copy fallback and retained progress`, async ({ page, context }) => {
      await context.addInitScript(({ id, behavior }) => {
        localStorage.setItem('nftlab-v1-devnet', JSON.stringify({version:1,records:{ticket:{stage:'redeemed'},loyalty:{stage:'redeemed'},membership:{stage:'redeemed'}},certificate:{id,date:'2026-10-07T05:00:00.000Z'}}));
        Object.defineProperty(navigator, 'share', {configurable:true,value:behavior==='unavailable'?undefined:async(data:ShareData)=>{
          sessionStorage.setItem('share-payload', JSON.stringify(data));
          if(behavior!=='success') throw new DOMException('Test share result', behavior==='closed'?'AbortError':'NotAllowedError');
        }});
        Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:async(text:string)=>{
          if(sessionStorage.getItem('deny-copy')) throw new DOMException('Copy blocked','NotAllowedError');
          sessionStorage.setItem('copied',text);
        }}});
      }, {id, behavior});
      await page.goto(`/?lang=${locale}`);
      await page.getByRole('button',{name:locale==='en'?'Try on Devnet ↗':'Devnetで体験 ↗',exact:true}).click();
      const certificate=page.locator('.certificate');
      const before=await page.evaluate(()=>localStorage.getItem('nftlab-v1-devnet'));
      const share=certificate.getByRole('button',{name:locale==='en'?'Share certificate ↗':'修了証を共有 ↗',exact:true});
      const copy=certificate.getByRole('button',{name:locale==='en'?'Copy certificate details and link':'修了証の情報とリンクをコピー',exact:true});
      // Sharing an existing certificate works without reconnecting a wallet.
      await expect(share).toBeEnabled();
      await share.click();
      const status=certificate.getByRole('status');
      const expected=behavior==='success'?(locale==='en'?'Sharing action completed.':'共有操作を完了しました。')
        :behavior==='closed'?(locale==='en'?'Sharing closed.':'共有を終了しました。')
        :behavior==='failed'?(locale==='en'?'Could not open sharing.':'共有を開けませんでした。')
        :(locale==='en'?'Certificate details and link copied.':'修了証の情報とリンクをコピーしました。');
      await expect(status).toContainText(expected);
      if(behavior!=='unavailable') expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('share-payload')!).url)).toBe(url);
      if(behavior==='closed') expect(await page.evaluate(()=>sessionStorage.getItem('copied'))).toBeNull();
      await copy.click();
      await expect(status).toContainText(locale==='en'?'Certificate details and link copied.':'修了証の情報とリンクをコピーしました。');
      expect(await page.evaluate(()=>sessionStorage.getItem('copied'))).toContain(url);
      await page.evaluate(()=>sessionStorage.setItem('deny-copy','1'));
      await copy.click();
      const field=certificate.getByRole('textbox',{name:locale==='en'?'Sharing text':'共有用テキスト',exact:true});
      await expect(field).toHaveValue(new RegExp(id));
      await certificate.getByRole('button',{name:locale==='en'?'Select text':'テキストを選択',exact:true}).click();
      expect(await field.evaluate((element:HTMLTextAreaElement)=>element.selectionEnd-element.selectionStart)).toBe((await field.inputValue()).length);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(await page.evaluate(()=>localStorage.getItem('nftlab-v1-devnet'))).toBe(before);
    });
  }
}
