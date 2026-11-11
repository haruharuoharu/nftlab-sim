"use client";
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from './language-provider';
import {referral} from '@/lib/analytics';
import {REASONS} from '@/lib/community';
import type {Mode,Progress} from '@/lib/scenarios';
const labels={ja:['用語・説明','ウォレット接続','テストSOLの取得','ウォレットの承認','取引の確認待ち','NFTの譲渡','Explorerの表示','困らなかった','その他'],en:['Terms and explanations','Wallet connection','Getting test SOL','Wallet approval','Transaction confirmation','NFT transfer','Explorer display','No difficulty','Other']};
export default function Feedback({mode,progress}:{mode:Mode;progress:Progress}){
 const {locale}=useLanguage();const [enabled,setEnabled]=useState(false);const refs=useRef<string[]>([]);const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const payload=useRef<object|null>(null);
 useEffect(()=>{let live=true;fetch('/api/analytics',{credentials:'omit'}).then(r=>r.json()).then(d=>{if(live){setEnabled(!!d.enabled);refs.current=d.referrals||[];}}).catch(()=>{});return()=>{live=false;};},[]);
 useEffect(()=>{payload.current=null;setMessage('');setReason('');},[mode]);
 async function submit(){if(!reason||busy)return;setBusy(true);setMessage('');try{
  if(!payload.current){let id=crypto.randomUUID();try{const key=`nftlab-feedback-id-${mode}`;const old=sessionStorage.getItem(key);if(old)id=old as typeof id;else sessionStorage.setItem(key,id);}catch{}
   const active=Object.values(progress.records).find(r=>r.stage!=='redeemed');const step=!active?'certificate':active.stage==='locked'?'quiz':active.stage==='ready'?'mint':active.stage==='minted'?'transfer':'redeem';
   payload.current={version:1,id,mode,ref:referral(new URLSearchParams(location.search).get('ref'),refs.current),reason,step,locale};
  }
  const r=await fetch('/api/feedback',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload.current),signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error();setMessage(locale==='ja'?'感想を送信しました。ありがとうございます。':'Thanks! Your feedback was sent.');
 }catch{setMessage(locale==='ja'?'送信できませんでした。時間をおいて再試行できます。':'Could not send. You can retry later.');}finally{setBusy(false);}}
 if(!enabled)return null;
 return <section className="help-guide" aria-labelledby="feedback-title"><h2 id="feedback-title">{locale==='ja'?'ひとこと感想':'Quick feedback'}</h2>
 <p>{locale==='ja'?'いちばん困った箇所を1つ教えてください。任意です。計測への同意とは別に、送信ボタンを押したときだけ回答・現在の段階・モード・言語・登録済み紹介元・ランダム回答IDを送ります。氏名やウォレット情報は送りません。回答はこのタブで各モード1回です。':'Where did you have the most difficulty? Optional and independent of analytics consent. Only when you submit, we send your choice, current step, mode, language, registered referral code and a random response ID. No name or wallet details. One response per mode in this tab.'}</p>
 <label>{locale==='ja'?'困った箇所':'Difficulty'}<select value={reason} disabled={busy||!!payload.current} onChange={e=>setReason(e.target.value)}><option value="">{locale==='ja'?'選んでください':'Choose one'}</option>{REASONS.map((r,i)=><option key={r} value={r}>{labels[locale][i]}</option>)}</select></label>
 <button type="button" disabled={!reason||busy||message.includes('ありがとうございます')||message.startsWith('Thanks!')} onClick={submit}>{busy?(locale==='ja'?'送信中…':'Sending…'):(locale==='ja'?'感想を送信':'Send feedback')}</button><p role="status">{message}</p></section>;
}
