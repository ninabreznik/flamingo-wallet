// lib/web.js
const wsUrl = 'ws://localhost:8080'


document.body.innerHTML = `
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #f8f9fa;
      margin: 20px;
      color: #222;
    }
    h1 { color: #e83e8c; margin-bottom: 10px; }
    section { 
      background: #fff; 
      border-radius: 8px; 
      padding: 16px; 
      box-shadow: 0 0 4px rgba(0,0,0,0.1); 
    }
    h2 { margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 6px; color: #444; }
    h3 { margin-top: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 4px; }
    button { margin: 6px; padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fafafa; }
    button:hover { background: #f0f0f0; }
    input[type="text"], input[type="number"] { 
      padding: 6px; 
      border: 1px solid #ccc; 
      border-radius: 4px; 
      margin-right: 6px; 
      width: calc(100% - 140px); /* Adjust to fit label */
      box-sizing: border-box; /* Important for width calc */
    }
    pre { 
      background: #f4f4f4; 
      padding: 10px; 
      border-radius: 6px; 
      overflow-x: auto; 
      min-height: 150px;
      resize: vertical; /* Allow user to resize */
      margin-top: 20px;
    }
    #status { margin-bottom: 12px; font-weight: 500; }
    .node-selector, .input-group { margin: 10px 0 0 6px; }
    .input-group { margin-bottom: 10px; }
    .input-group label { font-weight: 500; margin-right: 6px; min-width: 120px; display: inline-block; }
    
    /* NEW GRID LAYOUT */
    .dashboard-grid {
      display: grid;
      /* Create responsive columns that are at least 400px wide */
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .grid-column {
      display: flex;
      flex-direction: column;
      gap: 20px; /* Space between sections in a column */
    }

    /* HISTORY STYLES */
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

  <div class="dashboard-grid">

    <div class="grid-column" id="col-btc">
      
      <section id="btc-balance">
        <h2>₿ Bitcoin (On-Chain)</h2>
        <button id="btn-getbalance">Refresh BTC Balance</button>
        <div id="btc-balance-value" style="margin-top: 10px;"><i>No balance yet</i></div>
      </section>

      <section id="btc-receive">
        <h2>📥 Receive BTC</h2>
        <button id="btn-newaddress">New Address</button>
        <div id="btc-address" style="margin-top: 10px;"><i>No address generated</i></div>
      </section>

      <section id="btc-send">
        <h2>💸 Send BTC</h2>
        <div class="input-group">
          <label for="send-btc-addr">Address:</label>
          <input type="text" id="send-btc-addr" placeholder="bcrt1q...">
        </div>
        <div class="input-group">
          <label for="send-btc-amount">Amount (BTC):</label>
          <input type="number" id="send-btc-amount" step="0.00000001" placeholder="0.01">
        </div>
        <div class="input-group">
          <label for="send-btc-fee">Fee (sats/vB):</label>
          <input type="number" id="send-btc-fee" value="10" step="1">
        </div>
        <button id="btn-send-btc">Send BTC</button>
        <div id="send-btc-content" style="margin-top: 10px;"><i></i></div>
      </section>

      <section id="btc-tx-history">
        <h2>📖 BTC History</h2>
        <button id="btn-list-btc">Refresh BTC Transactions</button>
        <div id="btc-history-content" class="history-container"><i>No data yet</i></div>
      </section>

    </div>

    <div class="grid-column" id="col-ln-pay">

      <section id="ln-receive">
        <h2>📥 Create LN Invoice (Receive)</h2>
        <div class="node-selector" id="ln-create-selector">
          <label>Node:</label>
          <label><input type="radio" name="node-create-inv" value="node4" checked> N4</label>
          <label><input type="radio" name="node-create-inv" value="node5"> N5</label>
          <label><input type="radio" name="node-create-inv" value="node6"> N6</label>
        </div>
        <div class="input-group">
          <label for="ln-create-msat">Amount (msat):</label>
          <input type="number" id="ln-create-msat" placeholder="50000">
        </div>
        <div class="input-group">
          <label for="ln-create-desc">Description:</label>
          <input type="text" id="ln-create-desc" placeholder="Coffee">
        </div>
        <button id="btn-create-ln-invoice">Create Invoice</button>
        <div id="create-ln-content" style="margin-top: 10px; word-break: break-all;">
          <i>Invoice will appear here...</i>
        </div>
      </section>

      <section id="ln-send">
        <h2>💸 Pay LN Invoice (Send)</h2>
        <div class="node-selector" id="ln-pay-selector">
          <label>Node:</label>
          <label><input type="radio" name="node-pay-inv" value="node4" checked> N4</label>
          <label><input type="radio" name="node-pay-inv" value="node5"> N5</label>
          <label><input type="radio" name="node-pay-inv" value="node6"> N6</label>
        </div>
        <div class="input-group">
          <label for="ln-pay-string" style="display: block; margin-bottom: 4px;">Invoice (bolt11):</label>
          <input type="text" id="ln-pay-string" placeholder="lnbcrt500u..." style="width: 100%;">
        </div>
        <button id="btn-pay-ln-invoice">Pay Invoice</button>
        <div id="pay-ln-content" style="margin-top: 10px;">
          <i>Payment status will appear here...</i>
        </div>
      </section>

    </div>

    <div class="grid-column" id="col-tools">

      <section id="node-info">
        <h2>ℹ️ Lightning Node Info</h2>
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
          <label><input type="radio" name="node-ln-balance" value="node5"> N5</label>
          <label><input type="radio" name="node-ln-balance" value="node6"> N6</label>
        </div>
        <button id="btn-listfunds">Refresh LN Balance</button>
        <div id="balance-content"><i>No data yet</i></div>
      </section>

      <section id="ln-tx-history">
        <h2>📖 LN Invoice History</h2>
         <div class="node-selector" id="ln-history-selector">
          <label><input type="radio" name="node-history" value="node4" checked> N4</label>
          <label><input type="radio" name="node-history" value="node5"> N5</label>
          <label><input type="radio" name="node-history" value="node6"> N6</label>
        </div>
        <button id="btn-list-ln">Refresh LN Invoices</button>
        <div id="ln-history-content" class="history-container"><i>No data yet</i></div>
      </section>

      <section id="channel-management">
        <h2>🔗 Channel Management</h2>
        <div class="node-selector" id="channel-selector">
          <label>Node:</label>
          <label><input type="radio" name="node-channel" value="node4" checked> N4</label>
          <label><input type="radio" name="node-channel" value="node5"> N5</label>
          <label><input type="radio" name="node-channel" value="node6"> N6</label>
        </div>
        
        <div class="input-group" style="background: #f0f0f0; padding: 10px; border-radius: 4px;">
          <label style="min-width: 100%; margin-bottom: 5px;">0. Fund a Node (On-Chain):</label>
          <button id="btn-ln-newaddr">Get New Address (for selected node)</button>
          <div id="ln-address-content" style="margin-top: 10px; font-weight: bold; word-break: break-all;"></div>
          <small>1. Get address. 2. Send BTC to it. 3. Mine blocks. 4. Then fund channel.</small>
        </div>
        <hr style="border:0; border-top: 1px solid #eee; margin: 15px 0;">

        <div class="input-group">
          <label for="peer-id">Peer ID@Host:Port</label>
          <input type="text" id="peer-id" placeholder="Click 'Refresh Info' on a node to fill this" style="width: 100%; transition: background 0.2s;">
        </div>
        <button id="btn-connect-peer">1. Connect Peer</button>
        
        <div class="input-group" style="margin-top: 15px;">
          <label for="fund-amount">Amount (sats):</label>
          <input type="number" id="fund-amount" placeholder="200000">
        </div>
        <button id="btn-fund-channel">2. Fund Channel</button>
        
        <hr style="border:0; border-top: 1px solid #eee; margin: 15px 0;">
        <button id="btn-list-peers">List Current Peers</button>
        <div id="channel-content" style="margin-top: 10px;"><i></i></div>
      </section>

      <section id="utilities">
        <h2>🛠️ Utilities</h2>
        <h3>Fee Estimator</h3>
        <div class="node-selector" id="fee-priority-selector">
          <label><input type="radio" name="fee-priority" value="high" checked> High (2 blocks)</label>
          <label><input type="radio" name="fee-priority" value="medium"> Medium (6 blocks)</label>
          <label><input type="radio" name="fee-priority" value="low"> Low (100 blocks)</label>
        </div>
        <button id="btn-estimate-fee">Estimate Fee</button>
        <div id="fee-content"><i>No data yet</i></div>

        <hr style="border:0; border-top: 1px solid #eee; margin: 15px 0;">

        <h3>BTC to USD Converter</h3>
        <div class="input-group">
          <label for="btc-amount">BTC:</label>
          <input type="number" id="btc-amount" value="1.0" step="0.01">
        </div>
        <button id="btn-convert-usd">Convert</button>
        <div id="usd-content"><i>No data yet</i></div>
      </section>

    </div>
  </div> 
  
  <section id="tx-lookup">
    <h2>🔎 Transaction Lookup / Validation</h2>
    <div class="input-group">
      <label for="tx-hash">TXID / P-Hash:</label>
      <input type="text" id="tx-hash" placeholder="Copy from history or send response..." style="width: 50%;">
    </div>
    <button id="btn-lookup-btc">Lookup BTC TX (Wallet)</button>
    <button id="btn-lookup-ln-invoice">Lookup LN Invoice (Received)</button>
    <button id="btn-lookup-ln-payment">Check LN Payment (Sent)</button>
    
    <div class="node-selector">
      <small>For LN, select node:</small>
      <label><input type="radio" name="node-tx-lookup" value="node4" checked> N4</label>
      <label><input type="radio" name="node-tx-lookup" value="node5"> N5</label>
      <label><input type="radio" name="node-tx-lookup" value="node6"> N6</label>
    </div>
    <div id="tx-content" style="margin-top: 10px;"><i>Lookup results will appear in the Raw Response below.</i></div>

    <hr style="border:0; border-top: 1px solid #eee; margin: 15px 0;">
    <h3>✅ Validate Payment (Receiving)</h3>
    <div class="input-group">
      <label for="validate-hash">TXID / P-Hash:</label>
      <input type="text" id="validate-hash" placeholder="Copy from sender..." style="width: 50%;">
    </div>
    <div class="input-group">
      <label for="validate-amount">Expected Amount:</label>
      <input type="number" id="validate-amount" placeholder="e.g., 0.01 (BTC) or 10000 (msat)">
    </div>
    <button id="btn-validate-btc">Validate BTC</button>
    <button id="btn-validate-ln">Validate LN</button>
    <div id="validate-content" style="margin-top: 10px;"><i>Validation status will appear here.</i></div>
  </section>

  <section id="dev-tools">
    <h2>🧑‍💻 Dev / Test Tools</h2>
    <div class="input-group">
      <label for="num-blocks">Blocks to Mine:</label>
      <input type="number" id="num-blocks" value="1" step="1" style="width: 80px;">
      <button id="btn-mine-blocks">Mine Blocks</button>
    </div>
    <div id="mine-blocks-content" style="margin-top: 10px;"><i>Click to mine 'regtest' blocks.</i></div>
  </section>

  <h3>Raw Backend Response</h3>
  <pre id="raw"></pre>
`;

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

