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
    input[type="text"], input[type="number"] { padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-right: 6px; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 6px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
    #status { margin-bottom: 12px; font-weight: 500; }
    .node-selector, .input-group { margin: 10px 0 0 6px; }
    .input-group label { font-weight: 500; margin-right: 6px;}

    /* NEW STYLES FOR HISTORY */
    .history-item {
      font-family: monospace;
      font-size: 0.9em;
      padding: 4px 6px;
      margin-bottom: 5px;
      border-radius: 4px;
      background: #f0f0f0;
      word-break: break-all;
    }
    .history-item-id {
      font-weight: bold;
      color: #0056b3;
      cursor: pointer;
    }
    .history-item-id:hover { text-decoration: underline; }
    .history-container {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #eee;
      padding: 8px;
      margin-top: 10px;
    }
  </style>

  <h1>⚡ Flamingo Wallet Dashboard</h1>
  <div id="status">Connecting...</div>

  <section id="node-info">
    <h2>Node Info</h2>
    <div class="node-selector" id="getinfo-selector">
      <label><input type="radio" name="node-getinfo" value="node4" checked> Node 4</label>
      <label><input type="radio" name="node-getinfo" value="node5"> Node 5</label>
      <label><input type="radio" name="node-getinfo" value="node6"> Node 6</label>
    </div>
    <button id="btn-getinfo">Refresh Info</button>
    <div id="info-content"><i>No data yet</i></div>
  </section>

  <section id="wallet-balance">
    <h2>⚡ Lightning Wallet Balance</h2>
    <div class="node-selector" id="listfunds-selector">
      <label><input type="radio" name="node-ln-balance" value="node4" checked> Node 4</label>
      <label><input type="radio" name="node-ln-balance" value="node5"> Node 5</label>
      <label><input type="radio" name="node-ln-balance" value="node6"> Node 6</label>
    </div>
    <button id="btn-listfunds">Refresh LN Balance</button>
    <div id="balance-content"><i>No data yet</i></div>
  </section>

  <section id="btc-balance">
    <h2>₿ Bitcoin (On-Chain) Wallet Balance</h2>
    <button id="btn-getbalance">Refresh BTC Balance</button>
    <div id="btc-balance-value"><i>No balance yet</i></div>
  </section>

  <section id="btc-receive">
    <h2>Receive Bitcoin (On-chain)</h2>
    <button id="btn-newaddress">New Address</button>
    <div id="btc-address"><i>No address generated</i></div>
  </section>

  <section id="fee-estimator">
    <h2>Fee Estimator</h2>
    <div class="node-selector" id="fee-priority-selector">
      <label><input type="radio" name="fee-priority" value="high" checked> High (2 blocks)</label>
      <label><input type="radio" name="fee-priority" value="medium"> Medium (6 blocks)</label>
      <label><input type="radio" name="fee-priority" value="low"> Low (100 blocks)</label>
    </div>
    <button id="btn-estimate-fee">Estimate Fee</button>
    <div id="fee-content"><i>No data yet</i></div>
  </section>

  <section id="usd-converter">
    <h2>BTC to USD Converter</h2>
    <div class="input-group">
      <label for="btc-amount">BTC:</label>
      <input type="number" id="btc-amount" value="1.0" step="0.01">
      <button id="btn-convert-usd">Convert</button>
    </div>
    <div id="usd-content"><i>No data yet</i></div>
  </section>
  
  <section id="tx-history">
    <h2>History</h2>
    <button id="btn-list-btc">Refresh BTC Transactions</button>
    <button id="btn-list-ln">Refresh LN Invoices</button>
    <div class="node-selector">
      <small>For LN, select node:</small>
      <label><input type="radio" name="node-history" value="node4" checked> N4</label>
      <label><input type="radio" name="node-history" value="node5"> N5</label>
      <label><input type="radio" name="node-history" value="node6"> N6</label>
    </div>
    
    <h3>BTC History (click ID to copy)</h3>
    <div id="btc-history-content" class="history-container"><i>No data yet</i></div>
    
    <h3>LN Invoice History (click ID to copy)</h3>
    <div id="ln-history-content" class="history-container"><i>No data yet</i></div>
  </section>

  <section id="tx-lookup">
    <h2>Transaction Lookup</h2>
    <div class="input-group">
      <label for="tx-hash">TXID / Payment Hash:</label>
      <input type="text" id="tx-hash" placeholder="Copy from history above...">
    </div>
    <button id="btn-lookup-btc">Lookup BTC-TX</button>
    <button id="btn-lookup-ln">Lookup LN-TX</button>
    <div class="node-selector">
      <small>For LN-TX, select node:</small>
      <label><input type="radio" name="node-tx-lookup" value="node4" checked> N4</label>
      <label><input type="radio" name="node-tx-lookup" value="node5"> N5</label>
      <label><input type="radio" name="node-tx-lookup" value="node6"> N6</label>
    </div>
    <div id="tx-content"><i>Lookup results will appear in the Raw Response below.</i></div>
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

// NEW Helper function to copy text to clipboard
function copyToClipboard (text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = el.textContent
    el.textContent = 'Copied!'
    setTimeout(() => { el.textContent = originalText }, 1000)
  }).catch(err => {
    console.error('Failed to copy: ', err)
  })
}

