import {adminEnvironment} from '@/lib/admin-auth';
import {communitySchema} from '@/lib/community';
import {limitedJson,NO_STORE,sameOrigin} from '@/lib/analytics-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){const env=adminEnvironment(request);if(!env)return Response.json({error:'Unauthorized'},{status:401,headers:NO_STORE});
 if(!env.ANALYTICS_DB)return Response.json({error:'Not configured'},{status:503,headers:NO_STORE});
 try{const {results}=await env.ANALYTICS_DB.prepare('SELECT code,name,status,adopted_at AS adoptedAt FROM communities ORDER BY code').bind().all();return Response.json({communities:results},{headers:NO_STORE});}catch{return Response.json({error:'Unavailable'},{status:503,headers:NO_STORE});}}
export async function PUT(request:Request){const env=adminEnvironment(request);if(!env)return Response.json({error:'Unauthorized'},{status:401,headers:NO_STORE});
 if(!sameOrigin(request))return Response.json({error:'Invalid origin'},{status:403,headers:NO_STORE});
 let parsed;try{parsed=communitySchema.safeParse(await limitedJson(request));}catch{return Response.json({error:'Invalid community'},{status:400,headers:NO_STORE});}
 if(!parsed.success)return Response.json({error:'Invalid community'},{status:400,headers:NO_STORE});
 if(!env.ANALYTICS_DB)return Response.json({error:'Not configured'},{status:503,headers:NO_STORE});
 try{const p=parsed.data;await env.ANALYTICS_DB.prepare(`INSERT INTO communities(code,name,status,adopted_at) VALUES(?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name,status=excluded.status,adopted_at=excluded.adopted_at,updated_at=CURRENT_TIMESTAMP`).bind(p.code,p.name,p.status,p.adoptedAt).run();return Response.json({saved:true},{headers:NO_STORE});}catch{return Response.json({error:'Unavailable'},{status:503,headers:NO_STORE});}}
