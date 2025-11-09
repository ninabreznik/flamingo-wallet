// lib/server.js
const { exec } = require('child_process')
const { WebSocketServer } = require('ws')
const path = require('path')
try {
  process.env = require('../env.json')
} catch (e) {
  console.error('Failed to load env.json. Make sure it is in the project root.', e.message)
  process.env = { PORT: '8080' } 
}
console.log('env:', process.env)


const WS_PORT = process.env.WS_PORT || 8080
const BITCOIN_RPCPORT = process.env.BITCOIN_RPCPORT || 18443
const BITCOIN_RPCUSER = process.env.BITCOIN_RPCUSER || 'rpcuser'
const BITCOIN_RPCPASSWORD = process.env.BITCOIN_RPCPASSWORD || 'rpcpassword'
const NETWORK = process.env.BITCOIN_NETWORK || 'regtest'


const {
  LIGHTNING_DIR_4,
  LIGHTNING_DIR_5,
  LIGHTNING_DIR_6,
  BITCOIN_CLI_BIN,
  LIGHTNING_CLI_BIN
} = process.env


const BITCOIN_CLI = BITCOIN_CLI_BIN || '/usr/local/bin/bitcoin-cli'
const LIGHTNING_CLI = LIGHTNING_CLI_BIN || '/usr/local/bin/lightning-cli'

const LIGHTNING_DIRS = {
  'node4': LIGHTNING_DIR_4 || '/Users/a1707/lightning4',
  'node5': LIGHTNING_DIR_5 || '/Users/a1707/lightning5',
  'node6': LIGHTNING_DIR_6 || '/Users/a1707/lightning6'
}

// -----------------------------------------------------------------------------
// 🧰 Helpers
// -----------------------------------------------------------------------------
function runCommand (cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message))
      resolve({ stdout: stdout.toString(), stderr: stderr.toString() })
    })
  })
}

function btcRpc (method, params = []) {
  const cmd = `${BITCOIN_CLI} -regtest -rpcuser=${BITCOIN_RPCUSER} -rpcpassword=${BITCOIN_RPCPASSWORD} -rpcport=${BITCOIN_RPCPORT} ${method} ${params.join(' ')}`
  return runCommand(cmd)
}

// -----------------------------------------------------------------------------
// ⚡ Lightning functions
// -----------------------------------------------------------------------------
//  Functions now accept a 'data' object to get the nodeId
async function lightning_getinfo (data = {}) {
  const nodeId = data.nodeId || 'node4' // Default to node4
  const dir = LIGHTNING_DIRS[nodeId]
  if (!dir) return { status: 'error', error: `Unknown node ID: ${nodeId}` }

  //  Use the absolute LIGHTNING_CLI path and correct dir
  const cmd = `${LIGHTNING_CLI} --network=${NETWORK} --lightning-dir=${dir} getinfo`
  try {
    const { stdout } = await runCommand(cmd)
    const parsed = JSON.parse(stdout)
    return { status: 'success', data: parsed }
  } catch (err) {
    return { status: 'error', error: err.message }
  }
}

async function lightning_listfunds (data = {}) {
  const nodeId = data.nodeId || 'node4' // Default to node4
  const dir = LIGHTNING_DIRS[nodeId]
  if (!dir) return { status: 'error', error: `Unknown node ID: ${nodeId}` }

  const cmd = `${LIGHTNING_CLI} --network=${NETWORK} --lightning-dir=${dir} listfunds`
  try {
    const { stdout } = await runCommand(cmd)
    const parsed = JSON.parse(stdout)
    const outputs = parsed.outputs || []

    const satTotal = outputs.reduce((acc, o) => {
      const raw = String(o.amount_msat || o.amount || o.value || 0)
      const n = raw.endsWith('msat') ? Number(raw.replace(/msat$/, '')) / 1000 : Number(raw)
      return acc + (Number.isNaN(n) ? 0 : n)
    }, 0)

    return {
      status: 'success',
      data: {
        raw: parsed,
        balance_sats: satTotal,
        balance_btc: (satTotal / 1e8) + ' BTC'
      }
    }
  } catch (err) {
    return { status: 'error', error: err.message }
  }
}


// -----------------------------------------------------------------------------
// ₿ Bitcoin functions (These are fine, as they talk to one bitcoind)
// -----------------------------------------------------------------------------
async function bitcoin_newaddress () {
  try {
    const { stdout } = await btcRpc('getnewaddress')
    return { status: 'success', data: stdout.trim() }
  } catch (err) {
    return { status: 'error', error: err.message }
  }
}

async function bitcoin_getbalance () {
  try {
    const { stdout } = await btcRpc('getbalance')
    return { status: 'success', data: parseFloat(stdout.trim()) }
  } catch (err) {
    return { status: 'error', error: err.message }
  }
}

// -----------------------------------------------------------------------------
// 🔄 WebSocket handler
// -----------------------------------------------------------------------------
async function handleMessage (msg, ws, server) {
  const [by, to, mid] = msg.head || []
  const intent = msg.type
  const data = msg.data 

  console.log(`📩 Received from ${by}:`, intent, data || '')


  if (intent === 'daemon-stop') {
    console.log('🚨 Stopping backend daemon as requested...')
  }

  const actions = {
    'lightning-getinfo': lightning_getinfo,
    'lightning-listfunds': lightning_listfunds,
    'bitcoin-newaddress': bitcoin_newaddress,
    'bitcoin-getbalance': bitcoin_getbalance
  }

  const fn = actions[intent]
  if (!fn) {
  }

  //  Pass the 'data' payload to the action function
  const payload = await fn(data) 
  ws.send(JSON.stringify({
    head: ['backend', by, mid],
    type: `${intent}:response`,
    data: payload
  }))
}

// -----------------------------------------------------------------------------
// 🚀 WebSocket server setup
// -----------------------------------------------------------------------------
const wss = new WebSocketServer({ port: Number(WS_PORT) })
console.log(`🚀 Backend daemon listening on ws://localhost:${WS_PORT}`)

wss.on('connection', (ws, req) => {
  console.log('client connected:', req.socket.remoteAddress)
  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      await handleMessage(msg, ws, wss)
    } catch (err) {
      console.error('Message error:', err.message)
      ws.send(JSON.stringify({ type: 'error', data: { error: err.message } }))
    }
  })
  ws.on('close', () => console.log('client disconnected'))
})