// NEW Helper function to populate the history lists
function populateHistoryList(containerId, items, idField, descField) {
  const container = document.getElementById(containerId)
  container.innerHTML = '' // Clear old content
  
  if (!items || items.length === 0) {
    container.innerHTML = '<i>No history found.</i>'
    return
  }
  
  const lookupInput = document.getElementById('tx-hash')
  
  items.forEach(item => {
    const id = item[idField]
    const desc = item[descField]
    const itemEl = document.createElement('div')
    itemEl.className = 'history-item'
    
    const idEl = document.createElement('span')
    idEl.className = 'history-item-id'
    idEl.textContent = `${id.substring(0, 20)}...`
    
    // Click to copy the ID AND paste it into the lookup box
    idEl.onclick = () => {
      lookupInput.value = id
      copyToClipboard(id, idEl)
    }
    
    itemEl.appendChild(idEl)
    itemEl.append(` - ${desc}`)
    container.appendChild(itemEl)
  })
}


function setupButtons () {
  const rawEl = document.getElementById('raw')

  // --- Button 1: Get Info ---
  document.getElementById('btn-getinfo').onclick = () => {
    const nodeId = document.querySelector('input[name="node-getinfo"]:checked').value
    send('lightning-getinfo', { nodeId }, (m) => {
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

  // --- Button 2: Get LN Balance ---
  document.getElementById('btn-listfunds').onclick = () => {
    const userId = document.querySelector('input[name="node-ln-balance"]:checked').value
    send('get_ln_balance', { userId }, (m) => {
      const d = m.data?.data
      document.getElementById('balance-content').innerHTML = `
        <div><b>Balance (BTC):</b> ${d?.btc || '0'} BTC</div>
        <div><b>Balance (Sats):</b> ${d?.sats?.toLocaleString() || 0} sats</div>
      `
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
  
  // --- Button 3: Get BTC Balance ---
  document.getElementById('btn-getbalance').onclick = () => {
    send('get_btc_balance', {}, (m) => {
      const bal = m.data?.data?.btc
      document.getElementById('btc-balance-value').innerHTML = `<b>Balance:</b> ${bal} BTC`
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // --- Button 4: New Address ---
  document.getElementById('btn-newaddress').onclick = () => {
    send('bitcoin-newaddress', {}, (m) => {
      const addr = m.data?.data || '(not returned)'
      document.getElementById('btc-address').innerHTML = `<b>New Address:</b> ${addr}`
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // --- Button 5: Estimate Fee ---
  document.getElementById('btn-estimate-fee').onclick = () => {
    const priority = document.querySelector('input[name="fee-priority"]:checked').value
    send('estimate_btc_fee', { priority }, (m) => {
      const d = m.data?.data
      document.getElementById('fee-content').innerHTML = `
        <div><b>Feerate:</b> ${d?.feerate_btc_per_kb || 'N/A'} BTC/kB</div>
        <div><b>Target Blocks:</b> ${d?.blocks || 'N/A'}</div>
      `
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // --- Button 6: Convert USD ---
  document.getElementById('btn-convert-usd').onclick = () => {
    const amount = document.getElementById('btc-amount').value
    send('convert_btc_to_usd', { amount_btc: parseFloat(amount) }, (m) => {
      const d = m.data?.data
      document.getElementById('usd-content').innerHTML = `
        <div><b>${d?.btc_amount || 0} BTC</b> is worth <b>$${d?.usd_value?.toFixed(2) || '0.00'} USD</b></div>
        <div><small>Current Rate: $${d?.rate_per_btc?.toLocaleString()}/BTC</small></div>
      `
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
  
  // --- Button 7: List BTC Transactions (NEW) ---
  document.getElementById('btn-list-btc').onclick = () => {
    document.getElementById('btc-history-content').innerHTML = '<i>Loading...</i>'
    send('list_btc_transactions', {}, (m) => {
      const items = m.data?.data || []
      // We process the data to fit our helper function
      const processed = items.map(tx => ({
        id: tx.txid,
        desc: `${tx.category} ${tx.amount} BTC`
      }))
      populateHistoryList('btc-history-content', processed, 'id', 'desc')
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
  
  // --- Button 8: List LN Invoices (NEW) ---
  document.getElementById('btn-list-ln').onclick = () => {
    const userId = document.querySelector('input[name="node-history"]:checked').value
    document.getElementById('ln-history-content').innerHTML = '<i>Loading...</i>'
    send('list_ln_invoices', { userId }, (m) => {
      const items = m.data?.data || []
      // We process the data to fit our helper function
      const processed = items.map(inv => ({
        id: inv.payment_hash,
        desc: `${inv.status} ${inv.amount_msat} msat`
      }))
      populateHistoryList('ln-history-content', processed, 'id', 'desc')
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // --- Button 9: Lookup BTC TX ---
  document.getElementById('btn-lookup-btc').onclick = () => {
    const tx_id = document.getElementById('tx-hash').value
    if (!tx_id) {
      document.getElementById('tx-content').textContent = 'Error: TXID is required.'
      return
    }
    document.getElementById('tx-content').textContent = 'Looking up BTC TX...'
    send('get_tx_details_from_btcnode', { tx_id }, (m) => {
      document.getElementById('tx-content').textContent = 'Lookup complete. See raw response.'
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
  
  // --- Button 10: Lookup LN TX ---
  document.getElementById('btn-lookup-ln').onclick = () => {
    const payment_hash = document.getElementById('tx-hash').value
    if (!payment_hash) {
      document.getElementById('tx-content').textContent = 'Error: Payment hash is required.'
      return
    }
    const userId = document.querySelector('input[name="node-tx-lookup"]:checked').value
    document.getElementById('tx-content').textContent = 'Looking up LN TX...'
    send('get_tx_details_from_lnnode', { userId, payment_hash }, (m) => {
      document.getElementById('tx-content').textContent = 'Lookup complete. See raw response.'
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
}

connect()