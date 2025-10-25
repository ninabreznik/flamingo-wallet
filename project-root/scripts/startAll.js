#!/usr/bin/env node
/**
 * startAll.js — Node.js equivalent of start-all.sh
 * Fully reproduces Bash behavior using child_process and .env
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(msg) {
  console.log(msg);
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
  } catch (e) {
    if (!opts.ignoreError) {
      console.error(`❌ Command failed: ${cmd}`);
      console.error(e.stderr?.toString() || e.message);
      process.exit(1);
    }
    return "";
  }
}

// Move to project root
const projectRoot = path.join(__dirname, "..");
process.chdir(projectRoot);

// Load env
const {
  BITCOIN_DATADIR,
  BITCOIN_RPCUSER,
  BITCOIN_RPCPASSWORD,
  BITCOIN_RPCPORT,
} = process.env;

// -------------------------------------------------------------
// Start Bitcoin Regtest
// -------------------------------------------------------------
log("=== Starting Bitcoin Regtest ===");
run(
  `bitcoind -regtest -daemon \
  -datadir="${BITCOIN_DATADIR}" \
  -rpcuser="${BITCOIN_RPCUSER}" \
  -rpcpassword="${BITCOIN_RPCPASSWORD}" \
  -rpcallowip=127.0.0.1 \
  -rpcport="${BITCOIN_RPCPORT}" \
  -fallbackfee=0.0002`
);

log("Waiting for bitcoind RPC...");
(async () => {
  while (true) {
    try {
      run(
        `bitcoin-cli -regtest \
        -rpcuser="${BITCOIN_RPCUSER}" \
        -rpcpassword="${BITCOIN_RPCPASSWORD}" \
        -rpcport="${BITCOIN_RPCPORT}" getblockchaininfo`
      );
      break;
    } catch {
      await sleep(500);
    }
  }

  log("✅ bitcoind ready.");

  // -------------------------------------------------------------
  // Wallet Handling
  // -------------------------------------------------------------
  const WALLET = "regtestwallet";
  log("Checking wallet status...");

  const wallets = run(
    `bitcoin-cli -regtest \
      -rpcuser="${BITCOIN_RPCUSER}" \
      -rpcpassword="${BITCOIN_RPCPASSWORD}" \
      -rpcport="${BITCOIN_RPCPORT}" listwallets`,
    { ignoreError: true }
  );

  if (wallets.includes(`"${WALLET}"`)) {
    log(`Wallet '${WALLET}' is already loaded.`);
  } else {
    const walletDirs = run(
      `bitcoin-cli -regtest \
        -rpcuser="${BITCOIN_RPCUSER}" \
        -rpcpassword="${BITCOIN_RPCPASSWORD}" \
        -rpcport="${BITCOIN_RPCPORT}" listwalletdir`,
      { ignoreError: true }
    );
    if (walletDirs.includes(`"${WALLET}"`)) {
      log(`Wallet directory exists but not loaded — loading it...`);
      run(
        `bitcoin-cli -regtest \
          -rpcuser="${BITCOIN_RPCUSER}" \
          -rpcpassword="${BITCOIN_RPCPASSWORD}" \
          -rpcport="${BITCOIN_RPCPORT}" loadwallet "${WALLET}"`,
        { ignoreError: true }
      );
    } else {
      log(`Creating new wallet '${WALLET}'...`);
      run(
        `bitcoin-cli -regtest \
          -rpcuser="${BITCOIN_RPCUSER}" \
          -rpcpassword="${BITCOIN_RPCPASSWORD}" \
          -rpcport="${BITCOIN_RPCPORT}" createwallet "${WALLET}"`,
        { ignoreError: true }
      );
    }
  }

  // -------------------------------------------------------------
  // Mine Initial Blocks
  // -------------------------------------------------------------
  const newAddr = run(
    `bitcoin-cli -regtest \
      -rpcuser="${BITCOIN_RPCUSER}" \
      -rpcpassword="${BITCOIN_RPCPASSWORD}" \
      -rpcport="${BITCOIN_RPCPORT}" \
      -rpcwallet="${WALLET}" getnewaddress`
  );

  log(`Mining 101 blocks to ${newAddr} ...`);
  run(
    `bitcoin-cli -regtest \
      -rpcuser="${BITCOIN_RPCUSER}" \
      -rpcpassword="${BITCOIN_RPCPASSWORD}" \
      -rpcport="${BITCOIN_RPCPORT}" \
      -rpcwallet="${WALLET}" generatetoaddress 101 "${newAddr}"`,
    { ignoreError: true }
  );

  // -------------------------------------------------------------
  // Lightning Node Setup
  // -------------------------------------------------------------
  const LIGHTNING_DIRS = [
    "/Users/a1707/lightning4",
    "/Users/a1707/lightning5",
    "/Users/a1707/lightning6",
  ];
  const LIGHTNING_PORTS = [9740, 9741, 9742];

  LIGHTNING_DIRS.forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  log("=== Starting new Lightning nodes (node4–node6) ===");

  function startLightningNode(dir, port) {
    log(`Starting lightningd for ${dir} on port ${port} ...`);
    run(
      `lightningd --network=regtest \
      --lightning-dir="${dir}" \
      --bitcoin-rpcuser="${BITCOIN_RPCUSER}" \
      --bitcoin-rpcpassword="${BITCOIN_RPCPASSWORD}" \
      --bitcoin-rpcconnect=127.0.0.1 \
      --bitcoin-rpcport="${BITCOIN_RPCPORT}" \
      --addr=127.0.0.1:"${port}" \
      --log-file="${dir}/debug.log" \
      --daemon`
    );
  }

  for (let i = 0; i < LIGHTNING_DIRS.length; i++) {
    startLightningNode(LIGHTNING_DIRS[i], LIGHTNING_PORTS[i]);
  }

  log("");
  log("✅ All new Lightning nodes started successfully.");
  log("");
  log("Run 'npm run start-backend' to start backend.");
  log("Run 'npm run start-cli' to interact with nodes.");
  log("");
  log("To stop all services, run 'npm run stop-env'.");
})();
