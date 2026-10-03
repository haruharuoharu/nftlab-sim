# Dependency audit (2026-10-03)

Run `npm ci` and `npm run audit` with the committed lockfile. Production audit:
**0 critical, 0 high, 3 moderate**. Counts include dependency-chain reports;
the three remaining entries (`@solana/web3.js`, `jayson`, `stream-json`) refer
to one upstream advisory.

## Changes

- `.npmrc` uses `legacy-peer-deps=true` for this browser-only application.
  React, React DOM, Solana web3, and Wallet Standard's `bs58` peers are explicitly declared. npm's automatic
  React Native peer installation previously pulled Metro and vulnerable `braces`
  into this web project. Neither React Native nor Metro is used by the browser
  adapter exports. This setting is unsuitable for adding a native app without
  reviewing its peers. Desktop and mobile viewport browser tests remain in CI;
  physical Android/Seeker wallet testing remains outstanding.
- `jayson`'s nested `uuid` is pinned to **11.1.1**, the fixed CommonJS-compatible
  version. jayson uses `uuid.v4`, which remains available. This removes
  [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
- CI fails for high or critical production advisories. It does not suppress or
  rewrite moderate audit output.

## Remaining moderate advisory

[GHSA-528h-pc64-c93x](https://github.com/advisories/GHSA-528h-pc64-c93x)
reports quadratic processing of deeply nested JSON by stream-json's
`Pick`, `Ignore`, `Filter`, and `Replace` filters. The fixed stream-json release
is a major version with an ESM/package-export layout incompatible with jayson's
CommonJS `stream-json/streamers/StreamValues` and `stream-json/utils/Verifier`
imports; forcing that version would break the dependency.

Reachability review of the installed sources:

- Solana web3 `src/connection.ts` imports `jayson/lib/client/browser` for RPC.
  That client does not load jayson's Node stream utilities.
- jayson's Node `lib/utils.js` uses `StreamValues.withParser()` and `Verifier`,
  not the four filters affected by this advisory.
- NFTLab's PostgreSQL/API routes do not expose jayson's server or stream parser.

The vulnerable filter code is present in the installed dependency but no
application path to it was found. This is a documented temporary exception,
not a claim that npm audit is clean or that all JSON resource exhaustion is
impossible. Remove the exception when upstream Solana/jayson provides a
compatible fix; review it again if RPC clients, streaming endpoints, or these
packages change.

The removed high-severity `braces` report is
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
We removed the unused native dependency tree instead of claiming that braces
itself was patched.
