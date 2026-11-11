"use client";
import { useEffect, useRef, useState } from 'react';
import { createAnalyticsClient, CONSENT_KEY } from '@/lib/analytics-client';
import type { Mode, Progress, ScenarioId } from '@/lib/scenarios';
import { useLanguage } from './language-provider';

export function useAnalytics(mode: Mode, connected: boolean) {
  const {locale} = useLanguage();
  const [enabled,setEnabled] = useState(false);
  const [consent,setConsent] = useState(false);
  const client = useRef<ReturnType<typeof createAnalyticsClient> | null>(null);
  useEffect(()=>{
    let disposed=false;
    const abort=new AbortController();
    fetch('/api/analytics',{signal:abort.signal}).then(r=>r.json()).then(data=>{
      if(disposed||!data.enabled)return;
      setEnabled(true);
      try {setConsent(localStorage.getItem(CONSENT_KEY)==='yes');}catch{}
      client.current=createAnalyticsClient(localStorage, async payload=>{
        const response=await fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload),keepalive:true,signal:AbortSignal.timeout(5000)});
        return response.ok;
      },()=>new URLSearchParams(window.location.search).get('ref'));
    }).catch(()=>{});
    return()=>{disposed=true;abort.abort();client.current=null;};
  },[]);
  useEffect(()=>{
    const flush=()=>{void client.current?.flush(mode);};
    const changed=(event:StorageEvent)=>{
      if(event.key===CONSENT_KEY||event.key===null){try{setConsent(localStorage.getItem(CONSENT_KEY)==='yes');}catch{setConsent(false);}}
    };
    window.addEventListener('online',flush);window.addEventListener('storage',changed);
    flush();
    return()=>{window.removeEventListener('online',flush);window.removeEventListener('storage',changed);};
  },[mode,consent]);
  useEffect(()=>{if(enabled&&mode==='devnet'&&connected)client.current?.wallet();},[enabled,mode,connected,consent]);
  function toggle(){try{if(consent)client.current?.withdraw();else localStorage.setItem(CONSENT_KEY,'yes');setConsent(!consent);}catch{}}
  return {
    start:(progress:Progress)=>client.current?.start(mode,progress,connected),
    action:(id:ScenarioId,action:'mint'|'transfer'|'redeem')=>client.current?.action(mode,id,action),
    certificate:()=>client.current?.certificate(mode),
    reset:()=>client.current?.reset(mode),
    notice:enabled?<section className="help-guide" aria-label={locale==='en'?'Optional learning measurement':'任意の学習計測'}>
      <h2>{locale==='en'?'Help improve the learning experience':'学習体験の改善に協力する'}</h2>
      <p>{locale==='en'?'Optional: send practice milestones and a registered referral code using a random practice ID. No wallet address, signature, answers, or full URL is sent. This is not a count of unique people.':'任意で、ランダムな練習ID・各ステップの到達状況・登録済みの紹介元コードを送信します。ウォレットアドレス・取引署名・回答・URL全体は送信しません。人数の計測ではありません。'}</p>
      <p>{locale==='en'?'Measurement starts with the first quiz submission of a new run. Existing progress is excluded until you reset learning. Turning this off stops future sends; previously collected records remain. Hosting infrastructure may process connection metadata.':'同意後、新しい学習の最初のクイズ回答時に計測を始めます。既存の進捗はリセット後から対象になります。オフにすると以後の送信を止めますが、収集済み記録は残ります。配信基盤では通信情報が処理される場合があります。'}</p>
      <button type="button" aria-pressed={consent} onClick={toggle}>{locale==='en'?(consent?'Measurement: on — turn off':'Allow learning measurement'):(consent?'学習計測：オン（オフにする）':'学習計測に協力する')}</button>
    </section>:null,
  };
}
