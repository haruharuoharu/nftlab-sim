import { create, transfer, burn, fetchAsset } from '@metaplex-foundation/mpl-core';
import { generateSigner, publicKey, type Umi } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';

// Network-agnostic operations; the application calls these only through devnet.ts.
export async function mintAsset(umi:Umi,name:string,uri:string){
 const asset=generateSigner(umi);
 const result=await create(umi,{asset,name,uri,owner:umi.identity.publicKey,updateAuthority:umi.identity.publicKey}).sendAndConfirm(umi,{send:{preflightCommitment:'confirmed'},confirm:{commitment:'confirmed'}});
 if(result.result.value.err)throw new Error('Devnetトランザクションが失敗しました。');
 return {asset:String(asset.publicKey),owner:String(umi.identity.publicKey),signature:base58.deserialize(result.signature)[0]};
}
export async function transferAsset(umi:Umi,address:string,recipient:string){
 const newOwner=publicKey(recipient);
 if(newOwner===umi.identity.publicKey)throw new Error('別のDevnetウォレットのアドレスを入力してください。');
 const asset=await fetchAsset(umi,publicKey(address));
 if(asset.owner!==umi.identity.publicKey)throw new Error('このウォレットはNFTの所有者ではありません。');
 const result=await transfer(umi,{asset,newOwner}).sendAndConfirm(umi,{send:{preflightCommitment:'confirmed'},confirm:{commitment:'confirmed'}});
 if(result.result.value.err)throw new Error('Devnetトランザクションが失敗しました。');
 return {owner:String(newOwner),signature:base58.deserialize(result.signature)[0]};
}
export async function redeemAsset(umi:Umi,address:string){
 const asset=await fetchAsset(umi,publicKey(address));
 if(asset.owner!==umi.identity.publicKey)throw new Error('譲渡先のウォレットに切り替えるか、NFTを元のウォレットへ返送してください。');
 const result=await burn(umi,{asset}).sendAndConfirm(umi,{send:{preflightCommitment:'confirmed'},confirm:{commitment:'confirmed'}});
 if(result.result.value.err)throw new Error('Devnetトランザクションが失敗しました。');
 return {owner:String(umi.identity.publicKey),signature:base58.deserialize(result.signature)[0]};
}
