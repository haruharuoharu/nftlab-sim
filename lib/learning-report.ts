// Reach counts describe independent milestones, not a strictly ordered funnel.
export const REACH_KEYS = [
  'started', 'walletConnected', 'minted', 'transferred', 'redeemed',
  'lessonsCompleted', 'certificate',
  'ticket_mint', 'ticket_transfer', 'ticket_redeem',
  'loyalty_mint', 'loyalty_transfer', 'loyalty_redeem',
  'membership_mint', 'membership_transfer', 'membership_redeem',
] as const;
export type ReachKey = typeof REACH_KEYS[number];
export type ReachCounts = Record<ReachKey, number>;

function count(value: unknown): number {
  const result = Number(value);
  return Number.isSafeInteger(result) && result >= 0 ? result : 0;
}

export function reachCounts(row: Record<string, unknown> = {}): ReachCounts {
  return Object.fromEntries(REACH_KEYS.map(key => [key, count(row[key])])) as ReachCounts;
}

export function aggregateReach(rows: Record<string, unknown>[], mode: 'demo' | 'devnet'): ReachCounts {
  const totals = reachCounts();
  for (const row of rows) {
    if (row.mode !== mode) continue;
    const values = reachCounts(row);
    for (const key of REACH_KEYS) totals[key] += values[key];
  }
  return totals;
}

export function reachRate(reached: number, started: number): number | null {
  return started > 0 ? reached / started : null;
}

export const REACH_STAGES: readonly {key: ReachKey; label: string}[] = [
  {key: 'started', label: '学習開始'},
  {key: 'walletConnected', label: 'ウォレット接続'},
  {key: 'minted', label: 'Mint（発行）'},
  {key: 'transferred', label: 'Transfer（譲渡）'},
  {key: 'redeemed', label: 'Redeem（利用）'},
  {key: 'lessonsCompleted', label: '3教材を完了'},
  {key: 'certificate', label: '修了証を作成'},
];

export const LESSON_REACH = [
  {id: 'ticket', label: 'チケット'},
  {id: 'loyalty', label: '来場特典'},
  {id: 'membership', label: '会員アクセス'},
] as const;

export const FEEDBACK_REASON_LABELS: Record<string, string> = {
  terms: '用語・説明', wallet: 'ウォレット接続', funding: 'テストSOLの取得',
  approval: 'ウォレットの承認', confirmation: '取引の確認待ち', transfer: 'NFTの譲渡',
  explorer: 'Explorerの表示', no_issue: '困らなかった', other: 'その他',
};
export const FEEDBACK_STEP_LABELS: Record<string, string> = {
  intro: '導入', quiz: 'クイズ', mint: '発行', transfer: '譲渡', redeem: '利用', certificate: '修了証',
};
