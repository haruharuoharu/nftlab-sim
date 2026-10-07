import { create, transfer, burn, fetchAsset } from '@metaplex-foundation/mpl-core';
import { generateSigner, publicKey, type Umi } from '@metaplex-foundation/umi';
import { sendNftTransaction } from './send-nft-transaction';
import type { TransactionObserver } from './transaction-journal';

// Network-agnostic operations; the application calls these only through devnet.ts.
export async function mintAsset(umi:Umi,name:string,uri:string,observe?:TransactionObserver){
 const asset=generateSigner(umi);
 const effect={asset:String(asset.publicKey),owner:String(umi.identity.publicKey)};
 const signature=await sendNftTransaction(umi,create(umi,{asset,name,uri,owner:umi.identity.publicKey,updateAuthority:umi.identity.publicKey}),effect,observe);
 return {...effect,signature};
}
export async function transferAsset(umi:Umi,address:string,recipient:string,observe?:TransactionObserver){
 const newOwner=publicKey(recipient);
 if(newOwner===umi.identity.publicKey)throw new Error('別のDevnetウォレットのアドレスを入力してください。');
 const asset=await fetchAsset(umi,publicKey(address));
 if(asset.owner!==umi.identity.publicKey)throw new Error('このウォレットはNFTの所有者ではありません。');
 const signature=await sendNftTransaction(umi,transfer(umi,{asset,newOwner}),{asset:address,owner:String(newOwner)},observe);
 return {owner:String(newOwner),signature};
}
export async function redeemAsset(umi:Umi,address:string,observe?:TransactionObserver){
 const asset=await fetchAsset(umi,publicKey(address));
 if(asset.owner!==umi.identity.publicKey)throw new Error('譲渡先のウォレットに切り替えるか、NFTを元のウォレットへ返送してください。');
 const signature=await sendNftTransaction(umi,burn(umi,{asset}),{asset:address,owner:String(umi.identity.publicKey)},observe);
 return {owner:String(umi.identity.publicKey),signature};
}

// Both transfers land atomically: the learner never loses an NFT to a helper
// whose key could disappear on reload. Only its public address is journaled.
export async function practiceTransferAsset(umi:Umi,address:string,observe?:TransactionObserver){
 const asset=await fetchAsset(umi,publicKey(address));
 if(asset.owner!==umi.identity.publicKey)throw new Error('このウォレットはNFTの所有者ではありません。');
 const partner=generateSigner(umi);
 const effect={asset:address,owner:String(umi.identity.publicKey),practicePartner:String(partner.publicKey)};
 const builder=transfer(umi,{asset,newOwner:partner.publicKey,authority:umi.identity})
  .add(transfer(umi,{asset:{...asset,owner:partner.publicKey},newOwner:umi.identity.publicKey,authority:partner}));
 const signature=await sendNftTransaction(umi,builder,effect,observe);
 return {...effect,signature};
}
