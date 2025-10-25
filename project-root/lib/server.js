// lib/server.js
const { exec } = require('child_process')
const { WebSocketServer } = require('ws')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const WS_PORT = process.env.WS_PORT || 8080
const BITCOIN_RPCPORT = process.env.BITCOIN_RPCPORT || 18443
const BITCOIN_RPCUSER = process.env.BITCOIN_RPCUSER || 'rpcuser'
const BITCOIN_RPCPASSWORD = process.env.BITCOIN_RPCPASSWORD || 'rpcpassword'
const LIGHTNING_DIR = process.env.LIGHTNING_DIR_4 || './lightning-node'

// helper
function runCommand (cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message))
      resolve({ stdout: stdout.toString(), stderr: stderr.toString() })
    })
  })
}

// listfunds handler
async function lightning_listfunds () {
  const cmd = `lightning-cli --network=regtest --lightning-dir=${LIGHTNING_DIR} listfunds`
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
      log: stdout,
      data: {
        raw: parsed,
        balance_sats: satTotal,
        balance_btc: (satTotal / 1e8) + ' BTC'
      }
    }
  } catch (err) {
    return { status: 'error', log: err.message }
  }
}

async function handleMessage (msg, ws, server) {
  const [by, to, mid] = msg.head || []
  const intent = msg.type

  // 🛑 handle daemon stop
  if (intent === 'daemon-stop') {
    console.log('🛑 Received stop signal from CLI — shutting down...')
    ws.send(JSON.stringify({
      head: ['backend', by, mid],
      refs: { cause: msg.head },
      type: 'daemon-stop:response',
      data: { status: 'ok' }
    }))

    setTimeout(() => {
      server.close(() => {
        console.log('✅ Backend daemon stopped.')
        process.exit(0)
      })
    }, 300)
    return
  }

  // ⚡ handle listfunds
  if (intent === 'lightning-listfunds') {
    const payload = await lightning_listfunds()
    ws.send(JSON.stringify({
      head: ['backend', by, mid],
      refs: { cause: msg.head },
      type: 'lightning-listfunds:response',
      data: payload
    }))
    return
  }

  // unknown type
  ws.send(JSON.stringify({
    head: ['backend', by, mid],
    refs: { cause: msg.head },
    type: `${intent}:response`,
    data: { status: 'error', error: `unknown_type: ${intent}` }
  }))
}

// WebSocket server setup
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
