import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mintAsset, transferAsset, redeemAsset } from './nft-operations';
import { Connection } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export async function devnetClient(endpoint:string,wallet:WalletContextState){
 if(!wallet.publicKey||!wallet.signTransaction)throw new Error('Devnetのウォレットを接続してください。');
 const connection=new Connection(endpoint,'confirmed');
 if(await connection.getGenesisHash()!==GENESIS)throw new Error('このRPCはSolana Devnetではありません。');
 return createUmi(connection).use(mplCore()).use(walletAdapterIdentity(wallet));
}
export async function mintNft(endpoint:string,wallet:WalletContextState,name:string,uri:string){
 return mintAsset(await devnetClient(endpoint,wallet),name,uri);
}
export async function transferNft(endpoint:string,wallet:WalletContextState,address:string,recipient:string){
 return transferAsset(await devnetClient(endpoint,wallet),address,recipient);
}
export async function redeemNft(endpoint:string,wallet:WalletContextState,address:string){
 return redeemAsset(await devnetClient(endpoint,wallet),address);
}
