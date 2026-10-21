const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const CORE_PROGRAM = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d';
type Check = { check: string; status: 'pass' | 'fail' | 'pending'; detail: string };
type Options = { wallet?: string; program?: string; metadataBase?: string };
type Reader = {
  genesis(): Promise<string>;
  balance(address: string): Promise<number>;
  executable(address: string): Promise<boolean>;
  metadata(url: string): Promise<unknown>;
};

// Read-only preflight. A passing result never claims that a signer or real transaction was tested.
export async function checkDevnetReadiness(options: Options, reader: Reader) {
  const checks: Check[] = [];
  const report = () => ({ readOnly: true, wallet: options.wallet, program: options.program, checks,
    corePrerequisitesMet: ['network', 'core', 'balance', 'metadata'].every(name => checks.some(c => c.check === name && c.status === 'pass')),
    anchorPrerequisitesMet: ['network', 'balance', 'anchor'].every(name => checks.some(c => c.check === name && c.status === 'pass')),
    note: '署名・取引送信・Faucet要求・デプロイは実行していません。署名鍵とSolflareの動作は別途検証してください。',
  });
  try {
    if (await reader.genesis() !== DEVNET_GENESIS) {
      checks.push({ check: 'network', status: 'fail', detail: 'Devnet以外のRPCです。ここで確認を停止しました。' });
      return report();
    }
    checks.push({ check: 'network', status: 'pass', detail: 'Devnet Genesis Hashが一致しました。' });
  } catch {
    checks.push({ check: 'network', status: 'fail', detail: 'RPCへ接続できません。接続先・制限・タイムアウトを確認してください。' });
    return report();
  }
  try {
    const deployed = await reader.executable(CORE_PROGRAM);
    checks.push({ check: 'core', status: deployed ? 'pass' : 'fail', detail: deployed ? 'Metaplex Coreは実行可能です。' : 'Metaplex Coreを確認できません。' });
  } catch { checks.push({ check: 'core', status: 'fail', detail: 'CoreのRPC読み取りに失敗しました。' }); }
  if (options.wallet) {
    try {
      const balance = await reader.balance(options.wallet);
      checks.push({ check: 'balance', status: balance >= 50_000_000 ? 'pass' : 'fail',
        detail: `残高 ${balance / 1_000_000_000} テストSOL。自動検証の目安は0.05以上です。Anchorデプロイ費用は含みません。` });
    } catch { checks.push({ check: 'balance', status: 'fail', detail: '残高を取得できません。' }); }
  } else { checks.push({ check: 'balance', status: 'pending', detail: '--walletで公開アドレスを指定してください。' }); }
  if (options.program) {
    try {
      const deployed = await reader.executable(options.program);
      checks.push({ check: 'anchor', status: deployed ? 'pass' : 'fail',
        detail: deployed ? '指定プログラムは実行可能です。内容の一致はtest:anchorで確認してください。' : '指定プログラムは未デプロイ、または実行可能ではありません。' });
    } catch { checks.push({ check: 'anchor', status: 'fail', detail: '指定プログラムのRPC読み取りに失敗しました。' }); }
  } else { checks.push({ check: 'anchor', status: 'pending', detail: 'Anchor検証には--programでデプロイ済みProgram IDを指定します。Core検証には不要です。' }); }
  if (options.metadataBase) {
    try {
      const base = new URL(options.metadataBase);
      if (base.protocol !== 'https:' || base.username || base.password) throw new Error('Invalid metadata origin');
      for (const id of ['ticket', 'loyalty', 'membership', 'certificate']) {
        const metadata = await reader.metadata(new URL(`/api/metadata/${id}`, base).href) as { name?: unknown; image?: unknown };
        if (!metadata || typeof metadata.name !== 'string' || !metadata.name.trim() ||
          typeof metadata.image !== 'string' || new URL(metadata.image).protocol !== 'https:') throw new Error('Invalid metadata');
      }
      checks.push({ check: 'metadata', status: 'pass', detail: '4種類のメタデータJSONとHTTPS画像URLの形式を確認しました。画像の実表示は実機で確認してください。' });
    } catch { checks.push({ check: 'metadata', status: 'fail', detail: '公開HTTPSメタデータの取得・形式を確認できません。' }); }
  } else { checks.push({ check: 'metadata', status: 'pending', detail: '自動Core検証には--metadata-baseで公開HTTPS originを指定します。localhostの手動操作は別途可能です。' }); }
  return report();
}
