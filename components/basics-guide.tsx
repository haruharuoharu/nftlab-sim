"use client";

import { useLanguage } from './language-provider';

const copy = {
  ja: {
    title: 'NFTってなに？ 絵で見てみよう',
    intro: 'チケットをつくる、だれかに渡す、入口で使う。身近な体験で、4つの言葉を覚えよう。',
    items: [
      { name: 'NFT', label: '持ち主がわかる、デジタルのしるし', text: '1つずつ見分けられ、今だれが持っているかをネットワーク上で確認できます。チケットや記念品などに使えます。', more: '画像を保存することと、そのNFTの持ち主になることは別です。', image: '個別の番号が付いたデジタルチケットと、持ち主の記録' },
      { name: 'ウォレット', label: '受け取る・渡す操作のためのアプリ', text: '自分のNFTを確認したり、「このチケットを渡してよい」と承認したりする道具です。', more: '持ち主の記録は、ウォレットの中ではなくネットワーク上にあります。最初の練習では、このアプリは不要です。', image: 'スマホのウォレットでチケットの操作を承認する様子' },
      { name: 'Devnet / Devnet NFT', label: '本番の前に試せる、練習用の場所', text: 'Solanaは、持ち主や操作を記録するネットワーク。その練習用の場所がDevnetで、そこでつくるNFTがDevnet NFTです。', more: '実際にネットワークへ記録します。本番（Mainnet）のNFTとは別で、この教材では練習用として扱います。', image: '練習用のネットワークにつながる、テストのチケット' },
      { name: 'SOL / テストSOL', label: '操作の手数料に使う通貨', text: 'SOLはSolanaで操作の手数料などに使う通貨。このアプリでは、無料で受け取れる練習用の「テストSOL」を使います。', more: 'テストSOLは本番のSOLとは別で、お金として使えません。購入する必要はありません。', image: '本番のSOLと区別された、練習用のテストSOL' },
    ],
    more: 'もう少しくわしく',
    journey: 'このアプリでは、チケットで体験します',
    steps: [['つくる', '発行する / Mint'], ['渡す', '譲渡する / Transfer'], ['使う', '利用する / Redeem']],
    note: '練習では、チケットを使ったら「使用済み」にします。Devnetの教材ではNFTを消費し、同じものをもう一度使えないようにします。',
  },
  en: {
    title: 'What is an NFT? Start with a picture',
    intro: 'Create a ticket, pass it to someone, and use it at the entrance. Learn four terms through a familiar experience.',
    items: [
      { name: 'NFT', label: 'A digital item with a recorded owner', text: 'Each NFT can be identified separately. A network records who owns it. NFTs can be used for tickets or collectibles.', more: 'Saving an image is different from owning the NFT associated with it.', image: 'A numbered digital ticket and its ownership record' },
      { name: 'Wallet', label: 'An app for receiving and approving actions', text: 'Use it to view your NFTs and approve actions, such as passing a ticket to someone else.', more: 'Ownership is recorded on the network, not inside the wallet app. You do not need a wallet for the first practice mode.', image: 'A phone wallet approving an action on a ticket' },
      { name: 'Devnet / Devnet NFT', label: 'A practice network before the real thing', text: 'Solana is a network that records ownership and actions. Devnet is its practice environment. An NFT created there is a Devnet NFT.', more: 'Actions are recorded on an actual network. These NFTs are separate from Mainnet NFTs and are used for practice in this app.', image: 'A test ticket connected to a practice network' },
      { name: 'SOL / Test SOL', label: 'Tokens used to pay network fees', text: 'SOL is the currency used for fees and other operations on Solana. This app uses free practice tokens called test SOL.', more: 'Test SOL is separate from Mainnet SOL and has no monetary value. You do not need to buy it.', image: 'Practice test SOL shown separately from Mainnet SOL' },
    ],
    more: 'A little more detail',
    journey: 'Try it with a ticket in this app',
    steps: [['Create', 'Mint'], ['Pass it on', 'Transfer'], ['Use', 'Redeem']],
    note: 'In this exercise, using a ticket marks it as used. The Devnet exercise consumes the NFT so the same ticket cannot be used again.',
  },
};

