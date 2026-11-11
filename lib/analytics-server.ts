import { getCloudflareContext } from '@opennextjs/cloudflare';
// Minimal binding interface avoids adding a global Workers type dependency to Next.js.
export interface AnalyticsDatabase {
  prepare(sql: string): {bind(...values: unknown[]): {run(): Promise<unknown>; all(): Promise<{results: Record<string, unknown>[]}>}};
}
export function analyticsEnvironment() {
  try { return getCloudflareContext().env as unknown as {ANALYTICS_DB?: AnalyticsDatabase; ANALYTICS_REPORT_TOKEN?: string}; }
  catch { return {} as {ANALYTICS_DB?: AnalyticsDatabase; ANALYTICS_REPORT_TOKEN?: string}; }
}
export const NO_STORE = {'Cache-Control': 'no-store', 'Vary': 'Authorization'};
