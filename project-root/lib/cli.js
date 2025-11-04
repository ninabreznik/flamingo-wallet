#!/usr/bin/env node

// lib/cli.js

const bitcoind = require('./cli/bitcoind')
const lightningd = require('./cli/lightningd')
const websocketd = require('./cli/websocketd')
const { execSync } = require('child_process')
const WebSocket = require('ws')
const net = require('net')
const path = require('path')

const url = 'ws://localhost:8080'
const name = 'cli'
const to = 'backend'
let mid = 0
const wait = new Map()

const cmd = process.argv[2]
const arg1 = process.argv[3]
const arg2 = process.argv[4]
const arg3 = process.argv[5]

// --- helpers ---
function isPortInUse(port) {
  return new Promise(resolve => {
    const socket = net.createConnection(port, '127.0.0.1')
    socket.once('connect', () => { socket.end(); resolve(true) })
    socket.once('error', () => resolve(false))
  })
}

function send(ws, type, data, handler) {
  const head = [name, to, mid++]
  const msg = { head, type, data }
  const key = `backend,${name},${head[2]}`
  wait.set(key, handler)
  ws.send(JSON.stringify(msg))
}

// --- main logic ---
async function main() {
  switch (cmd) {
    case 'start':
      console.log('=== Starting all services ===')
      await bitcoind.start()
      await lightningd.start()
      websocketd.start()
      console.log('✅ All services started.')
      break

    case 'stop':
      console.log('=== Stopping all services ===')
      await lightningd.stop()
      await bitcoind.stop()
      websocketd.stop()
      console.log('✅ All services stopped.')
      break

    case 'status':
      console.log('=== Checking process status ===')
      try {
        const btc = execSync('pgrep -x bitcoind || true').toString().trim()
        const lnd = execSync('pgrep -x lightningd || true').toString().trim()
        const ws = execSync('pgrep -f lib/server.js || true').toString().trim()

        console.log(`bitcoind: ${btc ? '🟢 running' : '🔴 stopped'}`)
        console.log(`lightningd: ${lnd ? '🟢 running' : '🔴 stopped'}`)
        console.log(`websocketd: ${ws ? '🟢 running' : '🔴 stopped'}`)
      } catch (e) {
        console.error('Error checking status:', e.message)
      }
      break

    default: {
      if (!cmd) {
        console.log('Usage:')
        console.log('  npm run cli start   # starts bitcoind, lightningd, backend')
        console.log('  npm run cli stop    # stops everything')
        console.log('  npm run cli status  # shows status of all daemons')
        console.log('  npm run cli <funds|getinfo|newaddress|walletbalance>')
        process.exit(0)
      }

      const running = await isPortInUse(8080)
      if (!running) {
        console.log('⚠️ Backend not running. Start it with "npm run cli start" first.')
        process.exit(1)
      }

      const ws = new WebSocket(url)
      ws.on('open', () => {
        const actions = {
          funds: { type: 'lightning-listfunds', data: {} },
          getinfo: { type: 'lightning-getinfo', data: {} },
          newaddress: { type: 'bitcoin-newaddress', data: {} },
          walletbalance: { type: 'bitcoin-getbalance', data: {} }
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
    }
  }
}

main()
