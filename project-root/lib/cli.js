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
  wait.set(head.join(','), handler)
  ws.send(JSON.stringify(msg))
}

// --- Main command flow ---
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
      })
    })
    setTimeout(() => {
      console.log('⏱️ Timeout: backend stopped.')
      ws.terminate?.()
      process.exit(0)
    }, 3000)
    return
  }

  // Default behavior: connect to backend or start if missing
  if (!running) startDaemon()

  // give daemon a second to start up
  setTimeout(() => {
    const ws = new WebSocket(url)
    ws.on('open', () => {
      console.log('connected to backend at', url)
      send(ws, 'lightning-listfunds', {}, (m) => {
        console.log('--- response received ---')
        console.log(JSON.stringify(m, null, 2))
        ws.close()
      })
    })

    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString())
      const cause = m.refs?.cause
      const key = cause ? cause.join(',') : null
      if (key && wait.has(key)) {
        const h = wait.get(key)
        wait.delete(key)
        return h(m)
      }
    })
  }, running ? 0 : 1000)
}

run()
