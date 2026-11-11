import { timingSafeEqual } from 'node:crypto';
import { reportSql } from '@/lib/analytics';
import { analyticsEnvironment, NO_STORE } from '@/lib/analytics-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const env = analyticsEnvironment();
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${env.ANALYTICS_REPORT_TOKEN || ''}`);
  if (!env.ANALYTICS_REPORT_TOKEN || actual.length !== expected.length || !timingSafeEqual(actual,expected))
    return Response.json({error:'Unauthorized'},{status:401,headers:NO_STORE});
  if (!env.ANALYTICS_DB) return Response.json({error:'Not configured'},{status:503,headers:NO_STORE});
  const url = new URL(request.url);
  const to = url.searchParams.get('to') || new Date().toISOString().slice(0,10);
  const from = url.searchParams.get('from') || new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  const valid = (day:string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0,10)===day;
  if (!valid(from)||!valid(to)||from>to||Date.parse(to)-Date.parse(from)>89*86400000)
    return Response.json({error:'Use a valid UTC cohort range of at most 90 days'},{status:400,headers:NO_STORE});
  try {
    const {results} = await env.ANALYTICS_DB.prepare(reportSql()).bind(from,to).all();
    const rows = results.map(row => ({...row,
      lessonCompletionRate: Number(row.started) ? Number(row.lessonsCompleted)/Number(row.started) : null,
      certificateRate: Number(row.started) ? Number(row.certificate)/Number(row.started) : null,
    }));
    return Response.json({from,to,basis:'UTC start-day cohort; opted-in practice runs, not unique people; client-reported',rows},{headers:NO_STORE});
  } catch { return Response.json({error:'Report unavailable'},{status:503,headers:NO_STORE}); }
}
