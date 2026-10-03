import { parseArgs } from 'node:util';
import { Connection, PublicKey } from '@solana/web3.js';
import { checkDevnetReadiness } from '../lib/devnet-readiness';

async function main() {
  const { values } = parseArgs({ options: {
    wallet: { type: 'string' }, program: { type: 'string' }, 'metadata-base': { type: 'string' },
  } });
  const wallet = values.wallet || process.env.NFTLAB_CHECK_WALLET;
  const program = values.program || process.env.NFTLAB_TEST_PROGRAM_ID || process.env.NEXT_PUBLIC_ANCHOR_PROGRAM_ID;
  // Validate public addresses before making any request. No signing key is read.
  if (wallet) new PublicKey(wallet);
  if (program) new PublicKey(program);
  const endpoint = process.env.NFTLAB_TEST_RPC || 'https://api.devnet.solana.com';
  const connection = new Connection(endpoint, { commitment: 'confirmed', disableRetryOnRateLimit: true,
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10_000) }),
  });
  const report = await checkDevnetReadiness({ wallet, program,
    metadataBase: values['metadata-base'] || process.env.NFTLAB_METADATA_BASE,
  }, {
    genesis: () => connection.getGenesisHash(),
    balance: address => connection.getBalance(new PublicKey(address)),
    executable: async address => Boolean((await connection.getAccountInfo(new PublicKey(address)))?.executable),
    metadata: async url => {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error('Metadata HTTP request failed');
      return response.json();
    },
  });
  console.log(JSON.stringify(report, null, 2));
  // Missing optional inputs remain pending; RPC errors and insufficient funds fail.
  if (report.checks.some(check => check.status === 'fail')) process.exitCode = 1;
}
main().catch(() => {
  // RPC URLs can contain credentials. Do not echo upstream errors or environment values.
  console.error('Devnet確認を開始できませんでした。公開アドレス・RPC・引数の形式を確認してください。');
  process.exitCode = 1;
});