// Original explanatory artwork. All labels and alternative text follow the UI language.
function Illustration({ kind, label }: { kind: number; label: string }) {
  const ticket = <><rect x="75" y="28" width="112" height="128" rx="12" fill="#fffdf7" stroke="#285c48" strokeWidth="3"/><path d="M87 120h88" stroke="#b8ccb9" strokeWidth="2" strokeDasharray="5 5"/><path d="m116 58 22-14 23 14v27l-23 14-22-14z" fill="#c4dfb9" stroke="#285c48" strokeWidth="3"/><path d="m126 74 8 8 17-19" fill="none" stroke="#285c48" strokeWidth="3" strokeLinecap="round"/><path d="M93 137h23m6 0h6m7 0h30" stroke="#285c48" strokeWidth="3"/></>;
  return <svg viewBox="0 0 260 184" role="img" aria-label={label}>
    <ellipse cx="130" cy="165" rx="95" ry="9" fill="#c9d6c3" opacity=".55"/>
    {kind === 0 && <><rect x="57" y="18" width="112" height="128" rx="12" fill="#d9e8cc" stroke="#8ca889" strokeWidth="2" transform="rotate(-9 113 82)"/>{ticket}<circle cx="207" cy="98" r="21" fill="#285c48"/><circle cx="207" cy="91" r="6" fill="#e5f3d8"/><path d="M196 110q0-15 11-15t11 15" fill="#e5f3d8"/><path d="M188 98h-12" stroke="#285c48" strokeWidth="3" strokeDasharray="3 3"/></>}
    {kind === 1 && <><rect x="83" y="13" width="94" height="153" rx="16" fill="#285c48"/><rect x="90" y="25" width="80" height="128" rx="9" fill="#fffdf7"/><path d="M116 20h28" stroke="#a9c5a7" strokeWidth="3" strokeLinecap="round"/><rect x="105" y="45" width="51" height="55" rx="7" fill="#d9e8cc" stroke="#285c48" strokeWidth="2"/><path d="m118 64 13-8 13 8v16l-13 8-13-8z" fill="#a8cda1"/><rect x="102" y="117" width="56" height="23" rx="11" fill="#285c48"/><path d="m122 128 6 5 10-12" fill="none" stroke="#eff9e5" strokeWidth="3" strokeLinecap="round"/><circle cx="199" cy="63" r="21" fill="#c4dfb9"/><path d="m188 63 7 7 14-16" fill="none" stroke="#285c48" strokeWidth="3" strokeLinecap="round"/></>}
    {kind === 2 && <><rect x="25" y="15" width="210" height="150" rx="20" fill="none" stroke="#87aa88" strokeWidth="2" strokeDasharray="6 6"/><path d="M57 65h146M57 65l73 69 73-69" fill="none" stroke="#9db99b" strokeWidth="3"/>{[[57,65],[203,65],[130,134]].map(([cx,cy])=><g key={cx}><circle cx={cx} cy={cy} r="18" fill="#fffdf7" stroke="#285c48" strokeWidth="2"/><rect x={cx-7} y={cy-9} width="14" height="18" rx="3" fill="#c4dfb9" stroke="#285c48" strokeWidth="1.5"/></g>)}<path d="m120 32 10-7 10 7v13l-10 7-10-7z" fill="#285c48"/><path d="M103 157h54" stroke="#87aa88" strokeWidth="3" strokeLinecap="round"/></>}
    {kind === 3 && <><circle cx="73" cy="83" r="35" fill="#f0e4c7" stroke="#b7a684" strokeWidth="2"/><text x="73" y="89" textAnchor="middle" fontSize="16" fontWeight="700" fill="#75684c">SOL</text><path d="M124 48v85" stroke="#a6baa0" strokeWidth="2" strokeDasharray="4 5"/><circle cx="182" cy="99" r="42" fill="#c4dfb9" stroke="#285c48" strokeWidth="3"/><circle cx="182" cy="99" r="33" fill="none" stroke="#91b48e" strokeWidth="2"/><text x="182" y="105" textAnchor="middle" fontSize="16" fontWeight="700" fill="#285c48">TEST</text><path d="m200 46 5 10 11 2-8 8 1 11-9-5-10 5 2-11-8-8 11-2z" fill="#285c48"/></>}
  </svg>;
}

export default function BasicsGuide() {
  const { locale } = useLanguage();
  const c = copy[locale];
  return <section className="basics-guide" aria-labelledby="basics-title">
    <div className="basics-heading"><p className="eyebrow">START HERE</p><h2 id="basics-title">{c.title}</h2><p>{c.intro}</p></div>
    <div className="basics-grid">{c.items.map((item, i) => <article className="basics-card" key={i}>
      <div className="basics-art"><Illustration kind={i} label={item.image}/></div>
      <div className="basics-card-copy"><span className="basics-number">0{i + 1}</span><h3>{item.name}</h3><p className="basics-label">{item.label}</p><p>{item.text}</p><details><summary>{c.more}</summary><p>{item.more}</p></details></div>
    </article>)}</div>
    <div className="basics-journey"><h3>{c.journey}</h3><ol>{c.steps.map(([label, term], i) => <li key={term}><span className="basics-step-icon" aria-hidden="true">{['＋', '↗', '✓'][i]}</span><div><strong>{label}</strong><small>{term}</small></div></li>)}</ol><p>{c.note}</p></div>
  </section>;
}
