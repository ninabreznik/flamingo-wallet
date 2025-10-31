// lib/web.js
const wsUrl = 'ws://localhost:8080'

document.body.innerHTML = `
  <style>
    body { font-family: system-ui, sans-serif; background: #fafafa; margin: 40px; }
    h1 { color: #e83e8c; }
    button { padding: 6px 12px; margin-right: 6px; border: none; background: #e83e8c; color: #fff; border-radius: 4px; cursor: pointer; }
    button:hover { opacity: 0.85; }
    #status { margin-bottom: 12px; }
    section { margin-top: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 6px; }
  </style>
  <h1>⚡ Flamingo Wallet — Lightning Node</h1>
  <div id="status">Connecting...</div>
  <div>
    <button id="btn-info">Get Info</button>
    <button id="btn-funds">List Funds</button>
    <button id="btn-balance">Wallet Balance</button>
    <button id="btn-address">New BTC Address</button>
  </div>
  <section id="info"></section>
  <section id="balance"></section>
  <section id="outputs"></section>
  <h3>Raw Response</h3>
  <pre id="raw"></pre>
`

const name = 'frontend'
const to = 'backend'
let mid = 0
const wait = {}
let ws

function connect () {
  ws = new WebSocket(wsUrl)

  const statusEl = document.getElementById('status')
  const infoEl = document.getElementById('info')
  const balanceEl = document.getElementById('balance')
  const outputsEl = document.getElementById('outputs')
  const rawEl = document.getElementById('raw')

  ws.onopen = () => {
    statusEl.textContent = `✅ Connected to ${wsUrl}`
    statusEl.style.color = 'green'

    document.getElementById('btn-info').onclick = () => {
      send('lightning-getinfo', {}, render)
    }
    document.getElementById('btn-funds').onclick = () => {
      send('lightning-listfunds', {}, render)
    }
    document.getElementById('btn-balance').onclick = () => {
      send('bitcoin-getbalance', {}, render)
    }
    document.getElementById('btn-address').onclick = () => {
      send('bitcoin-newaddress', {}, render)
    }

    // auto-fetch funds on connect
    send('lightning-listfunds', {}, render)
  }

  function render (m) {
    rawEl.textContent = JSON.stringify(m, null, 2)
    const data = m.data?.data || {}

    if (m.type.startsWith('lightning-getinfo')) {
      infoEl.innerHTML = `<h3>Node Info</h3><pre>${JSON.stringify(data, null, 2)}</pre>`
    }

    if (m.type.startsWith('lightning-listfunds')) {
      balanceEl.innerHTML = `
        <div><strong>Balance (BTC):</strong> ${data.balance_btc}</div>
        <div><strong>Balance (sats):</strong> ${data.balance_sats?.toLocaleString?.()}</div>
      `
      const outputs = data.raw?.outputs || []
      if (outputs.length === 0) {
        outputsEl.innerHTML = '<i>No on-chain outputs found.</i>'
      } else {
        const rows = outputs.map((o, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${o.txid?.slice(0, 10)}...</td>
            <td>${(Number(o.amount_msat) / 1000 / 1e8).toFixed(8)} BTC</td>
            <td>${o.status}</td>
            <td>${o.blockheight || '-'}</td>
          </tr>`).join('')
        outputsEl.innerHTML = `
          <table>
            <thead>
              <tr><th>#</th><th>TXID</th><th>Amount</th><th>Status</th><th>Block</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `
      }
    }

    if (m.type.startsWith('bitcoin-getbalance')) {
      balanceEl.innerHTML = `<div><strong>Bitcoin wallet balance:</strong> ${data} BTC</div>`
    }

    if (m.type.startsWith('bitcoin-newaddress')) {
      outputsEl.innerHTML = `<div><strong>New Bitcoin address:</strong> ${data}</div>`
    }
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
    const causeKey = m.refs?.cause?.join(',')
    if (causeKey && wait[causeKey]) {
      const h = wait[causeKey]
      delete wait[causeKey]
      return h(m)
    }
    console.log('unsolicited', m)
  }
}

function send (type, data, handler) {
  const head = [name, to, mid++]
  const msg = { head, type, data }
  wait[head.join(',')] = handler
  ws.send(JSON.stringify(msg))
}

connect()


/*
Dashboard version (untested)
// lib/web.js
const wsUrl = 'ws://localhost:8080'

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

  <section id="receive-ln">
    <h2>Receive Payment (Lightning)</h2>
    <input id="invoice-amount" type="number" placeholder="Amount in sats">
    <button id="btn-createinvoice">Create Invoice</button>
    <div id="invoice-result"><i>No invoice yet</i></div>
  </section>

  <section id="send-ln">
    <h2>Send Payment (Lightning)</h2>
    <input id="bolt11-input" type="text" placeholder="Paste BOLT11 invoice">
    <button id="btn-payinvoice">Pay Invoice</button>
    <div id="pay-result"><i>No payment yet</i></div>
  </section>

  <section id="invoices">
    <h2>Invoices History</h2>
    <button id="btn-listinvoices">Refresh</button>
    <div id="invoices-list"><i>No invoices yet</i></div>
  </section>

  <section id="payments">
    <h2>Payments History</h2>
    <button id="btn-listpayments">Refresh</button>
    <div id="payments-list"><i>No payments yet</i></div>
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

// --- WebSocket setup ---
const name = 'frontend'
const to = 'backend'
let mid = 0
const wait = {}
let ws

function connect() {
  ws = new WebSocket(wsUrl)
  const statusEl = document.getElementById('status')
  const rawEl = document.getElementById('raw')

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
    const causeKey = m.refs?.cause?.join(',')
    if (causeKey && wait[causeKey]) {
      const h = wait[causeKey]
      delete wait[causeKey]
      return h(m)
    }
  }
}

function send(type, data, handler) {
  const head = [name, to, mid++]
  const msg = { head, type, data }
  wait[head.join(',')] = handler
  ws.send(JSON.stringify(msg))
}

// --- UI Button Handlers ---
function setupButtons() {
  const rawEl = document.getElementById('raw')

  // lightning-getinfo
  document.getElementById('btn-getinfo').onclick = () => {
    send('lightning-getinfo', {}, (m) => {
      const d = m.data?.data || {}
      document.getElementById('info-content').innerHTML = `
        <div><b>Alias:</b> ${d.alias || '-'}</div>
        <div><b>Node ID:</b> ${d.id || '-'}</div>
        <div><b>Version:</b> ${d.version || '-'}</div>
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

  // lightning-createinvoice
  document.getElementById('btn-createinvoice').onclick = () => {
    const sats = Number(document.getElementById('invoice-amount').value)
    if (!sats) return alert('Enter a valid amount')
    send('lightning-createinvoice', { amount_msat: sats * 1000 }, (m) => {
      const bolt11 = m.data?.data?.bolt11 || '(not returned)'
      document.getElementById('invoice-result').innerHTML = `
        <b>BOLT11:</b> <code>${bolt11}</code>
      `
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // lightning-payinvoice
  document.getElementById('btn-payinvoice').onclick = () => {
    const bolt11 = document.getElementById('bolt11-input').value.trim()
    if (!bolt11) return alert('Enter a BOLT11 invoice')
    send('lightning-payinvoice', { bolt11 }, (m) => {
      const res = m.data?.data
      document.getElementById('pay-result').innerHTML = `
        <b>Status:</b> ${res?.status || '-'}<br>
        <b>Payment Hash:</b> ${res?.payment_hash || '-'}
      `
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // lightning-listinvoices
  document.getElementById('btn-listinvoices').onclick = () => {
    send('lightning-listinvoices', {}, (m) => {
      const list = m.data?.data?.invoices || []
      const html = list.length
        ? `<table><tr><th>ID</th><th>Amount</th><th>Status</th></tr>${list.map(i =>
            `<tr><td>${i.label || '-'}</td><td>${(i.amount_msat / 1000) || '-'}</td><td>${i.status}</td></tr>`
          ).join('')}</table>`
        : '<i>No invoices found</i>'
      document.getElementById('invoices-list').innerHTML = html
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // lightning-listpayments
  document.getElementById('btn-listpayments').onclick = () => {
    send('lightning-listpayments', {}, (m) => {
      const list = m.data?.data?.payments || []
      const html = list.length
        ? `<table><tr><th>ID</th><th>Amount</th><th>Status</th></tr>${list.map(p =>
            `<tr><td>${p.payment_hash || '-'}</td><td>${(p.amount_msat / 1000) || '-'}</td><td>${p.status}</td></tr>`
          ).join('')}</table>`
        : '<i>No payments found</i>'
      document.getElementById('payments-list').innerHTML = html
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // bitcoin-newaddress
  document.getElementById('btn-newaddress').onclick = () => {
    send('bitcoin-newaddress', {}, (m) => {
      const addr = m.data?.data?.address || '(not returned)'
      document.getElementById('btc-address').innerHTML = `<b>New Address:</b> ${addr}`
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // bitcoin-getbalance
  document.getElementById('btn-getbalance').onclick = () => {
    send('bitcoin-getbalance', {}, (m) => {
      const bal = m.data?.data?.balance_btc || '0 BTC'
      document.getElementById('btc-balance-value').innerHTML = `<b>Balance:</b> ${bal}`
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
}

connect()
*/