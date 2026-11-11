import { z } from 'zod';
import {codeSchema} from './community';
import type { Mode, Progress, ScenarioId } from './scenarios';

// Campaign codes, never names, wallet addresses, email addresses, or arbitrary URLs.
export const REFERRALS = ['direct', 'colosseum', 'note', 'community-test'] as const;
export function referral(value: string | null, allowed: readonly string[] = REFERRALS): string {
  return value && allowed.includes(value) ? value : 'direct';
}
export const START = 1;
export const WALLET = 2;
const ids = ['ticket', 'loyalty', 'membership'] as const;
export function actionBit(id: ScenarioId, action: 'mint' | 'transfer' | 'redeem') {
  return 1 << (2 + ids.indexOf(id) * 3 + ['mint', 'transfer', 'redeem'].indexOf(action));
}
export const CERTIFICATE = 1 << 11;
export const LESSONS = ids.reduce((mask, id) => mask | actionBit(id, 'redeem'), 0);
export const ALL = (1 << 12) - 1;
export const analyticsSchema = z.object({
  version: z.literal(1), id: z.uuid(), mode: z.enum(['demo', 'devnet']),
  ref: codeSchema, mask: z.number().int().min(1).max(ALL),
}).strict().refine(p => (p.mask & START) !== 0 && (p.mode !== 'demo' || (p.mask & WALLET) === 0));
export type AnalyticsPayload = z.infer<typeof analyticsSchema>;
export function isFresh(progress: Progress) {
  return !progress.certificate && ids.every(id => progress.records[id].stage === 'locked');
}
export const METRICS = [
  ['started', START], ['walletConnected', WALLET],
  ['minted', ids.reduce((m, id) => m | actionBit(id, 'mint'), 0)],
  ['transferred', ids.reduce((m, id) => m | actionBit(id, 'transfer'), 0)],
  ['redeemed', LESSONS], ['lessonsCompleted', LESSONS], ['certificate', CERTIFICATE],
] as const;
export function reportSql() {
  const columns = METRICS.map(([name, mask]) => {
    const check = name === 'lessonsCompleted' ? `(mask & ${mask}) = ${mask}` : `(mask & ${mask}) != 0`;
    return `SUM(CASE WHEN ${check} THEN 1 ELSE 0 END) AS ${name}`;
  });
  for (const id of ids) for (const action of ['mint', 'transfer', 'redeem'] as const)
    columns.push(`SUM(CASE WHEN (mask & ${actionBit(id, action)}) != 0 THEN 1 ELSE 0 END) AS ${id}_${action}`);
  return `SELECT mode, ref, ${columns.join(', ')} FROM analytics_journeys WHERE started_day >= ? AND started_day <= ? GROUP BY mode, ref ORDER BY mode, ref`;
}
export function journeyKey(mode: Mode) { return `nftlab-analytics-v1-${mode}`; }
