import { NextRequest, NextResponse } from 'next/server';
import { scenarios } from '@/lib/scenarios';
import { translate, type Locale } from '@/lib/i18n';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenario = scenarios.find(s => s.id === id);
  if (!scenario && id !== 'certificate') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const language: Locale = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'ja';
  // NextURL normalizes loopback IPs to localhost; retain the actual request Host.
  const origin = process.env.NEXT_PUBLIC_APP_URL ||
    `${req.nextUrl.protocol}//${req.headers.get('host') || req.nextUrl.host}`;
  const image = new URL('/nft-card.png', origin).href;
  return NextResponse.json({
    name: scenario ? `NFTLab ${translate(language, scenario.title)}` : 'NFTLab Sim completion certificate',
    description: 'Self-reported educational practice on Solana Devnet. Not an accredited qualification. No monetary value.',
    image,
    category: 'image',
    external_url: new URL('/', origin).href,
    properties: { files: [{ uri: image, type: 'image/png' }] },
    attributes: [
      { trait_type: 'Network', value: 'Devnet' },
      { trait_type: 'Scenario', value: id },
      { trait_type: 'Purpose', value: 'Educational demo' },
    ],
  }, { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } });
}
