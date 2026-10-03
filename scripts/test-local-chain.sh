#!/usr/bin/env bash
set -euo pipefail
# No Devnet funds required. Runs the same Core operations against a local validator.
local_test_dir=$(mktemp -d)
validator_pid=''
cleanup() {
  exit_status=$?
  if [ "$exit_status" -ne 0 ] && [ -f "$local_test_dir/validator.log" ]; then tail -15 "$local_test_dir/validator.log"; if [ -f "$local_test_dir/ledger/validator.log" ]; then tail -35 "$local_test_dir/ledger/validator.log"; fi; fi
  if [ -n "$validator_pid" ]; then kill "$validator_pid" 2>/dev/null || true; wait "$validator_pid" 2>/dev/null || true; fi
  rm -rf "$local_test_dir"
}
trap cleanup EXIT
node -e 'const fs=require("fs"),{Keypair}=require("@solana/web3.js");fs.writeFileSync(process.argv[1],JSON.stringify(Array.from(Keypair.generate().secretKey)),{mode:0o600})' "$local_test_dir/payer.json"
export NFTLAB_TEST_KEYPAIR="$local_test_dir/payer.json"
export NFTLAB_TEST_RPC=http://127.0.0.1:18999
export NFTLAB_ALLOW_LOCAL=1
export NFTLAB_TEST_PROGRAM_ID=$(solana-keygen pubkey target/deploy/nftlab_progress-keypair.json)
payer_address=$(solana-keygen pubkey "$NFTLAB_TEST_KEYPAIR")
node --import tsx scripts/fetch-core.ts
solana-test-validator --rpc-port 18999 --faucet-port 19900 --gossip-port 19001 --dynamic-port-range 19002-19022 --reset --ledger "$local_test_dir/ledger" --mint "$payer_address" \
  --bpf-program "$NFTLAB_TEST_PROGRAM_ID" target/deploy/nftlab_progress.so \
  --bpf-program CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d target/fixtures/core-devnet.so \
  > "$local_test_dir/validator.log" 2>&1 &
validator_pid=$!
if ! node --input-type=module - <<'JS'
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const r = await fetch(process.env.NFTLAB_TEST_RPC, { method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({jsonrpc:'2.0', id:1, method:'getHealth'}), signal:AbortSignal.timeout(1000) });
    if ((await r.json()).result === 'ok') process.exit(0);
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 500));
}
process.exit(1);
JS
then tail -40 "$local_test_dir/validator.log"; exit 1; fi
npm run test:anchor
npm run test:devnet
