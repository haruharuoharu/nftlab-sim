import assert from 'node:assert/strict';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mintAsset, transferAsset, redeemAsset } from '../lib/nft-operations';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { fetchAsset, mplCore } from '@metaplex-foundation/mpl-core';
import { publicKey } from '@metaplex-foundation/umi';
import { devnetClient, mintNft, transferNft, redeemNft } from '../lib/devnet';
import { loadTestKey, requireTestNetwork, testWallet } from './test-wallet';

async function main() {
  const endpoint = process.env.NFTLAB_TEST_RPC || 'https://api.devnet.solana.com';
  const connection = new Connection(endpoint, 'confirmed');
  const local = process.env.NFTLAB_ALLOW_LOCAL === '1' && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(endpoint).hostname);
  await requireTestNetwork(connection, local);
  const client = (wallet: WalletContextState) => local
    ? Promise.resolve(createUmi(endpoint, { commitment: 'confirmed' }).use(mplCore()).use(walletAdapterIdentity(wallet)))
    : devnetClient(endpoint, wallet);
  const mint = async (_: string, wallet: WalletContextState, name: string, uri: string) => local ? mintAsset(await client(wallet), name, uri) : mintNft(endpoint, wallet, name, uri);
  const transfer = async (_: string, wallet: WalletContextState, asset: string, recipient: string) => local ? transferAsset(await client(wallet), asset, recipient) : transferNft(endpoint, wallet, asset, recipient);
  const redeem = async (_: string, wallet: WalletContextState, asset: string) => local ? redeemAsset(await client(wallet), asset) : redeemNft(endpoint, wallet, asset);
  const payer = await loadTestKey();
  if (await connection.getBalance(payer.publicKey) < 0.05 * LAMPORTS_PER_SOL) {
    throw new Error('At least 0.05 test SOL is required; fund the test wallet with a Devnet faucet.');
  }
  const base = process.env.NFTLAB_METADATA_BASE || (local ? 'https://nftlab.invalid' : undefined);
  if (!base || new URL(base).protocol !== 'https:') throw new Error('Set NFTLAB_METADATA_BASE to the public HTTPS app origin.');
  const recipient = Keypair.generate();
  const walletA = testWallet(payer), walletB = testWallet(recipient);
  const signatures: { action: string; signature: string; asset?: string }[] = [];
  signatures.push({ action: 'fund recipient (0.002 test SOL)', signature: await sendAndConfirmTransaction(connection,
    new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient.publicKey, lamports: 2_000_000 })), [payer]) });
  if (local) await assert.rejects(devnetClient(endpoint, walletA), /Devnetではありません/);
  const umi = await client(walletA);
  for (const scenario of ['ticket', 'loyalty', 'membership']) {
    console.log('Running scenario:', scenario, 'on', local ? 'localnet' : 'devnet');
    const minted = await mint(endpoint, walletA, `NFTLab smoke: ${scenario}`, new URL(`/api/metadata/${scenario}`, base).href);
    assert.equal((await fetchAsset(umi, publicKey(minted.asset))).owner, publicKey(payer.publicKey.toBase58()));
    signatures.push({ action: `${scenario}: mint`, ...minted });
    console.log('Mint confirmed:', minted.asset);
    const transferred = await transfer(endpoint, walletA, minted.asset, recipient.publicKey.toBase58());
    assert.equal((await fetchAsset(umi, publicKey(minted.asset))).owner, publicKey(recipient.publicKey.toBase58()));
    signatures.push({ action: `${scenario}: transfer`, asset: minted.asset, ...transferred });
    await assert.rejects(redeem(endpoint, walletA, minted.asset), /所有者|譲渡先/);
    console.log('Transfer confirmed:', minted.asset);
    const returned = await transfer(endpoint, walletB, minted.asset, payer.publicKey.toBase58());
    signatures.push({ action: `${scenario}: return`, asset: minted.asset, ...returned });
    console.log('Return confirmed:', minted.asset);
    const redeemed = await redeem(endpoint, walletA, minted.asset);
    const burnt = await umi.rpc.getAccount(publicKey(minted.asset));
    assert.ok(!burnt.exists || burnt.data[0] === 0, 'Burnt asset must be closed or Uninitialized');
    signatures.push({ action: `${scenario}: redeem`, asset: minted.asset, ...redeemed });
  }
  const certificate = await mint(endpoint, walletA, 'NFTLab Sim completion — smoke test', new URL('/api/metadata/certificate', base).href);
  assert.equal((await fetchAsset(umi, publicKey(certificate.asset))).owner, publicKey(payer.publicKey.toBase58()));
  signatures.push({ action: 'certificate: mint', ...certificate });
  console.log(JSON.stringify({ network: local ? 'localnet (Core cloned from Devnet)' : 'devnet', payer: payer.publicKey.toBase58(), signatures }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
