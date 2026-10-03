import type { Metadata } from 'next';
import Providers from '@/components/providers';
import '@fontsource-variable/noto-sans-jp';
import './globals.css';
export const metadata:Metadata={title:'NFTLab Sim — Practice before you leap',description:'NFTをクイズと実践で学ぶサンドボックス。'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ja"><body><Providers>{children}</Providers></body></html>;}
