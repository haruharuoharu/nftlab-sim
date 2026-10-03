import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { create, transfer, burn, fetchAsset, mplCore } from '@metaplex-foundation/mpl-core';
import { generateSigner, publicKey } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { Connection } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export async function devnetClient(endpoint:string,wallet:WalletContextState){
 if(!wallet.publicKey||!wallet.signTransaction)throw new Error('Devnetのウォレットを接続してください。');
 const connection=new Connection(endpoint,'confirmed');
 if(await connection.getGenesisHash()!==GENESIS)throw new Error('このRPCはSolana Devnetではありません。');
 return createUmi(endpoint).use(mplCore()).use(walletAdapterIdentity(wallet));
}
export async function mintNft(endpoint:string,wallet:WalletContextState,name:string,uri:string){
 const umi=await devnetClient(endpoint,wallet);const asset=generateSigner(umi);
 const result=await create(umi,{asset,name,uri,owner:umi.identity.publicKey,updateAuthority:umi.identity.publicKey}).sendAndConfirm(umi,{confirm:{commitment:'confirmed'}});
 if(result.result.value.err)throw new Error('Devnetトランザクションが失敗しました。');
 return {asset:String(asset.publicKey),owner:String(umi.identity.publicKey),signature:base58.deserialize(result.signature)[0]};
}
export async function transferNft(endpoint:string,wallet:WalletContextState,address:string,recipient:string){
 const umi=await devnetClient(endpoint,wallet);const newOwner=publicKey(recipient);
 if(newOwner===umi.identity.publicKey)throw new Error('別のDevnetウォレットのアドレスを入力してください。');
 const asset=await fetchAsset(umi,publicKey(address));
 if(asset.owner!==umi.identity.publicKey)throw new Error('このウォレットはNFTの所有者ではありません。');
 const result=await transfer(umi,{asset,newOwner}).sendAndConfirm(umi,{confirm:{commitment:'confirmed'}});
 if(result.result.value.err)throw new Error('Devnetトランザクションが失敗しました。');
 return {owner:String(newOwner),signature:base58.deserialize(result.signature)[0]};
}
export async function redeemNft(endpoint:string,wallet:WalletContextState,address:string){
 const umi=await devnetClient(endpoint,wallet);const asset=await fetchAsset(umi,publicKey(address));
 if(asset.owner!==umi.identity.publicKey)throw new Error('譲渡先のウォレットに切り替えるか、NFTを元のウォレットへ返送してください。');
 const result=await burn(umi,{asset}).sendAndConfirm(umi,{confirm:{commitment:'confirmed'}});
 if(result.result.value.err)throw new Error('Devnetトランザクションが失敗しました。');
 return {owner:String(umi.identity.publicKey),signature:base58.deserialize(result.signature)[0]};
}
