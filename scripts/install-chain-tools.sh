#!/usr/bin/env bash
set -euo pipefail
# Official distribution links and pinned SHA256 release-asset digests.
# Anchor: https://www.anchor-lang.com/docs/installation -> otter-sec/anchor
# Agave 2.3.0: https://www.anchor-lang.com/docs/updates/release-notes/0-32-1
# Linux x86_64 only. Rust and npm must already be installed.
toolchain_dir=${NFTLAB_TOOLCHAIN_DIR:-"$PWD/target/toolchain"}
mkdir -p "$toolchain_dir"
curl --proto '=https' --tlsv1.2 -fsSL --retry 2 \
  https://github.com/otter-sec/anchor/releases/download/v0.32.1/anchor-0.32.1-x86_64-unknown-linux-gnu \
  -o "$toolchain_dir/anchor"
printf '%s  %s\n' 5f25b850ce80278507a98947833fcd48423391f6d145046ffb0c5fd130dec436 "$toolchain_dir/anchor" | sha256sum -c -
chmod +x "$toolchain_dir/anchor"
curl --proto '=https' --tlsv1.2 -fsSL --retry 2 \
  https://github.com/anza-xyz/agave/releases/download/v2.3.0/solana-release-x86_64-unknown-linux-gnu.tar.bz2 \
  -o "$toolchain_dir/solana.tar.bz2"
printf '%s  %s\n' 56241fbe862495ff01b2b875195e44f94c22e9f2a504591a3ade1b9d82862730 "$toolchain_dir/solana.tar.bz2" | sha256sum -c -
tar --no-same-owner -xjf "$toolchain_dir/solana.tar.bz2" -C "$toolchain_dir"
if [ -n "${GITHUB_PATH:-}" ]; then
  printf '%s\n' "$toolchain_dir" "$toolchain_dir/solana-release/bin" >> "$GITHUB_PATH"
fi
printf 'Toolchain installed in %s; add it and solana-release/bin to PATH.\n' "$toolchain_dir"
