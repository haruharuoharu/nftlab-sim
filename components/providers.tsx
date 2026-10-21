"use client";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import type { ReactNode } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';
import LanguageProvider from './language-provider';
export const endpoint=process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const wallets:never[]=[];
export default function Providers({children}:{children:ReactNode}){return <LanguageProvider><ConnectionProvider endpoint={endpoint}><WalletProvider wallets={wallets} autoConnect={false}><WalletModalProvider>{children}</WalletModalProvider></WalletProvider></ConnectionProvider></LanguageProvider>;}
