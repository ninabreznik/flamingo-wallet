// lib/server.js
const { exec } = require('child_process')
const { WebSocketServer } = require('ws')
const path = require('path')
try {
  process.env = require('./env.json')
} catch {
  process.env = { PORT: '8080' } // fallback defaults
}
console.log('env:', process.env)


dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const WS_PORT = process.env.WS_PORT || 8080
const BITCOIN_RPCPORT = process.env.BITCOIN_RPCPORT || 18443
const BITCOIN_RPCUSER = process.env.BITCOIN_RPCUSER || 'rpcuser'
const BITCOIN_RPCPASSWORD = process.env.BITCOIN_RPCPASSWORD || 'rpcpassword'
const LIGHTNING_DIR = process.env.LIGHTNING_DIR_4 || './lightning-node'
const NETWORK = process.env.BITCOIN_NETWORK || 'regtest'

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
  const cmd = `bitcoin-cli -regtest -rpcuser=${BITCOIN_RPCUSER} -rpcpassword=${BITCOIN_RPCPASSWORD} -rpcport=${BITCOIN_RPCPORT} ${method} ${params.join(' ')}`
  return runCommand(cmd)
}

// -----------------------------------------------------------------------------
// ⚡ Lightning functions
// -----------------------------------------------------------------------------
async function lightning_getinfo () {
  const cmd = `lightning-cli --network=${NETWORK} --lightning-dir=${LIGHTNING_DIR} getinfo`
  try {
    const { stdout } = await runCommand(cmd)
    const parsed = JSON.parse(stdout)
    return { status: 'success', data: parsed }
  } catch (err) {
    return { status: 'error', error: err.message }
  }
}

async function lightning_listfunds () {
  const cmd = `lightning-cli --network=${NETWORK} --lightning-dir=${LIGHTNING_DIR} listfunds`
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
// ₿ Bitcoin functions
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

  console.log('📩 Received from CLI:', intent)

  // stop daemon
  if (intent === 'daemon-stop') {
    console.log('🛑 Received stop signal from CLI — shutting down...')
    ws.send(JSON.stringify({
      head: ['backend', by, mid],
      type: 'daemon-stop:response',
      data: { status: 'ok' }
    }))
    setTimeout(() => server.close(() => process.exit(0)), 300)
    return
  }

  // map of actions
  const actions = {
    'lightning-getinfo': lightning_getinfo,
    'lightning-listfunds': lightning_listfunds,
    'bitcoin-newaddress': bitcoin_newaddress,
    'bitcoin-getbalance': bitcoin_getbalance
  }

  const fn = actions[intent]
  if (!fn) {
    ws.send(JSON.stringify({
      head: ['backend', by, mid],
      type: `${intent}:response`,
      data: { status: 'error', error: `unknown_type: ${intent}` }
    }))
    return
  }

  const payload = await fn()
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
