#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/.."
cd "$DIR"
. ./.env

echo "Starting bitcoind (regtest)..."
bitcoind -regtest -daemon \
  -datadir="$BITCOIN_DATADIR" \
  -rpcuser="$BITCOIN_RPCUSER" \
  -rpcpassword="$BITCOIN_RPCPASSWORD" \
  -rpcallowip=127.0.0.1 \
  -rpcport="$BITCOIN_RPCPORT" \
  -fallbackfee=0.0002

echo "Waiting for bitcoind RPC..."
until bitcoin-cli -regtest -rpcuser="$BITCOIN_RPCUSER" -rpcpassword="$BITCOIN_RPCPASSWORD" -rpcport="$BITCOIN_RPCPORT" getblockchaininfo >/dev/null 2>&1; do
  sleep 0.5
done
echo "bitcoind ready."

WALLET="regtestwallet"
if ! bitcoin-cli -regtest -rpcuser="$BITCOIN_RPCUSER" -rpcpassword="$BITCOIN_RPCPASSWORD" -rpcport="$BITCOIN_RPCPORT" listwallets | grep -q "\"$WALLET\""; then
  echo "Creating wallet $WALLET"
  bitcoin-cli -regtest -rpcuser="$BITCOIN_RPCUSER" -rpcpassword="$BITCOIN_RPCPASSWORD" -rpcport="$BITCOIN_RPCPORT" createwallet "$WALLET"
else
  echo "Wallet $WALLET exists"
fi

NEWADDR=$(bitcoin-cli -regtest -rpcuser="$BITCOIN_RPCUSER" -rpcpassword="$BITCOIN_RPCPASSWORD" -rpcport="$BITCOIN_RPCPORT" -rpcwallet="$WALLET" getnewaddress)
echo "Mining 101 blocks to $NEWADDR ..."
bitcoin-cli -regtest -rpcuser="$BITCOIN_RPCUSER" -rpcpassword="$BITCOIN_RPCPASSWORD" -rpcport="$BITCOIN_RPCPORT" -rpcwallet="$WALLET" generatetoaddress 101 "$NEWADDR"

echo "Starting lightningd nodes..."
lightningd --network=regtest --lightning-dir="$LIGHTNING_DIR_1" \
  --bitcoin-rpcuser="$BITCOIN_RPCUSER" --bitcoin-rpcpassword="$BITCOIN_RPCPASSWORD" \
  --bitcoin-rpcconnect=127.0.0.1 --bitcoin-rpcport="$BITCOIN_RPCPORT" \
  --addr=127.0.0.1:9735 --log-file="$LIGHTNING_DIR_1/debug.log" --daemon

lightningd --network=regtest --lightning-dir="$LIGHTNING_DIR_2" \
  --bitcoin-rpcuser="$BITCOIN_RPCUSER" --bitcoin-rpcpassword="$BITCOIN_RPCPASSWORD" \
  --bitcoin-rpcconnect=127.0.0.1 --bitcoin-rpcport="$BITCOIN_RPCPORT" \
  --addr=127.0.0.1:9736 --log-file="$LIGHTNING_DIR_2/debug.log" --daemon

lightningd --network=regtest --lightning-dir="$LIGHTNING_DIR_3" \
  --bitcoin-rpcuser="$BITCOIN_RPCUSER" --bitcoin-rpcpassword="$BITCOIN_RPCPASSWORD" \
  --bitcoin-rpcconnect=127.0.0.1 --bitcoin-rpcport="$BITCOIN_RPCPORT" \
  --addr=127.0.0.1:9737 --log-file="$LIGHTNING_DIR_3/debug.log" --daemon

echo "All nodes started successfully."
echo "Start backend:   npm run start-backend"
echo "Start test UI:   npm run start-cli"
