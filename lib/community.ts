import {z} from 'zod';
export const codeSchema=z.string().regex(/^[a-z][a-z0-9-]{1,39}$/);
export const communitySchema=z.object({
 code:codeSchema.refine(s=>s!=='direct'), name:z.string().trim().min(1).max(80),
 status:z.enum(['link_only','contacted','pilot','adopted','paused']),
 adoptedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
}).strict().refine(c=>c.status!=='adopted'||!!c.adoptedAt,{message:'Adoption date required'}).refine(c=>!c.adoptedAt||(!Number.isNaN(Date.parse(c.adoptedAt))&&new Date(c.adoptedAt).toISOString().slice(0,10)===c.adoptedAt));
export const REASONS=['terms','wallet','funding','approval','confirmation','transfer','explorer','no_issue','other'] as const;
export const feedbackSchema=z.object({version:z.literal(1),id:z.uuid(),mode:z.enum(['demo','devnet']),ref:codeSchema,reason:z.enum(REASONS),step:z.enum(['intro','quiz','mint','transfer','redeem','certificate']),locale:z.enum(['ja','en'])}).strict();
export function monthRange(month:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<'2026-01'||month>'2100-12')throw Error('Invalid month');
 const from=month+'-01'; const date=new Date(from+'T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+1);date.setUTCDate(0);
 return {from,to:date.toISOString().slice(0,10)};
}
// Human-facing exports cannot be treated as formulas by spreadsheet applications.
export function csvCell(value:unknown){const s=String(value??'');return '"'+(/^(?:[\s]*[=+@\-]|[\t\r\n])/.test(s)?"'"+s:s).replaceAll('"','""')+'"';}
export function monthlyCsv(rows:Record<string,unknown>[]){const keys=['month','mode','ref','name','status','adoptedAt','started','lessonsCompleted','certificate','lessonCompletionRate','certificateRate','feedbackResponses'];return '\uFEFF'+[keys.map(csvCell).join(','),...rows.map(row=>keys.map(k=>csvCell(row[k])).join(','))].join('\r\n');}
