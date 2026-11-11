import { actionBit, analyticsSchema, CERTIFICATE, isFresh, journeyKey, referral, START, WALLET, type AnalyticsPayload } from './analytics';
import type { Mode, Progress, ScenarioId } from './scenarios';
export const CONSENT_KEY = 'nftlab-analytics-consent-v1';
// No browser identifier is created until an opted-in learner starts a fresh run.
export function createAnalyticsClient(storage: Storage, send: (payload: AnalyticsPayload) => Promise<boolean>, campaign: () => string | null, allowed?: readonly string[]) {
  let inflight = false;
  const pending = new Set<Mode>();
  function read(mode: Mode): AnalyticsPayload | null {
    try { if (storage.getItem(CONSENT_KEY) !== 'yes') return null; const parsed = analyticsSchema.safeParse(JSON.parse(storage.getItem(journeyKey(mode)) || 'null')); return parsed.success ? parsed.data : null; } catch { return null; }
  }
  async function flush(mode: Mode) {
    pending.add(mode);
    if (inflight) return;
    inflight = true;
    try {
      while (pending.size) {
        const next = pending.values().next().value!; pending.delete(next);
        const payload = read(next); if (!payload) continue;
        try { await send(payload); } catch { /* Retry on next action/online; persisted cumulative mask. */ }
      }
    } finally { inflight = false; }
  }
  function update(mode: Mode, bit: number) {
    try { const payload = read(mode); if (!payload) return; payload.mask |= bit;
      storage.setItem(journeyKey(mode), JSON.stringify(payload)); void flush(mode);
    } catch { /* Storage unavailable: keep learning without measurement. */ }
  }
  return {
    start(mode: Mode, progress: Progress, connected: boolean) {
      try {
        if (storage.getItem(CONSENT_KEY) !== 'yes') return;
        if (!read(mode)) {
          if (!isFresh(progress)) return;
          const payload: AnalyticsPayload = {version: 1, id: crypto.randomUUID(), mode, ref: referral(campaign(),allowed), mask: START};
          storage.setItem(journeyKey(mode), JSON.stringify(payload));
        }
        update(mode, connected && mode === 'devnet' ? WALLET : START);
      } catch { /* Optional. */ }
    },
    wallet() { update('devnet', WALLET); },
    action(mode: Mode, id: ScenarioId, action: 'mint'|'transfer'|'redeem') { update(mode, actionBit(id, action)); },
    certificate(mode: Mode) { update(mode, CERTIFICATE); },
    reset(mode: Mode) { try { storage.removeItem(journeyKey(mode)); } catch {} },
    withdraw() { try { storage.setItem(CONSENT_KEY, 'no'); storage.removeItem(journeyKey('demo')); storage.removeItem(journeyKey('devnet')); } catch {} },
    flush,
  };
}
