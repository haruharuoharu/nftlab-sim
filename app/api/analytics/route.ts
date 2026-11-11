import { analyticsSchema } from '@/lib/analytics';
import { analyticsEnvironment, NO_STORE, publicRefs, registeredRef } from '@/lib/analytics-server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const db=analyticsEnvironment().ANALYTICS_DB;
  if(!db)return Response.json({enabled:false},{headers:NO_STORE});
  try{return Response.json({enabled:true,referrals:await publicRefs(db)},{headers:NO_STORE});}catch{return Response.json({enabled:false},{headers:NO_STORE});}
}
export async function POST(request: Request) {
  const response = (body: unknown, status: number) => Response.json(body, {status, headers: NO_STORE});
  let sameOrigin = false;
  try { const origin = new URL(request.headers.get('origin') || '');
    sameOrigin = ['http:', 'https:'].includes(origin.protocol) && origin.host === request.headers.get('host');
  } catch {}
  // OpenNext can reconstruct an internal URL; validate against the HTTP Host, not that URL.
  if (!sameOrigin) return response({error:'Invalid origin'},403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return response({error:'Invalid content type'},415);
  // Bound the stream, including chunked requests with no Content-Length.
  const reader = request.body?.getReader(); if (!reader) return response({error:'Invalid body'},400);
  let raw = ''; let bytes = 0; const decoder = new TextDecoder();
  try {
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
      if (bytes > 1024) { await reader.cancel(); return response({error:'Too large'},413); }
      raw += decoder.decode(part.value, {stream:true});
    }
    raw += decoder.decode();
    let data: unknown;
    try { data = JSON.parse(raw); } catch { return response({error:'Invalid event'},400); }
    const parsed = analyticsSchema.safeParse(data);
    if (!parsed.success) return response({error:'Invalid event'},400);
    const db = analyticsEnvironment().ANALYTICS_DB;
    if (!db) return response({enabled:false},503);
    const p = parsed.data;
    const ref = await registeredRef(db,p.ref);
    const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p.id));
    const id = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
    // First campaign and cohort day are immutable; retries merge milestones atomically.
    await db.prepare(`INSERT INTO analytics_journeys(id,mode,ref,mask,started_day) VALUES(?,?,?,?,date('now'))
      ON CONFLICT(id) DO UPDATE SET mask = analytics_journeys.mask | excluded.mask
      WHERE analytics_journeys.mode = excluded.mode AND analytics_journeys.ref = excluded.ref`)
      .bind(id,p.mode,ref,p.mask).run();
    return response({accepted:true},200);
  } catch { return response({error:'Measurement unavailable'},503); }
}
