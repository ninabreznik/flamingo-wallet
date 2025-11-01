#!/usr/bin/env node

const { execSync, spawnSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (msg) => console.log(msg)

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim()
  } catch (e) {
    if (!opts.ignoreError) {
      console.error(`❌ Command failed: ${cmd}`)
      console.error(e.stderr?.toString() || e.message)
      process.exit(1)
    }
    return e.stderr?.toString() || e.message || ''
  }
}

const projectRoot = path.join(__dirname, '..')
process.chdir(projectRoot)

const {
  BITCOIN_DATADIR,
  BITCOIN_RPCUSER,
  BITCOIN_RPCPASSWORD,
  BITCOIN_RPCPORT
} = process.env

// -------------------------------------------------------------
// Start Bitcoin Regtest
// -------------------------------------------------------------
log('=== Starting Bitcoin Regtest ===')

if (!fs.existsSync(BITCOIN_DATADIR)) {
  log(`⚠️ Creating Bitcoin data directory: ${BITCOIN_DATADIR}`)
  fs.mkdirSync(BITCOIN_DATADIR, { recursive: true })
}

const ps = spawnSync('pgrep', ['-x', 'bitcoind'])
if (ps.status === 0) {
  log('⚠️ bitcoind already running — skipping new launch.')
} else {
  run(
    `bitcoind -regtest -daemon \
    -datadir="${BITCOIN_DATADIR}" \
    -rpcuser="${BITCOIN_RPCUSER}" \
    -rpcpassword="${BITCOIN_RPCPASSWORD}" \
    -rpcallowip=127.0.0.1 \
    -rpcport=${BITCOIN_RPCPORT} \
    -fallbackfee=0.0002`
  )
}

log('Waiting for bitcoind RPC...')

;(async () => {
  while (true) {
    const res = spawnSync('bitcoin-cli', [
      '-regtest',
      `-rpcuser=${BITCOIN_RPCUSER}`,
      `-rpcpassword=${BITCOIN_RPCPASSWORD}`,
      `-rpcport=${BITCOIN_RPCPORT}`,
      'getblockchaininfo'
    ])
    if (res.status === 0) break
    await sleep(500)
  }

  log('✅ bitcoind ready.')

  // -------------------------------------------------------------
  // Wallet Handling
  // -------------------------------------------------------------
  const WALLET = 'regtestwallet'
  log('Checking wallet status...')

  const wallets = run(
    `bitcoin-cli -regtest \
      -rpcuser="${BITCOIN_RPCUSER}" \
      -rpcpassword="${BITCOIN_RPCPASSWORD}" \
      -rpcport=${BITCOIN_RPCPORT} listwallets`,
    { ignoreError: true }
  )

  if (wallets.includes(`"${WALLET}"`)) {
    log(`Wallet '${WALLET}' is already loaded.`)
  } else {
    const walletDirs = run(
      `bitcoin-cli -regtest \
        -rpcuser="${BITCOIN_RPCUSER}" \
        -rpcpassword="${BITCOIN_RPCPASSWORD}" \
        -rpcport=${BITCOIN_RPCPORT} listwalletdir`,
      { ignoreError: true }
    )
    if (walletDirs.includes(`"${WALLET}"`)) {
      log('Wallet directory exists but not loaded — loading it...')
      run(
        `bitcoin-cli -regtest \
          -rpcuser="${BITCOIN_RPCUSER}" \
          -rpcpassword="${BITCOIN_RPCPASSWORD}" \
          -rpcport=${BITCOIN_RPCPORT} loadwallet "${WALLET}"`,
        { ignoreError: true }
      )
    } else {
      log(`Creating new wallet '${WALLET}'...`)
      run(
        `bitcoin-cli -regtest \
          -rpcuser="${BITCOIN_RPCUSER}" \
          -rpcpassword="${BITCOIN_RPCPASSWORD}" \
          -rpcport=${BITCOIN_RPCPORT} createwallet "${WALLET}"`,
        { ignoreError: true }
      )
    }
  }

  // -------------------------------------------------------------
  // Mine Initial Blocks
  // -------------------------------------------------------------
  const newAddr = run(
    `bitcoin-cli -regtest \
      -rpcuser="${BITCOIN_RPCUSER}" \
      -rpcpassword="${BITCOIN_RPCPASSWORD}" \
      -rpcport=${BITCOIN_RPCPORT} \
      -rpcwallet="${WALLET}" getnewaddress`
  )

  log(`Mining 101 blocks to ${newAddr} ...`)
  run(
    `bitcoin-cli -regtest \
      -rpcuser="${BITCOIN_RPCUSER}" \
      -rpcpassword="${BITCOIN_RPCPASSWORD}" \
      -rpcport=${BITCOIN_RPCPORT} \
      -rpcwallet="${WALLET}" generatetoaddress 101 "${newAddr}"`,
    { ignoreError: true }
  )

  // -------------------------------------------------------------
  // Lightning Node Setup
  // -------------------------------------------------------------
  const LIGHTNING_DIRS = [
    '/Users/a1707/lightning4',
    '/Users/a1707/lightning5',
    '/Users/a1707/lightning6'
  ]
  const LIGHTNING_PORTS = [9740, 9741, 9742]

  LIGHTNING_DIRS.forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })

  log('=== Starting new Lightning nodes (node4–node6) ===')

  const startLightningNode = (dir, port) => {
    log(`→ Starting lightningd for ${dir} on port ${port}`)
    const args = [
      '--network=regtest',
      `--lightning-dir=${dir}`,
      `--bitcoin-rpcuser=${BITCOIN_RPCUSER}`,
      `--bitcoin-rpcpassword=${BITCOIN_RPCPASSWORD}`,
      '--bitcoin-rpcconnect=127.0.0.1',
      `--bitcoin-rpcport=${BITCOIN_RPCPORT}`,
      `--addr=127.0.0.1:${port}`,
      `--log-file=${dir}/debug.log`,
      '--daemon'
    ]
    const child = spawn('lightningd', args, { detached: true, stdio: 'ignore' })
    child.unref()
  }

  // Start all 3 asynchronously
  LIGHTNING_DIRS.forEach((dir, i) => startLightningNode(dir, LIGHTNING_PORTS[i]))

  // Allow daemons to initialize
  await sleep(3000)

  // Verify
  const checkLightning = spawnSync('pgrep', ['-x', 'lightningd'])
  if (checkLightning.status !== 0) {
    console.error('❌ Lightning nodes failed to start.')
    LIGHTNING_DIRS.forEach((dir) => {
      console.error(`Check log: ${dir}/debug.log`)
    })
  } else {
    log('✅ Verified: all lightningd processes are running.')
  }

  log('')
  log("Run 'npm run node' to start backend and interact with nodes.")
  log('')
  log("To stop all services, run 'npm run env:stop'.")
  log('')
})()
