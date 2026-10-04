import { NextRequest, NextResponse } from 'next/server';
import { scenarios } from '@/lib/scenarios';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenario = scenarios.find(s => s.id === id);
  if (!scenario && id !== 'certificate') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const image = new URL('/nft-card.png', origin).href;
  return NextResponse.json({
    name: scenario ? `NFTLab ${scenario.title}` : 'NFTLab Sim completion certificate',
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
