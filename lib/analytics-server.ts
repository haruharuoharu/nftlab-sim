import { getCloudflareContext } from '@opennextjs/cloudflare';
// Minimal binding interface avoids adding a global Workers type dependency to Next.js.
export interface AnalyticsDatabase {
  prepare(sql: string): {bind(...values: unknown[]): {run(): Promise<unknown>; all(): Promise<{results: Record<string, unknown>[]}>}};
}
export function analyticsEnvironment() {
  try { return getCloudflareContext().env as unknown as {ANALYTICS_DB?: AnalyticsDatabase; ANALYTICS_REPORT_TOKEN?: string}; }
  catch { return {} as {ANALYTICS_DB?: AnalyticsDatabase; ANALYTICS_REPORT_TOKEN?: string}; }
}
export const NO_STORE = {'Cache-Control': 'no-store', 'Vary': 'Authorization'};

export async function registeredRef(db:AnalyticsDatabase, value:string){
 if(value==='direct')return 'direct';
 const {results}=await db.prepare('SELECT code FROM communities WHERE code = ?').bind(value).all();
 return results.length?value:'direct';
}
export async function publicRefs(db:AnalyticsDatabase){
 const {results}=await db.prepare('SELECT code FROM communities ORDER BY code').bind().all();
 return ['direct',...results.map(r=>String(r.code))];
}
export function sameOrigin(request:Request){try{const origin=new URL(request.headers.get('origin')||'');return ['http:','https:'].includes(origin.protocol)&&origin.host===request.headers.get('host');}catch{return false;}}
export async function limitedJson(request:Request,max=1024){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('Invalid content type');
 const reader=request.body?.getReader();if(!reader)throw Error('Missing body');let bytes=0;let raw='';const decoder=new TextDecoder();
 while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>max){await reader.cancel();throw Error('Too large');}raw+=decoder.decode(part.value,{stream:true});}
 return JSON.parse(raw+decoder.decode()) as unknown;
}
