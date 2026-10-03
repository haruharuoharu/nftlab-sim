import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { progressSchema } from '@/lib/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function session(){const jar=await cookies();let id=jar.get('nftlab-session')?.value;
 if(!id||! /^[0-9a-f-]{36}$/.test(id)){id=randomUUID();jar.set('nftlab-session',id,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*90});}return id;}
function namespace(req:NextRequest){const n=req.nextUrl.searchParams.get('namespace')||'demo';if(!/^(demo|devnet)$/.test(n))throw new Error('invalid namespace');return n;}
export async function GET(req:NextRequest){try{const pool=db();if(!pool)return NextResponse.json({storage:'browser',progress:null});const ns=namespace(req);const id=await session();const result=await pool.query('SELECT progress FROM learning_progress WHERE session_id=$1 AND namespace=$2',[id,ns]);return NextResponse.json({storage:'postgres',progress:result.rows[0]?.progress??null});}catch{return NextResponse.json({error:'保存先に接続できません。ブラウザの進捗は保持されています。'},{status:503});}}
export async function PUT(req:NextRequest){
 const origin=req.headers.get('origin');let sameOrigin=false;try{sameOrigin=!!origin&&new URL(origin).host===req.headers.get('host');}catch{}
 if(!sameOrigin)return NextResponse.json({error:'Invalid origin'},{status:403});
 if(Number(req.headers.get('content-length'))>16384)return NextResponse.json({error:'Too large'},{status:413});
 try{const raw=await req.text();if(raw.length>16384)return NextResponse.json({error:'Too large'},{status:413});const progress=progressSchema.safeParse(JSON.parse(raw));if(!progress.success)return NextResponse.json({error:'Invalid progress'},{status:400});const pool=db();if(!pool)return NextResponse.json({storage:'browser'});const ns=namespace(req);const id=await session();await pool.query('INSERT INTO learning_progress(session_id,namespace,progress) VALUES($1,$2,$3) ON CONFLICT(session_id,namespace) DO UPDATE SET progress=$3,updated_at=now()',[id,ns,JSON.stringify(progress.data)]);return NextResponse.json({storage:'postgres'});}catch{return NextResponse.json({error:'保存先に接続できません。'},{status:503});}}
