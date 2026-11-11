import {feedbackSchema} from '@/lib/community';
import {analyticsEnvironment,limitedJson,NO_STORE,registeredRef,sameOrigin} from '@/lib/analytics-server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Invalid origin'},{status:403,headers:NO_STORE});
 let data;try{data=feedbackSchema.safeParse(await limitedJson(request));}catch{return Response.json({error:'Invalid response'},{status:400,headers:NO_STORE});}
 if(!data.success)return Response.json({error:'Invalid response'},{status:400,headers:NO_STORE});
 const db=analyticsEnvironment().ANALYTICS_DB;if(!db)return Response.json({error:'Not configured'},{status:503,headers:NO_STORE});
 try{const p=data.data;const ref=await registeredRef(db,p.ref);const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p.id));const id=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 await db.prepare('INSERT INTO learning_feedback(id,mode,ref,reason,step,locale) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,p.mode,ref,p.reason,p.step,p.locale).run();
 return Response.json({accepted:true},{headers:NO_STORE});
 }catch{return Response.json({error:'Feedback unavailable'},{status:503,headers:NO_STORE});}
}
