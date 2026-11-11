"use client";
import {useState} from 'react';
import {monthlyCsv} from '@/lib/community';
type Community={code:string;name:string;status:string;adoptedAt:string|null};
type Row=Record<string,unknown>;
const statuses={link_only:'紹介リンクのみ',contacted:'相談中',pilot:'試験利用',adopted:'正式採用',paused:'休止'};
export default function Admin(){
 const [token,setToken]=useState('');const [communities,setCommunities]=useState<Community[]>([]);const [rows,setRows]=useState<Row[]>([]);const [month,setMonth]=useState(new Date().toISOString().slice(0,7));const [ref,setRef]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [loaded,setLoaded]=useState(false);
 const [form,setForm]=useState<Community>({code:'',name:'',status:'link_only',adoptedAt:null});
 async function api(path:string,method='GET',body?:object){const r=await fetch(path,{method,credentials:'omit',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(r.status===401?'管理用トークンを確認してください。':r.status===400?'入力内容・年月・採用日を確認してください。':'保存先へ接続できません。D1設定と移行の適用を確認してください。');return r.json();}
 async function load(){if(busy)return;setBusy(true);setMessage('');try{const [c,r]=await Promise.all([api('/api/admin/communities'),api(`/api/admin/monthly?month=${month}${ref?'&ref='+encodeURIComponent(ref):''}`)]);setCommunities(c.communities);setRows(r.rows);setLoaded(true);}catch(e){setLoaded(false);setRows([]);setCommunities([]);setMessage((e as Error).message);}finally{setBusy(false);}}
 async function save(){if(busy)return;setBusy(true);setMessage('');try{await api('/api/admin/communities','PUT',form);setMessage('保存しました。集計を読み直すと更新されます。');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 function logout(){setToken('');setRows([]);setCommunities([]);setLoaded(false);setMessage('');}
 function download(){const blob=new Blob([monthlyCsv(rows)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`nftlab-${month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function percentage(value:unknown){return value===null?'—':(Number(value)*100).toFixed(1)+'%';}
 return <main className="admin-panel"><a href="/">NFTLab Sim ホーム</a><h1>主催者向けレポート・コミュニティ管理</h1>
 <p>管理者用です。トークンはこの画面のメモリだけに保持します。URLやブラウザ保存には入れません。共有前に紹介元を絞ってください。</p>
 <label>管理用トークン<input disabled={busy} type="password" autoComplete="off" value={token} onChange={e=>{setToken(e.target.value);setLoaded(false);setRows([]);setCommunities([]);}}/></label>
 <label>対象月（UTCの開始月）<input disabled={busy} type="month" value={month} onChange={e=>{setMonth(e.target.value);setLoaded(false);setRows([]);}}/></label>
 <label>紹介元<select disabled={busy} value={ref} onChange={e=>{setRef(e.target.value);setLoaded(false);setRows([]);}}><option value="">すべて（管理者用）</option><option value="direct">直接アクセス</option>{communities.map(c=><option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}</select></label>
 <button disabled={!token||!month||busy} onClick={load}>レポート・管理表を読み込む</button><button disabled={busy} onClick={logout}>表示とトークンを消す</button><p role="status">{message}</p>
 {loaded&&<><h2>月次レポート：{month}</h2><p>同意した練習回の集計です。人数ではありません。後日の完走も開始月へ加算されます。今月は学習中の人を含みます。感想は回答月で集計し、学習回とは結び付けません。採用状態は現在の管理記録です。</p><button onClick={download}>表示中の月次CSVをダウンロード</button>
 <div className="admin-table"><table><thead><tr>{['紹介元','モード','開始','3教材完了','完了率','修了証','修了証率','感想'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={`${r.ref}-${r.mode}`}><td>{String(r.name)}</td><td>{String(r.mode)}</td><td>{String(r.started)}</td><td>{String(r.lessonsCompleted)}</td><td>{percentage(r.lessonCompletionRate)}</td><td>{String(r.certificate)}</td><td>{percentage(r.certificateRate)}</td><td>{String(r.feedbackResponses)}</td></tr>)}</tbody></table></div>
 <h2>困った箇所（選択回答）</h2>{rows.filter(r=>Number(r.feedbackResponses)>0).map(r=><div key={`${r.ref}-${r.mode}`}><strong>{String(r.name)} / {String(r.mode)}</strong><ul>{(r.feedback as Row[]).map(f=><li key={`${f.reason}-${f.step}`}>{String(f.reason)} / {String(f.step)}：{String(f.responses)}件</li>)}</ul></div>)}
 <h2>コミュニティ管理表</h2><p>リンクの利用件数だけでは正式採用と数えません。主催者との合意を確認して状態を更新してください。個人名・連絡先は入力しないでください。紹介元コードは公開されます。</p>
 <div className="admin-table"><table><thead><tr><th>団体名</th><th>紹介コード</th><th>導入状態</th><th>採用日</th><th>紹介URL</th><th>編集</th></tr></thead><tbody>{communities.map(c=><tr key={c.code}><td>{c.name}</td><td>{c.code}</td><td>{statuses[c.status as keyof typeof statuses]}</td><td>{c.adoptedAt||'—'}</td><td><a href={`/?ref=${encodeURIComponent(c.code)}`} target="_blank" rel="noreferrer">リンクを開く</a></td><td><button onClick={()=>setForm(c)}>編集</button></td></tr>)}</tbody></table></div>
 <h3>登録・更新</h3><label>紹介コード（英小文字・数字・ハイフン、2〜40文字）<input value={form.code} maxLength={40} onChange={e=>setForm({...form,code:e.target.value})}/></label><label>団体・企画名<input value={form.name} maxLength={80} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>導入状態<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(statuses).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>採用日（正式採用の場合は必須）<input type="date" value={form.adoptedAt||''} onChange={e=>setForm({...form,adoptedAt:e.target.value||null})}/></label><button disabled={busy} onClick={save}>管理記録を保存</button>
 </>}
 </main>;
}
