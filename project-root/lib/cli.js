// lib/cli.js
const { spawn } = require('child_process')
const WebSocket = require('ws')
const net = require('net')

const url = 'ws://localhost:8080'
const name = 'cli'
const to = 'backend'
let mid = 0
const wait = new Map()
const cmd = process.argv[2] || 'run'
const arg1 = process.argv[3]
const arg2 = process.argv[4]
const arg3 = process.argv[5]

// --- Check if daemon is running ---
function isPortInUse (port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, '127.0.0.1')
    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

// --- Spawn backend as daemon ---
function startDaemon () {
  console.log('🚀 Starting backend daemon...')
  const subprocess = spawn('node', ['lib/server.js'], {
    detached: true,
    stdio: 'ignore'
  })
  subprocess.unref()
  console.log('✅ Backend daemon started in background (pid:', subprocess.pid, ')')
}

// --- Send message over websocket ---
function send (ws, type, data, handler) {
  const head = [name, to, mid++]
  const msg = { head, type, data }
  const key = `backend,${name},${head[2]}` // expected reply head from backend
  wait.set(key, handler)
  ws.send(JSON.stringify(msg))
}

// --- Command dispatcher ---
async function run () {
  const running = await isPortInUse(8080)

  if (cmd === 'status') {
    console.log(running ? '✅ Backend is running' : '❌ Backend not running')
    process.exit(0)
  }

  if (cmd === 'stop') {
    if (!running) {
      console.log('⚠️ Backend is not running.')
      process.exit(0)
    }
    console.log('🛑 Sending stop signal to backend...')
    const ws = new WebSocket(url)
    ws.on('open', () => {
      send(ws, 'daemon-stop', {}, (m) => {
        console.log('✅ Backend confirmed stop:', m.data.status)
        ws.close()
        process.exit(0)
      })
    })
    setTimeout(() => {
      console.log('⏱️ Timeout: backend stopped.')
      process.exit(0)
    }, 3000)
    return
  }

  // Default behavior: connect to backend or start if missing
  if (!running) startDaemon()

  setTimeout(() => {
    const ws = new WebSocket(url)

    ws.on('open', () => {
      console.log('connected to backend at', url)

      const actions = {
        funds: { type: 'lightning-listfunds', data: {} },
        getinfo: { type: 'lightning-getinfo', data: {} },
        newaddress: { type: 'bitcoin-newaddress', data: {} },
        walletbalance: { type: 'bitcoin-getbalance', data: {} },
        run: { type: 'lightning-listfunds', data: {} }
      }

      const action = actions[cmd]
      if (!action) {
        console.log(`❌ Unknown command: ${cmd}`)
        ws.close()
        process.exit(1)
      }

      send(ws, action.type, action.data, (m) => {
        console.log('--- response received ---')
        console.log(JSON.stringify(m, null, 2))
        ws.close()
        process.exit(0)
      })
    })

    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      const key = m.head ? m.head.join(',') : null
      if (key && wait.has(key)) {
        const handler = wait.get(key)
        wait.delete(key)
        handler(m)
      }
    })

    ws.on('close', () => process.exit(0))
  }, running ? 0 : 1000)
}

run()
