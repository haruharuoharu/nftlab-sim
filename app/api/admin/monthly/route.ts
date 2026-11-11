import {adminEnvironment} from '@/lib/admin-auth';
import {reportSql} from '@/lib/analytics';
import {monthRange,monthlyCsv} from '@/lib/community';
import {NO_STORE} from '@/lib/analytics-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const env=adminEnvironment(request);if(!env)return Response.json({error:'Unauthorized'},{status:401,headers:NO_STORE});
 if(!env.ANALYTICS_DB)return Response.json({error:'Not configured'},{status:503,headers:NO_STORE});
 const url=new URL(request.url);const month=url.searchParams.get('month')||new Date().toISOString().slice(0,7);let range;
 try{range=monthRange(month);}catch{return Response.json({error:'Invalid month'},{status:400,headers:NO_STORE});}
 const ref=url.searchParams.get('ref');
 try{
 const db=env.ANALYTICS_DB;
 const [{results:counts},{results:communities},{results:feedback}]=await Promise.all([
 db.prepare(reportSql()).bind(range.from,range.to).all(),
 db.prepare('SELECT code,name,status,adopted_at AS adoptedAt FROM communities').bind().all(),
 db.prepare('SELECT mode,ref,reason,step,COUNT(*) AS responses FROM learning_feedback WHERE submitted_day >= ? AND submitted_day <= ? GROUP BY mode,ref,reason,step').bind(range.from,range.to).all(),
 ]);
 // Include registered communities with zero starts, rather than hiding inactive pilots.
 const refs=[...new Set(['direct',...communities.map(c=>String(c.code)),...counts.map(c=>String(c.ref)),...feedback.map(c=>String(c.ref))])].filter(r=>!ref||r===ref);
 const rows=refs.flatMap(code=>['demo','devnet'].map(mode=>{const c=communities.find(c=>c.code===code);const n=counts.find(n=>n.mode===mode&&n.ref===code)||{};const f=feedback.filter(f=>f.mode===mode&&f.ref===code);const started=Number(n.started)||0;
 return {...n,month,mode,ref:code,name:c?.name||code,status:c?.status||'link_only',adoptedAt:c?.adoptedAt||null,started,lessonsCompleted:Number(n.lessonsCompleted)||0,certificate:Number(n.certificate)||0,
 lessonCompletionRate:started?Number(n.lessonsCompleted)/started:null,certificateRate:started?Number(n.certificate)/started:null,feedbackResponses:f.reduce((sum,r)=>sum+Number(r.responses),0),feedback:f};}));
 if(url.searchParams.get('format')==='csv')return new Response(monthlyCsv(rows),{headers:{...NO_STORE,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="nftlab-${month}.csv"`}});
 return Response.json({month,...range,generatedAt:new Date().toISOString(),basis:'UTC start cohort; opted-in practice runs, not people. Feedback counted by submission day and not linked to runs. Community status is current administrator record, not historical verification.',adoptedCommunities:communities.filter(c=>c.status==='adopted'&&(!ref||c.code===ref)).length,rows},{headers:NO_STORE});
 }catch{return Response.json({error:'Report unavailable'},{status:503,headers:NO_STORE});}
}
