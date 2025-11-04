#!/usr/bin/env node
/**
 * stopAll.js — Node.js equivalent of stop-all.sh
 */

const { execSync } = require('child_process')
try {
  process.env = require('./env.json')
} catch {
  process.env = { PORT: '8080' } // fallback defaults
}
console.log('env:', process.env)


function log (msg) {
  console.log(msg)
}

function run (cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim()
  } catch (e) {
    if (!opts.ignoreError) {
      console.error(`❌ Command failed: ${cmd}`)
      console.error(e.stderr?.toString() || e.message)
      process.exit(1)
    }
    return ''
  }
}

const { BITCOIN_RPCUSER, BITCOIN_RPCPASSWORD, BITCOIN_RPCPORT } = process.env

log('Stopping lightningd (best-effort)...')
try {
  const running = execSync('pgrep -x lightningd', {
    stdio: 'pipe',
    encoding: 'utf8'
  }).trim()
  if (running) {
    run('pkill -f lightningd', { ignoreError: true })
    log('lightningd processes killed')
  }
} catch {
  log('No lightningd processes found.')
}

run('sleep 1')

log('Stopping bitcoind...')
try {
  run(
    `bitcoin-cli -regtest \
    -rpcuser="${BITCOIN_RPCUSER}" \
    -rpcpassword="${BITCOIN_RPCPASSWORD}" \
    -rpcport="${BITCOIN_RPCPORT}" stop`,
    { ignoreError: true }
  )
  log('bitcoind stop requested')
} catch {
  log('bitcoind may not be running or RPC not reachable')
}
