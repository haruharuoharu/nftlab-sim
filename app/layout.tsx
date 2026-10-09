import type { Metadata } from 'next';
import Providers from '@/components/providers';
import '@fontsource-variable/noto-sans-jp';
import './globals.css';
export const metadata:Metadata={title:'NFTLab Sim — Practice before you leap',description:'チケット・来場特典・会員アクセスを安全に練習できる、日英対応のNFTサンドボックス。 A bilingual NFT sandbox for event ticketing, rewards, and member access.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ja"><body><Providers>{children}</Providers></body></html>;}
