export const scenarios = [
 {id:'ticket',number:'01',icon:'↗',title:'チケットの譲渡',subtitle:'TICKET RESALE',description:'チケットを発行し、次の持ち主へ届け、入場時に使う。',lesson:'NFTは所有者を確認できるデジタルチケットとして使えます。譲渡すると所有者が変わり、利用済みチケットの二重使用は防ぐ必要があります。NFT自体が転売価格や入場ルールを自動的に保証するわけではありません。',reward:'LIVE SESSION / ADMIT ONE',questions:[{prompt:'NFTチケットを譲渡すると、何が変わりますか？',options:['画像の色','所有者のアドレス','ブロックチェーンの種類'],answer:1,explanation:'譲渡は所有者の変更です。画像をコピーしても所有権は移りません。'},{prompt:'使用済みチケットの二重使用を防ぐには？',options:['利用状態を記録・確認する','画像を非公開にする','名前を変える'],answer:0,explanation:'入場の際に利用状態を確認し、消費済みとして記録する必要があります。'}]},
 {id:'loyalty',number:'02',icon:'✦',title:'ロイヤルティ特典',subtitle:'LOYALTY REWARDS',description:'特典NFTを受け取り、贈って、商品と引き換える。',lesson:'この体験ではポイント残高ではなく、1回使える特典クーポンをNFTで表現します。引き換え時に消費すると再利用できません。通常のポイント制度がすべてNFTに適しているわけではありません。',reward:'COFFEE CLUB / ONE REWARD',questions:[{prompt:'ここでNFTが表すものは？',options:['銀行口座','無限に使えるポイント','1回使える特典クーポン'],answer:2,explanation:'このシナリオは1回限りの特典券です。ポイント残高とは区別します。'},{prompt:'特典券を友人に贈った後、使えるのは？',options:['現在の所有者','発行した人だけ','画像を保存した全員'],answer:0,explanation:'利用権は現在の所有者に紐づきます。'}]},
 {id:'membership',number:'03',icon:'◈',title:'メンバーシップ',subtitle:'MEMBERSHIP ACCESS',description:'会員証を発行し、所有権を移し、入場権を使う。',lesson:'NFTの所有確認をアクセス条件にできます。実際には有効期限や譲渡可否なども設計します。このMVPでは1回の会員向けイベント入場券を消費し、継続型の会員証とは区別します。',reward:'LAB MEMBERS / EVENT PASS',questions:[{prompt:'NFTによるアクセス判定で確認するのは？',options:['スクリーンショット','対象NFTの所有者と利用条件','ウォレットの背景色'],answer:1,explanation:'所有者と有効期限などの条件を確認する必要があります。'},{prompt:'この体験で利用後にNFTを消費する理由は？',options:['SOLの価格を上げるため','すべての会員証は必ず消えるため','1回限りのイベント入場権だから'],answer:2,explanation:'継続会員証は通常消費しません。ここでは単発イベントの入場権を学びます。'}]}
] as const;
export type ScenarioId = typeof scenarios[number]['id'];
export type Mode = 'demo' | 'devnet';
export type Stage = 'locked' | 'ready' | 'minted' | 'transferred' | 'redeemed';
export type RecordState = {stage:Stage; asset?:string; owner?:string; signature?:string};
export type Progress = {version:1; records:Record<ScenarioId,RecordState>; certificate?:{id:string;date:string;signature?:string}};
export function freshProgress():Progress {return {version:1,records:{ticket:{stage:'locked'},loyalty:{stage:'locked'},membership:{stage:'locked'}}};}
export function canOpen(p:Progress,index:number){return index===0 || p.records[scenarios[index-1].id].stage==='redeemed';}
export function completed(p:Progress){return scenarios.filter(s=>p.records[s.id].stage==='redeemed').length;}
export function passQuiz(id:ScenarioId,answers:number[]){const s=scenarios.find(s=>s.id===id)!;return answers.length===s.questions.length&&s.questions.every((q,i)=>q.answer===answers[i]);}
export function advance(p:Progress,id:ScenarioId,action:'unlock'|'mint'|'transfer'|'redeem',details:Partial<RecordState>={}):Progress {
 const index=scenarios.findIndex(s=>s.id===id);if(!canOpen(p,index))throw new Error('前の体験を完了してください。');
 const required={unlock:'locked',mint:'ready',transfer:'minted',redeem:'transferred'};
 const next={unlock:'ready',mint:'minted',transfer:'transferred',redeem:'redeemed'} as const;
 if(p.records[id].stage!==required[action])throw new Error('操作の順序が正しくありません。');
 return {...p,records:{...p.records,[id]:{...p.records[id],...details,stage:next[action]}}};
}
