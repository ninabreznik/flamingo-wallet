#!/usr/bin/env bash
set -euo pipefail

# Move to project root
DIR="$(cd "$(dirname "$0")" && pwd)/.."
cd "$DIR"

# Load environment variables
. ./.env

echo "=== Starting Bitcoin Regtest ==="
bitcoind -regtest -daemon \
  -datadir="$BITCOIN_DATADIR" \
  -rpcuser="$BITCOIN_RPCUSER" \
  -rpcpassword="$BITCOIN_RPCPASSWORD" \
  -rpcallowip=127.0.0.1 \
  -rpcport="$BITCOIN_RPCPORT" \
  -fallbackfee=0.0002

echo "Waiting for bitcoind RPC..."
until bitcoin-cli -regtest \
  -rpcuser="$BITCOIN_RPCUSER" \
  -rpcpassword="$BITCOIN_RPCPASSWORD" \
  -rpcport="$BITCOIN_RPCPORT" getblockchaininfo >/dev/null 2>&1; do
  sleep 0.5
done
echo "✅ bitcoind ready."

# -------------------------------------------------------------
# Wallet Handling (robust against re-runs or pre-existing wallet)
# -------------------------------------------------------------
WALLET="regtestwallet"

echo "Checking wallet status..."

if bitcoin-cli -regtest \
  -rpcuser="$BITCOIN_RPCUSER" \
  -rpcpassword="$BITCOIN_RPCPASSWORD" \
  -rpcport="$BITCOIN_RPCPORT" listwallets | grep -q "\"$WALLET\""; then
  echo "Wallet '$WALLET' is already loaded."
else
  if bitcoin-cli -regtest \
    -rpcuser="$BITCOIN_RPCUSER" \
    -rpcpassword="$BITCOIN_RPCPASSWORD" \
    -rpcport="$BITCOIN_RPCPORT" listwalletdir | grep -q "\"$WALLET\""; then
    echo "Wallet directory exists but not loaded — loading it..."
    bitcoin-cli -regtest \
      -rpcuser="$BITCOIN_RPCUSER" \
      -rpcpassword="$BITCOIN_RPCPASSWORD" \
      -rpcport="$BITCOIN_RPCPORT" loadwallet "$WALLET" >/dev/null 2>&1 || true
  else
    echo "Creating new wallet '$WALLET'..."
    bitcoin-cli -regtest \
      -rpcuser="$BITCOIN_RPCUSER" \
      -rpcpassword="$BITCOIN_RPCPASSWORD" \
      -rpcport="$BITCOIN_RPCPORT" createwallet "$WALLET" >/dev/null 2>&1 || true
  fi
fi

# -------------------------------------------------------------
# Mine some initial blocks
# -------------------------------------------------------------
NEWADDR=$(bitcoin-cli -regtest \
  -rpcuser="$BITCOIN_RPCUSER" \
  -rpcpassword="$BITCOIN_RPCPASSWORD" \
  -rpcport="$BITCOIN_RPCPORT" \
  -rpcwallet="$WALLET" getnewaddress)

echo "Mining 101 blocks to $NEWADDR ..."
bitcoin-cli -regtest \
  -rpcuser="$BITCOIN_RPCUSER" \
  -rpcpassword="$BITCOIN_RPCPASSWORD" \
  -rpcport="$BITCOIN_RPCPORT" \
  -rpcwallet="$WALLET" generatetoaddress 101 "$NEWADDR" >/dev/null

# -------------------------------------------------------------
# Lightning Node Setup
# -------------------------------------------------------------
LIGHTNING_DIR_4="/Users/a1707/lightning4"
LIGHTNING_DIR_5="/Users/a1707/lightning5"
LIGHTNING_DIR_6="/Users/a1707/lightning6"

mkdir -p "$LIGHTNING_DIR_4" "$LIGHTNING_DIR_5" "$LIGHTNING_DIR_6"

echo "=== Starting new Lightning nodes (node4–node6) ==="

start_lightning_node() {
  local DIR="$1"
  local PORT="$2"

  echo "Starting lightningd for $DIR on port $PORT ..."
  lightningd --network=regtest \
    --lightning-dir="$DIR" \
    --bitcoin-rpcuser="$BITCOIN_RPCUSER" \
    --bitcoin-rpcpassword="$BITCOIN_RPCPASSWORD" \
    --bitcoin-rpcconnect=127.0.0.1 \
    --bitcoin-rpcport="$BITCOIN_RPCPORT" \
    --addr=127.0.0.1:"$PORT" \
    --log-file="$DIR/debug.log" \
    --daemon
}

start_lightning_node "$LIGHTNING_DIR_4" 9740
start_lightning_node "$LIGHTNING_DIR_5" 9741
start_lightning_node "$LIGHTNING_DIR_6" 9742

echo ""
echo "✅ All new Lightning nodes started successfully."
echo ""
echo "Run 'npm run start-backend' to start backend."
echo "Run 'npm run start-cli' to interact with nodes."
echo ""
echo "To stop all services, run './scripts/stop-all.sh'."
