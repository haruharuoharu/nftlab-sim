import {
  aggregateReach, LESSON_REACH, REACH_STAGES, reachRate,
} from '@/lib/learning-report';

type Props = {rows: Record<string, unknown>[]};
const modes = [{id: 'demo', label: 'シミュレーション'}, {id: 'devnet', label: 'Solana Devnet'}] as const;

function percentage(value: number | null) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

export default function AdminLearningReport({rows}: Props) {
  return <section className="admin-reach" aria-labelledby="reach-title">
    <h2 id="reach-title">学習ステップ別の到達状況</h2>
    <p>表示中の月・紹介元に絞った集計です。割合の分母は、計測に同意して開始した練習回です。
      Mint・Transfer・Redeemは、3教材のどれかで1回以上成功した練習回数です。</p>
    <p>操作順を表すグラフではありません。ウォレットは学習開始前に接続する場合もあるため、隣り合う棒の差を離脱数としては扱えません。</p>
    <div className="admin-reach-modes">
      {modes.map(mode => {
        const counts = aggregateReach(rows, mode.id);
        return <section key={mode.id} className="admin-reach-card" aria-labelledby={`reach-${mode.id}`}>
          <h3 id={`reach-${mode.id}`}>{mode.label}</h3>
          {counts.started === 0 && <p className="admin-empty">この条件で記録された学習開始はまだありません。</p>}
          {mode.id === 'demo' && <p className="admin-reach-note">ウォレット接続は不要です。修了証はブラウザ内で作成します。</p>}
          {mode.id === 'devnet' && <p className="admin-reach-note">修了証はDevnet NFTの発行成功です。</p>}
          <dl className="admin-reach-bars">
            {REACH_STAGES.filter(stage => mode.id !== 'demo' || stage.key !== 'walletConnected').map(stage => {
              const rate = reachRate(counts[stage.key], counts.started);
              return <div className="admin-reach-stage" key={stage.key}>
                <dt>{stage.label}</dt>
                <dd><strong>{counts[stage.key]}回</strong><span>開始に対して {percentage(rate)}</span></dd>
                <div className="admin-reach-track" aria-hidden="true">
                  <span style={{width: `${Math.min(1, rate ?? 0) * 100}%`}}/>
                </div>
              </div>;
            })}
          </dl>
          <h4>教材別の成功数</h4>
          <p className="admin-reach-note">各セルは、その教材で操作に成功した練習回数です。</p>
          <div className="admin-table"><table>
            <caption className="sr-only">{mode.label}の教材別の成功数</caption>
            <thead><tr><th scope="col">教材</th><th scope="col">発行</th><th scope="col">譲渡</th><th scope="col">利用</th></tr></thead>
            <tbody>{LESSON_REACH.map(lesson => <tr key={lesson.id}>
              <th scope="row">{lesson.label}</th>
              {(['mint', 'transfer', 'redeem'] as const).map(action => <td key={action}>{counts[`${lesson.id}_${action}`]}回</td>)}
            </tr>)}</tbody>
          </table></div>
        </section>;
      })}
    </div>
  </section>;
}
