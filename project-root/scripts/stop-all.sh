#!/usr/bin/env bash
set -euo pipefail
. ./.env

echo "Stopping lightningd (best-effort)..."
if pgrep -x lightningd >/dev/null 2>&1; then
  pkill -f lightningd || true
  sleep 1
fi

echo "Stopping bitcoind..."
if bitcoin-cli -regtest -rpcuser="$BITCOIN_RPCUSER" -rpcpassword="$BITCOIN_RPCPASSWORD" -rpcport="$BITCOIN_RPCPORT" stop >/dev/null 2>&1; then
  echo "bitcoind stop requested"
else
  echo "bitcoind may not be running or RPC not reachable"
fi
