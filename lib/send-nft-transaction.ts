import type { TransactionBuilder, Umi } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import type { TransactionObserver } from './transaction-journal';

export async function sendNftTransaction(umi: Umi, builder: TransactionBuilder,
  effect: { asset: string; owner: string }, observe?: TransactionObserver) {
  const blockhash = await umi.rpc.getLatestBlockhash({ commitment: 'confirmed' });
  const transaction = await builder.setBlockhash(blockhash).buildAndSign(umi);
  const signature = base58.deserialize(transaction.signatures[0])[0];
  // Reject known failures before creating a pending record. Neither signing nor
  // simulation broadcasts the transaction. Storage failure must also stop send.
  const simulation = await umi.rpc.simulateTransaction(transaction, { verifySignatures: true });
  if (simulation.err) throw new Error('取引の事前確認に失敗しました。テストSOLとNFTの所有者を確認してください。');
  observe?.({ ...effect, signer: String(umi.identity.publicKey), signature,
    blockhash: String(blockhash.blockhash), lastValidBlockHeight: Number(blockhash.lastValidBlockHeight) });
  const sent = await umi.rpc.sendTransaction(transaction, { preflightCommitment: 'confirmed' });
  if (base58.deserialize(sent)[0] !== signature) throw new Error('RPCの取引署名が一致しません。保存した署名を再確認してください。');
  const result = await umi.rpc.confirmTransaction(sent,
    { commitment: 'confirmed', strategy: { type: 'blockhash', ...blockhash } });
  if (result.value.err) throw new Error('Devnet取引が失敗しました。保存した署名の状況を再確認してください。');
  return signature;
}
