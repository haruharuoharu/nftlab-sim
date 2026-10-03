import { Buffer } from 'buffer';
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction, VersionedTransaction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { devnetClient } from './devnet';
import bs58 from 'bs58';
import type { TransactionObserver } from './transaction-journal';
// Optional self-reported receipt program, enabled only after an operator deploys it.
export async function recordReceipt(endpoint:string,wallet:WalletContextState,programAddress:string,observe?:TransactionObserver){
 await devnetClient(endpoint,wallet);
 return recordReceiptOnConnection(new Connection(endpoint,'confirmed'),wallet,programAddress,observe);
}
// Shared by the Devnet wrapper and the local-chain integration test.
export async function recordReceiptOnConnection(connection:Connection,wallet:WalletContextState,programAddress:string,observe?:TransactionObserver){
 if(!wallet.publicKey||!wallet.signTransaction)throw new Error('ウォレットを接続してください。');
 const programId=new PublicKey(programAddress);
 const info=await connection.getAccountInfo(programId);if(!info?.executable)throw new Error('学習記録プログラムがDevnetにデプロイされていません。');
 const [receipt]=PublicKey.findProgramAddressSync([new TextEncoder().encode('progress'),wallet.publicKey.toBytes()],programId);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('global:record_scenario'));
 const discriminator=new Uint8Array(digest).slice(0,8);const tx=new Transaction();
 for(let i=0;i<3;i++){const data=new Uint8Array(9);data.set(discriminator);data[8]=i;tx.add(new TransactionInstruction({programId,keys:[{pubkey:receipt,isSigner:false,isWritable:true},{pubkey:wallet.publicKey,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],data:Buffer.from(data)}));}
 const blockhash=await connection.getLatestBlockhash();tx.recentBlockhash=blockhash.blockhash;tx.feePayer=wallet.publicKey;
 const signed=await wallet.signTransaction!(tx);
 if(!signed.signature)throw new Error('取引に署名できませんでした。');
 const signature=bs58.encode(signed.signature);
 const simulation=await connection.simulateTransaction(new VersionedTransaction(signed.compileMessage(),signed.signatures.map(item=>new Uint8Array(item.signature!))),{sigVerify:true,commitment:'confirmed'});
 if(simulation.value.err)throw new Error('学習記録の事前確認に失敗しました。');
 observe?.({asset:receipt.toBase58(),owner:wallet.publicKey.toBase58(),signer:wallet.publicKey.toBase58(),signature,...blockhash});
 const sent=await connection.sendRawTransaction(signed.serialize(),{preflightCommitment:'confirmed'});
 if(sent!==signature)throw new Error('RPCの取引署名が一致しません。保存した署名を再確認してください。');
 const confirmation=await connection.confirmTransaction({...blockhash,signature},'confirmed');if(confirmation.value.err)throw new Error('学習記録トランザクションが失敗しました。');
 return signature;
}