function copyToClipboard (text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = el.textContent
    el.textContent = 'Copied!'
    setTimeout(() => { el.textContent = originalText }, 1000)
  }).catch(err => {
    console.error('Failed to copy: ', err)
  })
}

function populateHistoryList(containerId, items, idField, descField) {
  const container = document.getElementById(containerId)
  container.innerHTML = ''
  
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
      
      if (d.id && d.binding && d.binding.length > 0) {
        const addr = d.binding.find(b => b.type === 'ipv4') || d.binding.find(b => b.type === 'ipv6');
        if (addr) {
          const connectString = `${d.id}@${addr.address}:${addr.port}`;
          const peerIdEl = document.getElementById('peer-id');
          peerIdEl.value = connectString;
          
          peerIdEl.style.background = '#e6ffed';
          setTimeout(() => { peerIdEl.style.background = ''; }, 1000);
        }
      }
      
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
  
  // --- Button 7: List BTC Transactions ---
  document.getElementById('btn-list-btc').onclick = () => {
    document.getElementById('btc-history-content').innerHTML = '<i>Loading...</i>'
    send('list_btc_transactions', {}, (m) => {
      const items = m.data?.data || []
      const processed = items.map(tx => ({
        id: tx.txid,
        desc: `${tx.category} ${tx.amount} BTC`
      }))
      populateHistoryList('btc-history-content', processed, 'id', 'desc')
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
  
  // --- Button 8: List LN Invoices ---
  document.getElementById('btn-list-ln').onclick = () => {
    const userId = document.querySelector('input[name="node-history"]:checked').value
    document.getElementById('ln-history-content').innerHTML = '<i>Loading...</i>'
    send('list_ln_invoices', { userId }, (m) => {
      const items = m.data?.data || []
      const processed = items.map(inv => ({
        id: inv.payment_hash,
        desc: `${inv.status} ${inv.amount_msat} msat`
      }))
      populateHistoryList('ln-history-content', processed, 'id', 'desc')
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }

  // --- Button (NEW): Create LN Invoice ---
  document.getElementById('btn-create-ln-invoice').onclick = () => {
    const data = {
      userId: document.querySelector('input[name="node-create-inv"]:checked').value,
      amount_msat: parseInt(document.getElementById('ln-create-msat').value, 10),
      description: document.getElementById('ln-create-desc').value
    };
    const contentEl = document.getElementById('create-ln-content');
    const payInputEl = document.getElementById('ln-pay-string');
    const validateHashInputEl = document.getElementById('validate-hash');

    if (!data.amount_msat || !data.description) {
      contentEl.innerHTML = `❌ <b>Error:</b> Amount and Description are required.`;
      return;
    }

    contentEl.textContent = 'Creating invoice...';
    send('create_ln_invoice', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        const bolt11 = d.data.bolt11;
        const payment_hash = d.data.payment_hash;
        
        contentEl.innerHTML = `
          <div><b>P-Hash:</b> <span id="new-p-hash" style="cursor: pointer; color: #0056b3;" title="Click to copy and fill validate box">${payment_hash.substring(0, 40)}...</span></div>
          <div><b>Invoice:</b> <span id="new-invoice-string" style="cursor: pointer; color: #0056b3;" title="Click to copy and fill pay box">${bolt11.substring(0, 60)}...</span></div>
        `;
        
        document.getElementById('new-p-hash').onclick = (e) => {
          validateHashInputEl.value = payment_hash;
          copyToClipboard(payment_hash, e.target);
        };
        
        document.getElementById('new-invoice-string').onclick = (e) => {
          payInputEl.value = bolt11;
          copyToClipboard(bolt11, e.target);
        };
        
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };
  
  // --- Button (NEW): Pay LN Invoice ---
  document.getElementById('btn-pay-ln-invoice').onclick = () => {
    const data = {
      userId: document.querySelector('input[name="node-pay-inv"]:checked').value,
      invoice_string: document.getElementById('ln-pay-string').value
    };
    const contentEl = document.getElementById('pay-ln-content');
    const lookupHashInputEl = document.getElementById('tx-hash');

    if (!data.invoice_string) {
      contentEl.innerHTML = `❌ <b>Error:</b> Invoice string is required.`;
      return;
    }

    contentEl.textContent = 'Sending payment...';
    send('pay_ln_invoice', data, (m) => {
      const d = m.data;
      if (d.status === 'pending' || d.status === 'success') { 
        const payment_hash = d.data.payment_hash;
        contentEl.innerHTML = `⌛ <b>Payment sending...</b> P-Hash: ${payment_hash.substring(0, 40)}...`;
        lookupHashInputEl.value = payment_hash; 
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };

  // --- Button (NEW): Get LN New Address ---
  document.getElementById('btn-ln-newaddr').onclick = () => {
    const data = {
      userId: document.querySelector('input[name="node-channel"]:checked').value
    };
    const contentEl = document.getElementById('ln-address-content');
    contentEl.textContent = 'Getting address...';
    
    send('lightning_newaddress', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.textContent = d.data;
        document.getElementById('send-btc-addr').value = d.data;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };

  // --- Button (NEW): List Peers ---
  document.getElementById('btn-list-peers').onclick = () => {
    const data = {
      userId: document.querySelector('input[name="node-channel"]:checked').value
    };
    const contentEl = document.getElementById('channel-content');
    contentEl.textContent = 'Listing peers...';
    
    send('list_peers', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.textContent = `Found ${d.data.length} peers. See raw response for details.`;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };

  // --- Button (NEW): Connect Peer ---
  document.getElementById('btn-connect-peer').onclick = () => {
    const data = {
      userId: document.querySelector('input[name="node-channel"]:checked').value,
      peer_address: document.getElementById('peer-id').value
    };
    const contentEl = document.getElementById('channel-content');

    if (!data.peer_address) {
       contentEl.innerHTML = `❌ <b>Error:</b> Peer ID@Host:Port is required.`;
       return;
    }
    contentEl.textContent = 'Connecting...';
    
    send('connect_node', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.innerHTML = `✅ <b>Connected!</b> Peer ID: ${d.data.id}`;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };

  // --- Button (NEW): Fund Channel ---
  document.getElementById('btn-fund-channel').onclick = () => {
    const fullPeerString = document.getElementById('peer-id').value;
    const peer_id_only = fullPeerString.split('@')[0];
    const contentEl = document.getElementById('channel-content');
    
    if (!peer_id_only || fullPeerString.indexOf('@') === -1) {
         contentEl.innerHTML = `❌ <b>Error:</b> Full Peer ID@Host:Port string is required in the box.`;
         return;
    }

    const data = {
      userId: document.querySelector('input[name="node-channel"]:checked').value,
      peer_id: peer_id_only,
      amount_sats: parseInt(document.getElementById('fund-amount').value, 10)
    };

    if (!data.peer_id || !data.amount_sats) {
       contentEl.innerHTML = `❌ <b>Error:</b> Peer ID and Amount are required.`;
       return;
    }
    contentEl.textContent = 'Funding channel...';
    
    send('fund_channel', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.innerHTML = `✅ <b>Channel funding initiated!</b> TXID: ${d.data.txid}`;
        document.getElementById('tx-hash').value = d.data.txid;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };

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
  
  // --- Button 10: Lookup LN Invoice (Received) ---
  document.getElementById('btn-lookup-ln-invoice').onclick = () => {
    const payment_hash = document.getElementById('tx-hash').value
    if (!payment_hash) {
      document.getElementById('tx-content').textContent = 'Error: Payment hash is required.'
      return
    }
    const userId = document.querySelector('input[name="node-tx-lookup"]:checked').value
    document.getElementById('tx-content').textContent = 'Looking up LN Invoice...'
    send('get_tx_details_from_lnnode', { userId, payment_hash }, (m) => {
      document.getElementById('tx-content').textContent = 'Lookup complete. See raw response.'
      rawEl.textContent = JSON.stringify(m, null, 2)
    })
  }
  
  // --- Button 11: Check LN Payment (Sent) ---
  document.getElementById('btn-lookup-ln-payment').onclick = () => {
    const payment_hash = document.getElementById('tx-hash').value
    if (!payment_hash) {
      document.getElementById('tx-content').textContent = 'Error: Payment hash is required.'
      return;
    }
    const userId = document.querySelector('input[name="node-tx-lookup"]:checked').value;
    document.getElementById('tx-content').textContent = 'Checking outgoing payment...';
    send('get_ln_payment_status', { userId, payment_hash }, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        document.getElementById('tx-content').textContent = '✅ Payment complete.';
      } else if (d.status === 'pending') {
        document.getElementById('tx-content').textContent = `⌛ Payment is ${d.data.status}.`;
      } else {
        document.getElementById('tx-content').textContent = `❌ Payment failed or not found.`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  }

  // --- Button 12: Send BTC ---
  document.getElementById('btn-send-btc').onclick = () => {
    const data = {
      recipient_address: document.getElementById('send-btc-addr').value,
      amount_btc: parseFloat(document.getElementById('send-btc-amount').value),
      fee_rate_sats_per_vb: parseInt(document.getElementById('send-btc-fee').value, 10)
    };
    const contentEl = document.getElementById('send-btc-content');
    
    if (!data.recipient_address || !data.amount_btc || !data.fee_rate_sats_per_vb) {
      contentEl.innerHTML = `❌ <b>Error:</b> Please fill in all fields.`;
      return;
    }

    contentEl.textContent = 'Sending...';
    send('send_btc_onchain', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.innerHTML = `✅ <b>Success!</b> TXID: ${d.data.tx_id}`;
        document.getElementById('tx-hash').value = d.data.tx_id;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };


  // --- Button 14: Validate BTC ---
  document.getElementById('btn-validate-btc').onclick = () => {
    const data = {
      tx_id: document.getElementById('validate-hash').value,
      amount: parseFloat(document.getElementById('validate-amount').value) || null
    };
    const contentEl = document.getElementById('validate-content');
    
    if (!data.tx_id) {
       contentEl.innerHTML = `❌ <b>Error:</b> TXID is required.`;
       return;
    }

    contentEl.textContent = 'Validating...';
    send('validate_btc_payment', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.innerHTML = `✅ <b>Validated:</b> Received ${d.data.receivedAmount} BTC with ${d.data.confirmations} confirmations.`;
      } else if (d.status === 'pending') {
        contentEl.innerHTML = `⌛ <b>Pending:</b> ${d.data.confirmations} confirmations.`;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };
  
  // --- Button 15: Validate LN ---
  document.getElementById('btn-validate-ln').onclick = () => {
    const data = {
      payment_hash: document.getElementById('validate-hash').value,
      amount_msat: parseInt(document.getElementById('validate-amount').value, 10) || null,
      userId: document.querySelector('input[name="node-tx-lookup"]:checked').value
    };
    const contentEl = document.getElementById('validate-content');

    if (!data.payment_hash) {
       contentEl.innerHTML = `❌ <b>Error:</b> Payment Hash is required.`;
       return;
    }

    contentEl.textContent = 'Validating...';
    send('validate_ln_payment', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.innerHTML = `✅ <b>Validated:</b> Invoice is 'paid'.`;
      } else if (d.status === 'pending') {
        contentEl.innerHTML = `⌛ <b>Pending:</b> Invoice status is '${d.data.status}'.`;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error} (on ${data.userId})`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };
  
  // --- Button 16: Mine Blocks ---
  document.getElementById('btn-mine-blocks').onclick = () => {
    const num_blocks = parseInt(document.getElementById('num-blocks').value, 10) || 1;
    const contentEl = document.getElementById('mine-blocks-content');
    
    contentEl.textContent = `Mining ${num_blocks} block(s)...`;
    send('btc_mine_blocks_regtest', { num_blocks }, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.innerHTML = `✅ <b>Success!</b> Mined ${d.data.blocks_mined} block(s).`;
        if (d.data.blocks_mined === 1) {
          contentEl.innerHTML += ` Hash: ${d.data.block_hashes[0]}`;
        }
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };
}

connect()