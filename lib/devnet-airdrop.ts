export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const MIN_TEST_LAMPORTS = 50_000_000;
export const AIRDROP_LAMPORTS = 500_000_000;
export const AIRDROP_COOLDOWN_MS = 10 * 60 * 1000;
type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type Reader = { genesis(): Promise<string>; balance(): Promise<number>; request(lamports: number): Promise<string> };
export type FundingResult = { status: 'ready' | 'requested' | 'cooldown' | 'unavailable' | 'wrong-network'; balance: number | null; signature?: string };

// The caller serializes this by wallet with Web Locks. Claim the cooldown before
// requesting: timeouts, reloads and another tab must not spam the public faucet.
export async function ensureDevnetFunds(address: string, storage: Storage, reader: Reader, now = Date.now()): Promise<FundingResult> {
  let balance: number | null = null;
  try {
    if (await reader.genesis() !== DEVNET_GENESIS) return { status: 'wrong-network', balance };
    const initial = await reader.balance();
    if (!Number.isSafeInteger(initial) || initial < 0) throw new Error('Invalid balance');
    balance = initial;
    if (balance >= MIN_TEST_LAMPORTS) return { status: 'ready', balance };
    const key = `nftlab-airdrop-v1-${address}`;
    const raw = storage.getItem(key);
    if (raw) {
      const previous = JSON.parse(raw);
      if (!Number.isSafeInteger(previous.at) || previous.at < 0 ||
        (previous.signature !== undefined && (typeof previous.signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(previous.signature)))) throw new Error('Invalid cooldown');
      if (now - previous.at < AIRDROP_COOLDOWN_MS) return { status: 'cooldown', balance, signature: previous.signature };
    }
    const claim = JSON.stringify({ at: now });
    storage.setItem(key, claim);
    if (storage.getItem(key) !== claim) throw new Error('Cannot persist cooldown');
    const signature = await reader.request(AIRDROP_LAMPORTS);
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) throw new Error('Invalid faucet signature');
    storage.setItem(key, JSON.stringify({ at: now, signature }));
    // A signature is not a confirmed balance. Let the user refresh after landing.
    try { const latest = await reader.balance();if (Number.isSafeInteger(latest) && latest >= 0) balance = latest; } catch { /* Keep the request result. */ }
    return { status: balance !== null && balance >= MIN_TEST_LAMPORTS ? 'ready' : 'requested', balance, signature };
  } catch { return { status: 'unavailable', balance }; }
}
