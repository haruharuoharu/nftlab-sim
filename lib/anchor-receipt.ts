import { Buffer } from 'buffer';
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { devnetClient } from './devnet';
// Optional self-reported receipt program, enabled only after an operator deploys it.
export async function recordReceipt(endpoint:string,wallet:WalletContextState,programAddress:string){
 await devnetClient(endpoint,wallet);
 if(!wallet.publicKey)throw new Error('ウォレットを接続してください。');
 const connection=new Connection(endpoint,'confirmed');const programId=new PublicKey(programAddress);
 const info=await connection.getAccountInfo(programId);if(!info?.executable)throw new Error('学習記録プログラムがDevnetにデプロイされていません。');
 const [receipt]=PublicKey.findProgramAddressSync([new TextEncoder().encode('progress'),wallet.publicKey.toBytes()],programId);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('global:record_scenario'));
 const discriminator=new Uint8Array(digest).slice(0,8);const tx=new Transaction();
 for(let i=0;i<3;i++){const data=new Uint8Array(9);data.set(discriminator);data[8]=i;tx.add(new TransactionInstruction({programId,keys:[{pubkey:receipt,isSigner:false,isWritable:true},{pubkey:wallet.publicKey,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],data:Buffer.from(data)}));}
 const blockhash=await connection.getLatestBlockhash();tx.recentBlockhash=blockhash.blockhash;tx.feePayer=wallet.publicKey;
 const signature=await wallet.sendTransaction(tx,connection);const confirmation=await connection.confirmTransaction({...blockhash,signature},'confirmed');if(confirmation.value.err)throw new Error('学習記録トランザクションが失敗しました。');
 return signature;
}
