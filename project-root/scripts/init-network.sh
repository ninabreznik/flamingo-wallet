#!/bin/bash
set -e

# Load environment
source /app/env.docker.json 2>/dev/null || true

# Defaults
BITCOIN_CLI="bitcoin-cli -regtest -rpcuser=user -rpcpassword=password -rpcport=18443"
LIGHTNING_CLI="lightning-cli --network=regtest"
L4_DIR="/data/lightning4"
L5_DIR="/data/lightning5" # The Hub
L6_DIR="/data/lightning6" # The Merchant

echo "=== 🚀 Initializing Flamingo Network ==="

# Helper: Fund a node
fund_node() {
    DIR=$1
    NAME=$2
    AMOUNT=$3
    echo ">> 💰 Funding $NAME ($AMOUNT BTC)..."
    ADDR=$($LIGHTNING_CLI --lightning-dir=$DIR newaddr | jq -r .bech32)
    $BITCOIN_CLI -rpcwallet=regtestwallet sendtoaddress $ADDR $AMOUNT > /dev/null
}

# Helper: Connect and Open Channel
connect_and_open() {
    FROM_DIR=$1
    TO_DIR=$2
    FROM_NAME=$3
    TO_NAME=$4
    AMOUNT_SATS=$5

    echo ">> 🔗 Connecting $FROM_NAME -> $TO_NAME..."
    
    # Get ID and Info from Dest
    TO_INFO=$($LIGHTNING_CLI --lightning-dir=$TO_DIR getinfo)
    TO_ID=$(echo $TO_INFO | jq -r .id)
    TO_PORT=$(echo $TO_INFO | jq -r '.binding[0].port')
    
    # Connect
    $LIGHTNING_CLI --lightning-dir=$FROM_DIR connect $TO_ID@127.0.0.1:$TO_PORT > /dev/null 2>&1 || true
    
    echo ">> ⚡ Opening Channel ($AMOUNT_SATS sats)..."
    # Create Channel - Allow errors to be seen
    $LIGHTNING_CLI --lightning-dir=$FROM_DIR fundchannel $TO_ID $AMOUNT_SATS || echo "   ⚠️ Channel open failed (maybe already exists?)"
}

# Helper: Wait for node to be ready
wait_for_startup() {
    DIR=$1
    NAME=$2
    echo ">> ⏳ Waiting for $NAME to start..."
    for i in {1..30}; do
        if $LIGHTNING_CLI --lightning-dir=$DIR getinfo > /dev/null 2>&1; then
            echo "   ✅ $NAME is ready."
            return 0
        fi
        sleep 2
    done
    echo "   ❌ $NAME failed to start."
    echo "      Hint: If you see 'bitcoind has gone backwards' in logs, you MUST delete the data folder: rm -rf data"
    exit 1
}

# Helper: Wait for funds to be confirmed
wait_for_funds() {
    NODE_DIR=$1
    NAME=$2
    echo ">> ⏳ Waiting for $NAME to see funds..."
    for i in {1..60}; do
        # Check if ANY output is confirmed
        CONFIRMED=$($LIGHTNING_CLI --lightning-dir=$NODE_DIR listfunds | jq -r '.outputs[] | select(.status == "confirmed") | .status' | head -n 1)
        
        if [[ "$CONFIRMED" == "confirmed" ]]; then
            echo "   ✅ Funds confirmed for $NAME"
            return 0
        fi
        
        # Debug output every 5 seconds
        if (( i % 5 == 0 )); then
             echo "   ... waiting ($i/60). Current listfunds:"
             $LIGHTNING_CLI --lightning-dir=$NODE_DIR listfunds | jq -c .outputs
        fi
        
        sleep 2
    done
    echo "   ❌ Timeout waiting for funds for $NAME"
    return 1
}

# 0. Wait for startup
wait_for_startup $L4_DIR "Node 4"
wait_for_startup $L5_DIR "Node 5"
wait_for_startup $L6_DIR "Node 6"

# 1. Fund all nodes
fund_node $L4_DIR "Node 4" 5
fund_node $L5_DIR "Node 5" 5
fund_node $L6_DIR "Node 6" 5

echo ">> ⛏️  Mining 10 blocks to confirm funding..."
$BITCOIN_CLI -rpcwallet=regtestwallet generatetoaddress 10 $($BITCOIN_CLI -rpcwallet=regtestwallet getnewaddress) > /dev/null

# Wait for nodes to catch up
wait_for_funds $L4_DIR "Node 4"
wait_for_funds $L5_DIR "Node 5"
wait_for_funds $L6_DIR "Node 6"

# 2. Setup Topology: Node 4 <-> Node 5 <-> Node 6
# Connect Ring
echo ">> 🌐 Establishing peer connections..."

# Forward path (User -> Hub -> Merchant)
connect_and_open $L4_DIR $L5_DIR "Node 4" "Node 5" 1000000
connect_and_open $L5_DIR $L6_DIR "Node 5" "Node 6" 1000000

echo ">> ⛏️  Mining 1 block to confirm Node 5's change output..."
$BITCOIN_CLI -rpcwallet=regtestwallet generatetoaddress 1 $($BITCOIN_CLI -rpcwallet=regtestwallet getnewaddress) > /dev/null
sleep 2

# Reverse path (Merchant -> Hub -> User)
connect_and_open $L6_DIR $L5_DIR "Node 6" "Node 5" 1000000
connect_and_open $L5_DIR $L4_DIR "Node 5" "Node 4" 1000000

echo ">> ⛏️  Mining 6 blocks to confirm channels..."
$BITCOIN_CLI -rpcwallet=regtestwallet generatetoaddress 6 $($BITCOIN_CLI -rpcwallet=regtestwallet getnewaddress) > /dev/null

echo "✅ Network Initialized!"
echo "   - All nodes funded with 5 BTC."
echo "   - Channels Established (Bidirectional Ring)."
echo "   - Full Routing Capability Ready."
