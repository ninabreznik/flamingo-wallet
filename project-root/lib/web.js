// lib/web.js
const wsUrl = 'ws://localhost:8080'

// --- UI layout ---
document.body.innerHTML = `
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #f8f9fa;
      margin: 40px;
      color: #222;
    }
    h1 { color: #e83e8c; margin-bottom: 10px; }
    section { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 0 4px rgba(0,0,0,0.1); }
    h2 { margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 6px; color: #444; }
    button { margin: 6px; padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fafafa; }
    button:hover { background: #f0f0f0; }
    input { padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-right: 6px; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 6px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
    #status { margin-bottom: 12px; font-weight: 500; }
  </style>

  <h1>⚡ Flamingo Wallet Dashboard</h1>
  <div id="status">Connecting...</div>

  <section id="node-info">
    <h2>Node Info</h2>
    <button id="btn-getinfo">Refresh Info</button>
    <div id="info-content"><i>No data yet</i></div>
  </section>

  <section id="wallet-balance">
    <h2>Wallet Balance</h2>
    <button id="btn-listfunds">Refresh Balance</button>
    <div id="balance-content"><i>No data yet</i></div>
  </section>

  <section id="btc-receive">
    <h2>Receive Bitcoin (On-chain)</h2>
    <button id="btn-newaddress">New Address</button>
    <div id="btc-address"><i>No address generated</i></div>
  </section>

  <section id="btc-balance">
    <h2>Bitcoin Wallet Balance</h2>
    <button id="btn-getbalance">Get Balance</button>
    <div id="btc-balance-value"><i>No balance yet</i></div>
  </section>

  <h3>Raw Backend Response</h3>
  <pre id="raw"></pre>
`

// --- WebSocket Setup ---
const name = 'frontend'
const to = 'backend'
let mid = 0
const wait = new Map()
let ws

function connect () {
  ws = new WebSocket(wsUrl)
  const statusEl = document.getElementById('status')

  ws.onopen = () => {
    statusEl.textContent = `✅ Connected to ${wsUrl}`
    statusEl.style.color = 'green'
    setupButtons()
  }

  ws.onclose = () => {
    statusEl.textContent = '❌ Disconnected — retrying...'
    statusEl.style.color = 'red'
    setTimeout(connect, 2000)
  }

  ws.onerror = (err) => {
    console.error('WebSocket error', err)
    statusEl.textContent = '⚠️ WebSocket Error — see console'
    statusEl.style.color = 'orange'
  }

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    const key = m.head ? m.head.join(',') : null
    if (key && wait.has(key)) {
      const handler = wait.get(key)
      wait.delete(key)
      handler(m)
    }
  }
}

function send (type, data, handler) {
  const head = [name, to, mid++]
  const msg = { head, type, data }
  const expectedKey = ['backend', name, head[2]].join(',')
  wait.set(expectedKey, handler)
  ws.send(JSON.stringify(msg))
}

// --- UI Button Handlers ---
function setupButtons () {
  const rawEl = document.getElementById('raw')

  // lightning-getinfo
  document.getElementById('btn-getinfo').onclick = () => {
    send('lightning-getinfo', {}, (m) => {
      const d = m.data?.data || {}
      document.getElementById('info-content').innerHTML = `
        <div><b>Alias:</b> ${d.alias || '-'}</div>
        <div><b>Node ID:</b> ${d.id || '-'}</div>
        <div><b>Version:</b> ${d.version || '-'}</div>
        <div><b>Network:</b> ${d.network || '-'}</div>
      `
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // lightning-listfunds
  document.getElementById('btn-listfunds').onclick = () => {
    send('lightning-listfunds', {}, (m) => {
      const d = m.data?.data
      document.getElementById('balance-content').innerHTML = `
        <div><b>Balance:</b> ${d?.balance_btc || '0 BTC'}</div>
        <div><b>Satoshis:</b> ${d?.balance_sats?.toLocaleString() || 0}</div>
      `
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // bitcoin-newaddress
  document.getElementById('btn-newaddress').onclick = () => {
    send('bitcoin-newaddress', {}, (m) => {
      const addr = m.data?.data || '(not returned)'
      document.getElementById('btc-address').innerHTML = `<b>New Address:</b> ${addr}`
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // bitcoin-getbalance
  document.getElementById('btn-getbalance').onclick = () => {
    send('bitcoin-getbalance', {}, (m) => {
      const bal = m.data?.data
      document.getElementById('btc-balance-value').innerHTML = `<b>Balance:</b> ${bal} BTC`
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
}

connect()
