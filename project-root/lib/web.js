// lib/web.js
const wsUrl = 'ws://localhost:8080'

// --- GLOBAL HELPERS (Defined Top-Level) ---

function copyToClipboard(text, el) {
  // Check if API exists to prevent crash
  if (!navigator.clipboard) {
    console.warn('Clipboard API not available in this context');
    // Fallback or just return so the rest of the app works
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    if (el) {
      const originalText = el.innerHTML // Use innerHTML to preserve tags if any
      const originalWidth = el.offsetWidth // Prevent jumping
      
      el.style.width = `${originalWidth}px`
      el.style.textAlign = 'center'
      el.textContent = 'Copied!'
      
      setTimeout(() => { 
        el.innerHTML = originalText 
        el.style.width = ''
        el.style.textAlign = ''
      }, 1000)
    }
  }).catch(err => {
    console.error('Failed to copy: ', err)
  })
}

// Global handler for history clicks
window.handleHistoryClick = function(el, id, type) {
  // 1. Copy to Clipboard (Fail safely if API missing)
  // If clicked from table (el exists), show "Copied!". If from daily log row, pass null.
  const isTableClick = el && el.tagName === 'SPAN'; 
  copyToClipboard(id, isTableClick ? el : null);

  // 2. Fill Inputs
  // We populate 'lookup-id' because both Lookup and Validate buttons read from it.
  const lookupInput = document.getElementById('lookup-id');
  if(lookupInput) lookupInput.value = id;

  // 3. Scroll to Lookup Section
  const lookupContainer = document.getElementById('lookup-container');
  if(lookupContainer) lookupContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // 4. Auto-Trigger Lookup
  // Use a small timeout to allow the DOM value to settle
  setTimeout(() => {
    if (type === 'BTC') {
       const btn = document.getElementById('btn-lookup-btc');
       if(btn) btn.click();
    } else {
       const btn = document.getElementById('btn-lookup-ln');
       if(btn) btn.click();
    }
  }, 100);
};

document.body.innerHTML = `
  <style>
    /* --- GENERAL LAYOUT --- */
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f4f6f8;
      margin: 0;
      padding: 20px;
      color: #333;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }
    h1 { color: #e83e8c; margin-bottom: 5px; }
    h2 { margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 8px; color: #444; font-size: 1.1em; }
    h3 { margin-top: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 4px; font-size: 1em; color: #666; }
    #status { margin-bottom: 15px; font-weight: 500; font-size: 0.9em; }
    
    /* --- TABS NAVIGATION --- */
    .tab-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 20px;
      border-bottom: 2px solid #ddd;
      padding-bottom: 10px;
    }
    .tab-btn {
      background: #e9ecef;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      color: #555;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: #dee2e6; color: #000; }
    .tab-btn.active {
      background: #e83e8c;
      color: white;
      box-shadow: 0 2px 4px rgba(232, 62, 140, 0.3);
    }
    .tab-content { display: none; animation: fadeIn 0.3s; }
    .tab-content.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

    /* --- COMMON UI ELEMENTS --- */
    section, .card { 
      background: #fff; 
      border-radius: 8px; 
      padding: 16px; 
      box-shadow: 0 2px 5px rgba(0,0,0,0.05); 
      margin-bottom: 20px;
      border: 1px solid #e1e4e8;
    }
    
    button { margin: 2px; padding: 8px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fafafa; font-weight: 500; }
    button:hover { background: #f0f0f0; }
    button.primary { background: #007bff; color: white; border: none; }
    button.primary:hover { background: #0056b3; }

    input[type="text"], input[type="number"], input[type="date"] { 
      padding: 8px; 
      border: 1px solid #ccc; 
      border-radius: 4px; 
      margin-right: 6px; 
      width: 100%;
      box-sizing: border-box; 
    }
    
    .input-group { margin-bottom: 12px; }
    .input-group label { font-weight: 500; margin-bottom: 4px; display: block; font-size: 0.85em; color: #555; }
    .node-selector, .radio-group { margin: 10px 0; padding: 8px; background: #f1f3f5; border-radius: 4px; display: inline-block; width: 100%; box-sizing: border-box; }
    
    /* --- HISTORY TAB SPECIFIC STYLES --- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-box {
      background: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border: 1px solid #eee;
    }
    .stat-val { font-size: 1.5em; font-weight: 800; display: block; margin-bottom: 5px; }
    .stat-label { font-size: 0.8em; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .grid-3 { grid-template-columns: 1fr; } }

    .tx-table { width: 100%; border-collapse: collapse; font-size: 0.9em; table-layout: fixed; }
    .tx-table th { background: #f8f9fa; text-align: left; padding: 10px; border-bottom: 2px solid #dee2e6; color: #495057; }
    .tx-table td { padding: 10px; border-bottom: 1px solid #dee2e6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tx-table tr:last-child td { border-bottom: none; }
    .tx-table tr:hover { background-color: #f8f9fa; }
    
    /* Column Widths */
    .col-type { width: 60px; }
    .col-date { width: 160px; }
    .col-note { width: 150px; }
    .col-dir { width: 50px; }
    .col-amt { width: 100px; }
    .col-stat { width: 80px; }
    .col-id { width: 120px; }

    .tx-type-tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
    .tag-btc { background: #fff3cd; color: #856404; }
    .tag-ln { background: #d1ecf1; color: #0c5460; }
    .amt-in { color: #28a745; font-weight: bold; }
    .amt-out { color: #dc3545; font-weight: bold; }

    .clickable-id { 
      font-family: monospace; 
      font-size: 0.9em; 
      cursor: pointer; 
      color: #007bff; 
      text-decoration: underline; 
      display: inline-block;
      min-width: 60px;
    }
    .clickable-id:hover { color: #0056b3; background: #e2e6ea; }

    .lookup-result-box { margin-top: 10px; padding: 10px; background: #e9ecef; border-radius: 4px; border-left: 4px solid #6f42c1; font-size: 0.9em; }

    .raw-log { background: #1e1e1e; color: #d4d4d4; padding: 10px; border-radius: 6px; overflow-x: auto; max-height: 200px; font-size: 0.8em; margin-top: 5px; }
    .raw-label { font-size: 0.8em; font-weight: bold; color: #666; margin-top: 10px; display: block; }

    /* --- OTHER STYLES --- */
    .hub-box { border: 1px solid #e83e8c; background: #fff0f6; padding: 12px; border-radius: 6px; margin-bottom: 15px; }
    .hub-status { margin-top: 5px; font-size: 0.9em; font-weight: bold; min-height: 1.2em; }
    .two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .liq-container { margin-top: 10px; background: #eee; height: 24px; border-radius: 12px; overflow: hidden; display: flex; border: 1px solid #ddd; }
    .liq-out { background: #28a745; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75em; }
    .liq-in { background: #17a2b8; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75em; }
    .history-container { max-height: 200px; overflow-y: auto; border: 1px solid #eee; padding: 8px; margin-top: 10px; background: #fafafa; }
    .history-item { font-family: monospace; font-size: 0.85em; padding: 4px; border-bottom: 1px solid #eee; }
    
    .health-tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 5px; font-weight: bold; }
    .health-ok { background: #d4edda; color: #155724; }
    .health-warn { background: #fff3cd; color: #856404; }
    .health-bad { background: #f8d7da; color: #721c24; }
  </style>

  <div style="display:flex; justify-content:space-between; align-items:center;">
    <h1>⚡ Flamingo Wallet Dashboard</h1>
    <div id="status">Connecting...</div>
  </div>

  <div class="tab-nav">
    <button class="tab-btn active" onclick="openTab('tab-overview')">📊 Overview</button>
    <button class="tab-btn" onclick="openTab('tab-history')">📜 History</button>
    <button class="tab-btn" onclick="openTab('tab-bitcoin')">₿ Bitcoin</button>
    <button class="tab-btn" onclick="openTab('tab-lightning')">⚡ Lightning</button>
    <button class="tab-btn" onclick="openTab('tab-channels')">🔗 Channels</button>
    <button class="tab-btn" onclick="openTab('tab-hub')">🦩 Flamingo Hub</button>
    <button class="tab-btn" onclick="openTab('tab-tools')">🛠️ Utilities</button>
  </div>

  <div id="tab-overview" class="tab-content active">
    <div class="two-col-grid">
      <div>
        <section id="node-info">
          <h2>ℹ️ Node Information</h2>
          <div class="node-selector">
            <label><input type="radio" name="node-getinfo" value="node4" checked> Node 4</label>
            <label><input type="radio" name="node-getinfo" value="node5"> Node 5</label>
            <label><input type="radio" name="node-getinfo" value="node6"> Node 6</label>
          </div>
          <button id="btn-getinfo" style="width:100%">Refresh Info</button>
          <div id="info-content" style="margin-top:10px; padding:10px; background:#f9f9f9; border-radius:4px;"><i>No data yet</i></div>
        </section>
      </div>
      <div>
        <section id="wallet-balance">
          <h2>💰 Balances</h2>
          <div class="node-selector">
            <small>Lightning Node:</small>
            <label><input type="radio" name="node-ln-balance" value="node4" checked> N4</label>
            <label><input type="radio" name="node-ln-balance" value="node5"> N5</label>
            <label><input type="radio" name="node-ln-balance" value="node6"> N6</label>
          </div>
          <button id="btn-listfunds" style="width:100%">Check LN Funds</button>
          <div id="balance-content" style="margin:10px 0; font-size:0.9em;"></div>
          <hr>
          <div style="margin-top:10px;">
             <button id="btn-getbalance" style="width:100%">Check On-Chain (BTC) Balance</button>
             <div id="btc-balance-value" style="margin-top: 5px; text-align:center;"></div>
          </div>
        </section>
      </div>
    </div>
    <span class="raw-label">Raw Output (Overview)</span>
    <pre id="raw-overview" class="raw-log"></pre>
  </div>

  <div id="tab-history" class="tab-content">
    
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <div class="radio-group" style="margin:0; max-width: 400px;">
            <label style="font-weight:bold; margin-right:10px;">History For:</label>
            <label><input type="radio" name="hist-user" value="node4" checked> Node 4</label>
            <label><input type="radio" name="hist-user" value="node5"> Node 5</label>
            <label><input type="radio" name="hist-user" value="node6"> Node 6</label>
        </div>
        <button id="btn-refresh-all-hist" class="primary">🔄 Refresh All Data</button>
    </div>

    <div class="stats-grid">
        <div class="stat-box">
            <span class="stat-val val-neut" id="sum-net" style="color:#007bff">0</span>
            <span class="stat-label">Net (Sats)</span>
        </div>
        <div class="stat-box">
            <span class="stat-val" id="sum-in" style="color:#28a745">0</span>
            <span class="stat-label">Total In</span>
        </div>
        <div class="stat-box">
            <span class="stat-val" id="sum-out" style="color:#dc3545">0</span>
            <span class="stat-label">Total Out</span>
        </div>
        <div class="stat-box">
            <span class="stat-val" style="color:#ffc107" id="sum-fees">0</span>
            <span class="stat-label">Fees Paid</span>
        </div>
    </div>

    <div class="grid-3" style="margin-bottom: 20px;">
        <div class="card">
            <h2>📅 Daily Logs</h2>
            <div class="input-group">
                <div style="display:flex; gap:5px;">
                    <input type="date" id="daily-date">
                    <button id="btn-get-daily">Search</button>
                </div>
            </div>
            <div id="daily-res" style="font-size:0.9rem; max-height:200px; overflow-y:auto; border:1px solid #eee; padding:5px;">
                <i>Select a date to view. Click any row to verify.</i>
            </div>
        </div>

        <div class="card" id="lookup-container">
            <h2>🔎 Lookup & Verify</h2>
            <div class="input-group">
                <label>TXID / Payment Hash:</label>
                <input type="text" id="lookup-id" placeholder="Paste ID here or click history...">
            </div>
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                 <button id="btn-lookup-btc" style="flex:1">Lookup BTC</button>
                 <button id="btn-lookup-ln" style="flex:1">Lookup LN</button>
            </div>
            <hr>
            <div class="input-group">
                <label>Validate Payment (Receiver Side)</label>
                <input type="number" id="validate-amt" placeholder="Expected Amt" style="margin-bottom:5px;">
                <div style="display:flex; gap:5px;">
                    <button id="btn-validate-btc" style="flex:1; background:#d4edda;">Check BTC</button>
                    <button id="btn-validate-ln" style="flex:1; background:#d4edda;">Check LN</button>
                </div>
            </div>
            <div id="res-lookup" class="lookup-result-box" style="display:none;"></div>
        </div>
    </div>

    <div class="card">
        <h2>📜 Combined Transaction History</h2>
        <div style="overflow-x:auto;">
            <table class="tx-table">
                <thead>
                    <tr>
                        <th class="col-type">Type</th>
                        <th class="col-date">Date</th>
                        <th class="col-note">Note</th>
                        <th class="col-dir">Dir</th>
                        <th class="col-amt">Amount</th>
                        <th class="col-stat">Status</th>
                        <th class="col-id">ID (Click)</th>
                    </tr>
                </thead>
                <tbody id="full-history-body">
                    <tr><td colspan="7" style="text-align:center; color:#999;">Click 'Refresh All Data' to load.</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <span class="raw-label">Raw Output (History)</span>
    <pre id="raw-history" class="raw-log"></pre>
  </div>

  <div id="tab-bitcoin" class="tab-content">
    <div class="two-col-grid">
      <div>
        <section id="btc-receive">
          <h2>📥 Receive BTC</h2>
          <button id="btn-newaddress">Generate New Address</button>
          <div id="btc-address" style="margin-top: 10px; font-family:monospace; word-break:break-all; background:#eee; padding:8px;"><i>No address generated</i></div>
        </section>

        <section id="btc-send">
          <h2>💸 Send BTC</h2>
          <div class="input-group">
            <label for="send-btc-addr">Recipient Address:</label>
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
          <button id="btn-send-btc" style="background:#28a745; color:white; border:none; width:100%;">Send BTC On-Chain</button>
          <div id="send-btc-content" style="margin-top: 10px;"></div>
        </section>
      </div>

      <div>
        <section id="dev-tools">
          <h2>⛏️ Mining (Regtest)</h2>
          <div class="input-group">
            <label for="num-blocks">Blocks to Mine:</label>
            <div style="display:flex;">
               <input type="number" id="num-blocks" value="1" step="1" style="width: 80px;">
               <button id="btn-mine-blocks">Mine Blocks</button>
            </div>
          </div>
          <div id="mine-blocks-content" style="margin-top: 10px;"></div>
        </section>
        <section>
            <h2>📖 BTC Transaction List</h2>
            <button id="btn-list-btc">Refresh List</button>
            <div id="btc-history-content" class="history-container"></div>
        </section>
      </div>
    </div>
    <span class="raw-label">Raw Output (Bitcoin)</span>
    <pre id="raw-bitcoin" class="raw-log"></pre>
  </div>

  <div id="tab-lightning" class="tab-content">
    <div class="two-col-grid">
      <div>
        <section id="ln-receive">
          <h2>📥 Receive (Create Invoice)</h2>
          <div class="node-selector">
            <label>Recipient Node:</label>
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
          <button id="btn-create-ln-invoice" style="width:100%; background:#17a2b8; color:white; border:none;">Create Invoice</button>
          <div id="create-ln-content" style="margin-top: 10px; word-break: break-all; font-size:0.85em;">
            <i>Invoice will appear here...</i>
          </div>
        </section>
      </div>

      <div>
        <section id="ln-send">
          <h2>💸 Send (Pay Invoice)</h2>
          <div class="node-selector">
            <label>Sender Node:</label>
            <label><input type="radio" name="node-pay-inv" value="node4" checked> N4</label>
            <label><input type="radio" name="node-pay-inv" value="node5"> N5</label>
            <label><input type="radio" name="node-pay-inv" value="node6"> N6</label>
          </div>
          <div class="input-group">
            <label for="ln-pay-string">Invoice (bolt11):</label>
            <input type="text" id="ln-pay-string" placeholder="lnbcrt500u..." style="font-family:monospace;">
          </div>
          <button id="btn-pay-ln-invoice" style="width:100%; background:#e83e8c; color:white; border:none;">Pay Invoice</button>
          <div id="pay-ln-content" style="margin-top: 10px;"></div>
        </section>
         <section>
            <h2>📖 Transaction List</h2>
            <div class="node-selector">
             <label><input type="radio" name="node-history" value="node4" checked> N4</label>
             <label><input type="radio" name="node-history" value="node5"> N5</label>
             <label><input type="radio" name="node-history" value="node6"> N6</label>
            </div>
            <button id="btn-list-ln">Refresh List</button>
            <div id="ln-history-content" class="history-container"></div>
        </section>
      </div>
    </div>
    <span class="raw-label">Raw Output (Lightning)</span>
    <pre id="raw-lightning" class="raw-log"></pre>
  </div>

  <div id="tab-channels" class="tab-content">
    <section id="channel-management">
      <h2>🔗 Channel Management</h2>
      <div class="node-selector">
        <label>Operating Node:</label>
        <label><input type="radio" name="node-channel" value="node4" checked> N4</label>
        <label><input type="radio" name="node-channel" value="node5"> N5</label>
        <label><input type="radio" name="node-channel" value="node6"> N6</label>
      </div>
      
      <div class="two-col-grid" style="margin-top:20px;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
           <h3>Step 0: Fund Node</h3>
           <button id="btn-ln-newaddr">Get Funding Address</button>
           <div id="ln-address-content" style="margin-top: 10px; font-weight: bold; word-break: break-all; background:#fff; padding:5px;"></div>
        </div>

        <div>
           <h3>Step 1: Connect Peer</h3>
           <div class="input-group">
             <label for="peer-id">Peer ID@Host:Port</label>
             <input type="text" id="peer-id" placeholder="Click 'Refresh Info' on a target node to fill this">
           </div>
           <button id="btn-connect-peer">Connect Peer</button>
           <br><br>
           <button id="btn-list-peers">List Connected Peers</button>
        </div>
      </div>

      <div style="margin-top: 20px; border-top:1px solid #eee; padding-top:20px;">
        <h3>Step 2: Open Channel</h3>
        <div class="input-group">
          <label for="fund-amount">Amount (sats):</label>
          <input type="number" id="fund-amount" placeholder="200000" style="width:200px;">
        </div>
        <button id="btn-fund-channel" style="background:#ffc107;">Fund Channel</button>
      </div>
      <div id="channel-content" style="margin-top: 20px; padding:10px; background:#e2e6ea; border-radius:4px;"><i>Status messages will appear here.</i></div>
    </section>
    <span class="raw-label">Raw Output (Channels)</span>
    <pre id="raw-channels" class="raw-log"></pre>
  </div>

  <div id="tab-hub" class="tab-content">
    <div class="two-col-grid">
      <section id="flamingo-hub">
        <h2>🦩 Hub Business Logic</h2>
        <div class="hub-box">
          <strong>1. User Onboarding</strong><br>
          <small>Simulates "One Click" Connect: User (N4) -> Hub (N5)</small>
          <br>
          <button id="btn-hub-connect" style="background: #e83e8c; color: white; border: none; width:100%">Connect to Hub</button>
          <div id="hub-connect-status" class="hub-status"></div>
        </div>

        <div class="hub-box" style="background: #fff3cd; border-color: #ffecb5;">
          <strong>2. Admin: Setup Routes</strong><br>
          <small>Simulates World: Hub (N5) -> Merchant (N6)</small>
          <br>
          <button id="btn-admin-setup" style="width:100%">⚙️ Setup Backend Routes</button>
          <div id="admin-setup-status" class="hub-status"></div>
        </div>

        <div class="hub-box" style="background: #d4edda; border-color: #c3e6cb;">
          <strong>3. Verify Revenue Model</strong><br>
          <small>Pays N4 -> N5 -> N6. Checks N5 for routing fees.</small>
          <br>
          <button id="btn-verify-revenue" style="width:100%">💰 Verify Fees</button>
          <div id="revenue-status" class="hub-status"></div>
        </div>
      </section>

      <section>
        <h2>💧 Liquidity Automagic</h2>
        <div class="hub-box" style="background: #e2e6ea; border-color: #adb5bd;">
          <div class="node-selector" style="margin-bottom: 5px;">
             <small>Check Node:</small> 
             <label><input type="radio" name="node-liq" value="node4" checked> N4</label>
             <label><input type="radio" name="node-liq" value="node5"> N5</label>
          </div>
          <button id="btn-refresh-liq" style="width: 100%;">Refresh Health Report</button>
          
          <div class="liq-container">
            <div id="bar-out" class="liq-out" style="width: 50%">Out</div>
            <div id="bar-in" class="liq-in" style="width: 50%">In</div>
          </div>
          <div id="liq-details" style="margin-top: 8px; font-size: 0.9em;"></div>
          <div id="liq-fix-area" style="display:none; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 5px;">
             <div id="liq-msg" style="color: #721c24; font-weight: bold; font-size: 0.9em; margin-bottom: 5px;"></div>
             <button id="btn-req-inbound" style="width: 100%; background: #17a2b8; color: white;">🔧 Auto-Fix: Request Inbound</button>
             <div id="inbound-status"></div>
          </div>
        </div>
        <br>
        <div class="hub-box" style="background: #f8d7da; border-color: #f5c6cb;">
          <strong>🧨 Danger Zone</strong><br>
          <small>Close all channels to restart test.</small>
          <br>
          <button id="btn-reset-world" style="background: #dc3545; color: white; border:none; width:100%">Reset World</button>
          <div id="reset-status" class="hub-status"></div>
        </div>
      </section>
    </div>
    <span class="raw-label">Raw Output (Hub)</span>
    <pre id="raw-hub" class="raw-log"></pre>
  </div>

  <div id="tab-tools" class="tab-content">
     <div class="two-col-grid">
      <section id="utilities">
        <h2>🛠️ Fee & Rate Tools</h2>
        <h3>Fee Estimator</h3>
        <div class="node-selector" id="fee-priority-selector">
          <label><input type="radio" name="fee-priority" value="high" checked> High (2 blks)</label>
          <label><input type="radio" name="fee-priority" value="medium"> Med (6 blks)</label>
          <label><input type="radio" name="fee-priority" value="low"> Low (100 blks)</label>
        </div>
        <button id="btn-estimate-fee">Estimate Fee</button>
        <div id="fee-content" style="margin:10px 0;"><i>No data yet</i></div>
        <hr style="border:0; border-top: 1px solid #eee; margin: 15px 0;">
        <h3>BTC to USD Converter</h3>
        <div class="input-group">
          <label for="btc-amount">BTC Amount:</label>
          <input type="number" id="btc-amount" value="1.0" step="0.01">
        </div>
        <button id="btn-convert-usd">Convert</button>
        <div id="usd-content" style="margin:10px 0;"><i>No data yet</i></div>
      </section>
    </div>
    <span class="raw-label">Raw Output (Tools)</span>
    <pre id="raw-tools" class="raw-log"></pre>
  </div>
`;

// --- JAVASCRIPT ---

// Tab Switching Logic
window.openTab = function(tabName) {
  const contents = document.getElementsByClassName('tab-content');
  for (let i = 0; i < contents.length; i++) contents[i].classList.remove('active');
  const btns = document.getElementsByClassName('tab-btn');
  for (let i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  document.getElementById(tabName).classList.add('active');
  if(event && event.target) event.target.classList.add('active');
}

// WebSocket Setup
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

// Utility: Get current active Raw Output element based on visible tab
function getActiveRaw() {
  const activeTab = document.querySelector('.tab-content.active');
  return activeTab ? activeTab.querySelector('.raw-log') : document.getElementById('raw-overview');
}

// Populates simple lists in sub-tabs
function populateHistoryList(containerId, items, idField, descField) {
  const container = document.getElementById(containerId)
  container.innerHTML = ''
  if (!items || items.length === 0) {
    container.innerHTML = '<i>No history found.</i>'
    return
  }
  items.forEach(item => {
    const id = item[idField]
    const desc = item[descField]
    const itemEl = document.createElement('div')
    itemEl.className = 'history-item'
    const idEl = document.createElement('span')
    idEl.className = 'history-item-id' // kept for styling
    idEl.textContent = `${id.substring(0, 20)}...`
    
    // Use the global handler for these simple lists too, assuming type based on container
    const isLn = containerId.includes('ln');
    idEl.onclick = () => window.handleHistoryClick(idEl, id, isLn ? 'LN' : 'BTC');
    idEl.style.color = '#0056b3'; idEl.style.cursor = 'pointer';
    
    itemEl.appendChild(idEl)
    itemEl.append(` - ${desc}`)
    container.appendChild(itemEl)
  })
}

// Helper: Format Satoshis
const fmtSats = (msat) => Math.floor(msat / 1000).toLocaleString();

function setupButtons () {
  
  // 1. Refresh All History Data
  document.getElementById('btn-refresh-all-hist').onclick = () => {
    const userId = document.querySelector('input[name="hist-user"]:checked').value;
    const rawEl = document.getElementById('raw-history');
    const tableBody = document.getElementById('full-history-body');
    
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>';

    // A. Get Summary Stats
    send('get_transaction_summary', { userId }, (m) => {
      if (m.data.status === 'success') {
        const d = m.data.data;
        document.getElementById('sum-net').textContent = fmtSats(d.net_balance_msat);
        document.getElementById('sum-in').textContent = fmtSats(d.total_received_msat);
        document.getElementById('sum-out').textContent = fmtSats(d.total_sent_msat);
        document.getElementById('sum-fees').textContent = fmtSats(d.total_fees_paid_msat);
      }
    });

    // B. Get Detailed History
    send('get_transaction_history', { userId, limit: 50 }, (m) => {
      rawEl.textContent = JSON.stringify(m, null, 2);
      tableBody.innerHTML = '';
      
      if (m.data.status === 'success' && m.data.data.length > 0) {
        m.data.data.forEach(tx => {
          const isBtc = tx.type === 'BTC';
          const isIn = tx.direction === 'IN';
          const dateStr = new Date(tx.timestamp * 1000).toLocaleString();
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><span class="tx-type-tag ${isBtc ? 'tag-btc' : 'tag-ln'}">${tx.type}</span></td>
            <td>${dateStr}</td>
            <td style="font-size:0.85em;">${tx.note || '-'}</td>
            <td style="font-weight:bold;">${tx.direction}</td>
            <td class="${isIn ? 'amt-in' : 'amt-out'}">${isIn ? '+' : '-'}${fmtSats(tx.amount_msat)}</td>
            <td>${tx.status}</td>
            <td><span class="clickable-id" onclick="window.handleHistoryClick(this, '${tx.id}', '${tx.type}')">${tx.id.substring(0,8)}...</span></td>
          `;
          tableBody.appendChild(row);
        });
      } else {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No transactions found.</td></tr>';
      }
    });
  };

  // 2. Daily Logs Search
  document.getElementById('btn-get-daily').onclick = () => {
    const userId = document.querySelector('input[name="hist-user"]:checked').value;
    const dateVal = document.getElementById('daily-date').value;
    const resDiv = document.getElementById('daily-res');
    const rawEl = document.getElementById('raw-history');

    if (!dateVal) { resDiv.innerHTML = '<span style="color:red">Please select a date.</span>'; return; }
    
    resDiv.innerHTML = 'Searching...';
    
    send('get_daily_transactions', { userId, date: dateVal }, (m) => {
      rawEl.textContent = JSON.stringify(m, null, 2);
      resDiv.innerHTML = '';
      
      if (m.data.status === 'success' && m.data.data.length > 0) {
         m.data.data.forEach(tx => {
            const div = document.createElement('div');
            div.style.borderBottom = '1px solid #eee';
            div.style.padding = '8px';
            div.style.cursor = 'pointer';
            div.className = 'history-item';
            
            // Pass null for 'el' so we don't replace row text with "Copied!", but still trigger lookup
            div.onclick = () => window.handleHistoryClick(null, tx.id, tx.type);
            
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                  <span><b>${new Date(tx.timestamp*1000).toLocaleTimeString()}</b> <span class="tx-type-tag ${tx.type==='BTC'?'tag-btc':'tag-ln'}">${tx.type}</span></span>
                  <span>${tx.direction === 'IN' ? '📥' : '💸'} <b>${fmtSats(tx.amount_msat)}</b> sat</span>
                </div>
                <div style="font-size:0.8em; color:#666; margin-top:2px;">ID: ${tx.id.substring(0,20)}...</div>
            `;
            resDiv.appendChild(div);
         });
      } else {
         resDiv.textContent = 'No transactions found for this date.';
      }
    });
  };

  // 3. Lookups in History Tab
  document.getElementById('btn-lookup-btc').onclick = () => {
    const tx_id = document.getElementById('lookup-id').value;
    const resEl = document.getElementById('res-lookup');
    const rawEl = document.getElementById('raw-history');
    
    if (!tx_id) { 
        resEl.style.display = 'block';
        resEl.textContent = 'Error: ID required'; 
        return; 
    }
    
    resEl.style.display = 'block';
    resEl.innerHTML = '⏳ Looking up BTC TX...';
    
    send('get_tx_details_from_btcnode', { tx_id }, (m) => {
      rawEl.textContent = JSON.stringify(m, null, 2);
      const data = m.data?.data;
      if (data) {
          resEl.innerHTML = `
            <div style="margin-bottom:5px;"><strong style="color:#e83e8c;">✅ BTC Transaction Found</strong></div>
            <div style="display:grid; grid-template-columns: auto 1fr; gap:5px 15px;">
                <b>ID:</b> <span style="font-family:monospace;">${data.txid ? data.txid : tx_id}</span>
                <b>Amount:</b> ${data.amount || 'N/A'} BTC
                <b>Confs:</b> ${data.confirmations !== undefined ? data.confirmations : '0'}
                <b>Time:</b> ${data.time ? new Date(data.time*1000).toLocaleString() : 'N/A'}
            </div>
          `;
      } else {
          resEl.innerHTML = `<span style="color:red">❌ Transaction not found.</span>`;
      }
    });
  };

  document.getElementById('btn-lookup-ln').onclick = () => {
    const payment_hash = document.getElementById('lookup-id').value;
    const userId = document.querySelector('input[name="hist-user"]:checked').value;
    const resEl = document.getElementById('res-lookup');
    const rawEl = document.getElementById('raw-history');
    
    if (!payment_hash) { 
        resEl.style.display = 'block';
        resEl.textContent = 'Error: Hash required'; 
        return; 
    }

    resEl.style.display = 'block';
    resEl.innerHTML = '⏳ Looking up LN Invoice...';
    
    send('get_tx_details_from_lnnode', { userId, payment_hash }, (m) => {
      rawEl.textContent = JSON.stringify(m, null, 2);
      const d = m.data?.data;
      if (d) {
          const status = d.status || (d.payment_hash ? 'Found' : 'Unknown');
          const amt = d.amount_msat || d.amount_received_msat || '0';
          resEl.innerHTML = `
            <div style="margin-bottom:5px;"><strong style="color:#6f42c1;">⚡ Lightning Record</strong></div>
            <div style="display:grid; grid-template-columns: auto 1fr; gap:5px 15px;">
                <b>Status:</b> <span style="text-transform:uppercase; font-weight:bold;">${status}</span>
                <b>Amount:</b> ${fmtSats(amt)} sats
                <b>Desc:</b> ${d.description || '-'}
                <b>Hash:</b> <span style="font-family:monospace;">${payment_hash.substring(0,20)}...</span>
            </div>
          `;
      } else {
          resEl.innerHTML = `<span style="color:red">❌ Invoice/Payment not found on ${userId}.</span>`;
      }
    });
  };

  // 4. Validation in History Tab
  document.getElementById('btn-validate-btc').onclick = () => {
      const tx_id = document.getElementById('lookup-id').value;
      const amt = parseFloat(document.getElementById('validate-amt').value);
      const resEl = document.getElementById('res-lookup');
      const rawEl = document.getElementById('raw-history');
      resEl.style.display = 'block';

      send('validate_btc_payment', { tx_id, amount: amt }, (m) => {
         const d = m.data;
         if (d.status === 'success') resEl.innerHTML = `<span style="color:green">✅ <b>VALID:</b> Received ${d.data.receivedAmount} BTC (${d.data.confirmations} confs)</span>`;
         else if (d.status === 'pending') resEl.innerHTML = `<span style="color:orange">⏳ <b>PENDING:</b> ${d.data.confirmations} confirmations</span>`;
         else resEl.innerHTML = `<span style="color:red">❌ <b>INVALID:</b> ${d.error}</span>`;
         rawEl.textContent = JSON.stringify(m, null, 2);
      });
  };

  document.getElementById('btn-validate-ln').onclick = () => {
      const payment_hash = document.getElementById('lookup-id').value;
      const amt = parseInt(document.getElementById('validate-amt').value, 10);
      const userId = document.querySelector('input[name="hist-user"]:checked').value;
      const resEl = document.getElementById('res-lookup');
      const rawEl = document.getElementById('raw-history');
      resEl.style.display = 'block';

      send('validate_ln_payment', { payment_hash, amount_msat: amt, userId }, (m) => {
         const d = m.data;
         if (d.status === 'success') resEl.innerHTML = `<span style="color:green">✅ <b>VALID:</b> Invoice is PAID.</span>`;
         else if (d.status === 'pending') resEl.innerHTML = `<span style="color:orange">⏳ <b>PENDING:</b> Status is '${d.data.status}'.</span>`;
         else resEl.innerHTML = `<span style="color:red">❌ <b>INVALID:</b> ${d.error}</span>`;
         rawEl.textContent = JSON.stringify(m, null, 2);
      });
  };


  // --- EXISTING HANDLERS (Preserved) ---
  
  document.getElementById('btn-hub-connect').onclick = () => {
    const el = document.getElementById('hub-connect-status');
    el.textContent = 'Connecting...';
    send('open_channel_flamingo', { userId: 'node4' }, (m) => {
      if (m.data.status === 'success') {
        el.innerHTML = `<span style="color:green">${m.data.data.message}</span><br><small>TXID: ${m.data.data.txid.substr(0,10)}...</small>`;
      } else {
        el.innerHTML = `<span style="color:red">${m.data.error}</span>`;
      }
      document.getElementById('raw-hub').textContent = JSON.stringify(m, null, 2);
    });
  }

  document.getElementById('btn-admin-setup').onclick = () => {
    const el = document.getElementById('admin-setup-status');
    el.textContent = 'Setting up routes...';
    send('admin_setup_hub', {}, (m) => {
      if (m.data.status === 'success') el.innerHTML = `<span style="color:green">✅ ${m.data.data.message}</span>`;
      else el.innerHTML = `<span style="color:red">${m.data.error}</span>`;
      document.getElementById('raw-hub').textContent = JSON.stringify(m, null, 2);
    });
  }

  document.getElementById('btn-verify-revenue').onclick = () => {
    const el = document.getElementById('revenue-status');
    el.textContent = 'Simulating payment...';
    send('verify_revenue', { amount_msat: 50000 }, (m) => {
      const d = m.data.data;
      if (m.data.status === 'success') {
         el.innerHTML = `<span style="color:green"><b>VERIFIED</b></span><br>Fee: <b>${d.fee_earned_msat} msat</b>`;
      } else if (m.data.status === 'warning') {
         el.innerHTML = `<span style="color:orange">⚠️ ${m.data.data.message}</span>`;
      } else {
         el.innerHTML = `<span style="color:red">❌ ${m.data.error}</span>`;
      }
      document.getElementById('raw-hub').textContent = JSON.stringify(m, null, 2);
    });
  }
  
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
          if(peerIdEl) peerIdEl.value = connectString;
        }
      }
      getActiveRaw().textContent = JSON.stringify(m, null, 2)
    })
  }

  document.getElementById('btn-listfunds').onclick = () => {
    const userId = document.querySelector('input[name="node-ln-balance"]:checked').value
    send('get_ln_balance', { userId }, (m) => {
      const d = m.data?.data
      document.getElementById('balance-content').innerHTML = `
        <div><b>Balance (BTC):</b> ${d?.btc || '0'} BTC</div>
        <div><b>Balance (Sats):</b> ${d?.sats?.toLocaleString() || 0} sats</div>
      `
      getActiveRaw().textContent = JSON.stringify(m, null, 2)
    })
  }
  
  document.getElementById('btn-getbalance').onclick = () => {
    send('get_btc_balance', {}, (m) => {
      const bal = m.data?.data?.btc
      document.getElementById('btc-balance-value').innerHTML = `<b>Balance:</b> ${bal} BTC`
      getActiveRaw().textContent = JSON.stringify(m, null, 2)
    })
  }

  document.getElementById('btn-newaddress').onclick = () => {
    send('bitcoin-newaddress', {}, (m) => {
      const addr = m.data?.data || '(not returned)'
      document.getElementById('btc-address').innerHTML = `<b>New Address:</b> ${addr}`
      document.getElementById('raw-bitcoin').textContent = JSON.stringify(m, null, 2)
    })
  }

  document.getElementById('btn-estimate-fee').onclick = () => {
    const priority = document.querySelector('input[name="fee-priority"]:checked').value
    send('estimate_btc_fee', { priority }, (m) => {
      const d = m.data?.data
      document.getElementById('fee-content').innerHTML = `
        <div><b>Feerate:</b> ${d?.feerate_btc_per_kb || 'N/A'} BTC/kB</div>
        <div><b>Target Blocks:</b> ${d?.blocks || 'N/A'}</div>
      `
      document.getElementById('raw-tools').textContent = JSON.stringify(m, null, 2)
    })
  }

  document.getElementById('btn-convert-usd').onclick = () => {
    const amount = document.getElementById('btc-amount').value
    send('convert_btc_to_usd', { amount_btc: parseFloat(amount) }, (m) => {
      const d = m.data?.data
      document.getElementById('usd-content').innerHTML = `
        <div><b>${d?.btc_amount || 0} BTC</b> is worth <b>$${d?.usd_value?.toFixed(2) || '0.00'} USD</b></div>
      `
      document.getElementById('raw-tools').textContent = JSON.stringify(m, null, 2)
    })
  }
  
  document.getElementById('btn-list-btc').onclick = () => {
    document.getElementById('btc-history-content').innerHTML = '<i>Loading...</i>'
    send('list_btc_transactions', {}, (m) => {
      const items = m.data?.data || []
      const processed = items.map(tx => ({
        id: tx.txid,
        desc: `${tx.category} ${tx.amount} BTC`
      }))
      populateHistoryList('btc-history-content', processed, 'id', 'desc')
      document.getElementById('raw-bitcoin').textContent = JSON.stringify(m, null, 2)
    })
  }
  
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
      document.getElementById('raw-lightning').textContent = JSON.stringify(m, null, 2)
    })
  }

  document.getElementById('btn-create-ln-invoice').onclick = () => {
    const data = {
      userId: document.querySelector('input[name="node-create-inv"]:checked').value,
      amount_msat: parseInt(document.getElementById('ln-create-msat').value, 10),
      description: document.getElementById('ln-create-desc').value
    };
    const contentEl = document.getElementById('create-ln-content');
    const payInputEl = document.getElementById('ln-pay-string');

    if (!data.amount_msat || !data.description) { contentEl.innerHTML = `❌ <b>Error:</b> Required fields missing.`; return; }

    contentEl.textContent = 'Creating invoice...';
    send('create_ln_invoice', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.innerHTML = `
          <div><b>Invoice:</b> <span id="new-inv" style="cursor:pointer; color:#0056b3;">${d.data.bolt11.substring(0, 60)}...</span></div>
        `;
        document.getElementById('new-inv').onclick = (e) => {
           payInputEl.value = d.data.bolt11;
           copyToClipboard(d.data.bolt11, e.target);
        };
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      document.getElementById('raw-lightning').textContent = JSON.stringify(m, null, 2);
    });
  };
  
  document.getElementById('btn-pay-ln-invoice').onclick = () => {
    const data = {
      userId: document.querySelector('input[name="node-pay-inv"]:checked').value,
      invoice_string: document.getElementById('ln-pay-string').value
    };
    const contentEl = document.getElementById('pay-ln-content');

    if (!data.invoice_string) { contentEl.innerHTML = `❌ <b>Error:</b> Invoice string required.`; return; }
    contentEl.textContent = 'Sending payment...';
    send('pay_ln_invoice', data, (m) => {
      const d = m.data;
      if (d.status === 'pending' || d.status === 'success') { 
        contentEl.innerHTML = `⌛ <b>Payment sending...</b> P-Hash: ${d.data.payment_hash.substring(0, 20)}...`;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      document.getElementById('raw-lightning').textContent = JSON.stringify(m, null, 2);
    });
  };

  document.getElementById('btn-ln-newaddr').onclick = () => {
    const data = { userId: document.querySelector('input[name="node-channel"]:checked').value };
    const contentEl = document.getElementById('ln-address-content');
    contentEl.textContent = 'Getting address...';
    send('lightning_newaddress', data, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.textContent = d.data;
        document.getElementById('send-btc-addr').value = d.data;
      } else contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      document.getElementById('raw-channels').textContent = JSON.stringify(m, null, 2);
    });
  };

  document.getElementById('btn-list-peers').onclick = () => {
    const data = { userId: document.querySelector('input[name="node-channel"]:checked').value };
    const contentEl = document.getElementById('channel-content');
    contentEl.textContent = 'Listing peers...';
    send('list_peers', data, (m) => {
      const d = m.data;
      if (d.status === 'success') contentEl.textContent = `Found ${d.data.length} peers.`;
      else contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      document.getElementById('raw-channels').textContent = JSON.stringify(m, null, 2);
    });
  };

  document.getElementById('btn-connect-peer').onclick = () => {
    const data = {
      userId: document.querySelector('input[name="node-channel"]:checked').value,
      peer_address: document.getElementById('peer-id').value
    };
    const contentEl = document.getElementById('channel-content');
    if (!data.peer_address) { contentEl.innerHTML = `❌ <b>Error:</b> Peer ID required.`; return; }
    contentEl.textContent = 'Connecting...';
    send('connect_node', data, (m) => {
      const d = m.data;
      if (d.status === 'success') contentEl.innerHTML = `✅ <b>Connected!</b> Peer ID: ${d.data.id}`;
      else contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      document.getElementById('raw-channels').textContent = JSON.stringify(m, null, 2);
    });
  };

  document.getElementById('btn-fund-channel').onclick = () => {
    const fullPeerString = document.getElementById('peer-id').value;
    const peer_id_only = fullPeerString.split('@')[0];
    const contentEl = document.getElementById('channel-content');
    if (!peer_id_only) { contentEl.innerHTML = `❌ <b>Error:</b> Peer ID required.`; return; }

    const data = {
      userId: document.querySelector('input[name="node-channel"]:checked').value,
      peer_id: peer_id_only,
      amount_sats: parseInt(document.getElementById('fund-amount').value, 10)
    };
    contentEl.textContent = 'Funding channel...';
    send('fund_channel', data, (m) => {
      const d = m.data;
      if (d.status === 'success') contentEl.innerHTML = `✅ <b>Channel funding initiated!</b> TXID: ${d.data.txid}`;
      else contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      document.getElementById('raw-channels').textContent = JSON.stringify(m, null, 2);
    });
  };

  document.getElementById('btn-send-btc').onclick = () => {
    const data = {
      recipient_address: document.getElementById('send-btc-addr').value,
      amount_btc: parseFloat(document.getElementById('send-btc-amount').value),
      fee_rate_sats_per_vb: parseInt(document.getElementById('send-btc-fee').value, 10)
    };
    const contentEl = document.getElementById('send-btc-content');
    if (!data.recipient_address || !data.amount_btc) { contentEl.innerHTML = `❌ <b>Error:</b> Fields missing.`; return; }

    contentEl.textContent = 'Sending...';
    send('send_btc_onchain', data, (m) => {
      const d = m.data;
      if (d.status === 'success') contentEl.innerHTML = `✅ <b>Success!</b> TXID: ${d.data.tx_id}`;
      else contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      document.getElementById('raw-bitcoin').textContent = JSON.stringify(m, null, 2);
    });
  };

  document.getElementById('btn-reset-world').onclick = () => {
    const el = document.getElementById('reset-status');
    el.textContent = 'Running Diagnostic Reset...';
    send('admin_reset_world', {}, (m) => {
      const d = m.data.data || {};
      if (m.data.status === 'success') el.innerHTML = `<span style="color:darkred"><b>${d.message}</b></span>`;
      else el.innerHTML = `<span style="color:red">${m.data.error}</span>`;
      document.getElementById('raw-hub').textContent = JSON.stringify(m, null, 2);
    });
  };
  
  document.getElementById('btn-refresh-liq').onclick = () => {
    const userId = document.querySelector('input[name="node-liq"]:checked').value;
    send('get_liquidity_report', { userId }, (m) => {
      const d = m.data.data;
      if (m.data.status === 'success') {
        const total = d.outbound_sats + d.inbound_sats;
        const outPct = total ? Math.round((d.outbound_sats / total) * 100) : 0;
        const inPct = total ? Math.round((d.inbound_sats / total) * 100) : 0;

        const barOut = document.getElementById('bar-out');
        const barIn = document.getElementById('bar-in');
        barOut.style.width = `${outPct}%`; barOut.textContent = outPct > 10 ? `Out ${outPct}%` : '';
        barIn.style.width = `${inPct}%`; barIn.textContent = inPct > 10 ? `In ${inPct}%` : '';

        const health = d.health;
        let badgeClass = health.status === 'HEALTHY' ? 'health-ok' : 'health-bad';
        if (health.status === 'LOW_INBOUND' || health.status === 'LOW_OUTBOUND') badgeClass = 'health-warn';

        document.getElementById('liq-details').innerHTML = `
          <div><b>Total:</b> ${d.total_capacity_sats.toLocaleString()} sats</div>
          <div><b>Outbound (Send):</b> ${d.outbound_sats.toLocaleString()}</div>
          <div><b>Inbound (Recv):</b> ${d.inbound_sats.toLocaleString()}</div>
          <div style="margin-top:5px;">Status: <span class="health-tag ${badgeClass}">${health.status}</span></div>
        `;

        const fixArea = document.getElementById('liq-fix-area');
        if (health.action_required && health.status === 'LOW_INBOUND') {
           fixArea.style.display = 'block';
           document.getElementById('liq-msg').textContent = `⚠️ ${health.message}`;
        } else {
           fixArea.style.display = 'none';
        }
      }
      document.getElementById('raw-hub').textContent = JSON.stringify(m, null, 2);
    });
  };

  document.getElementById('btn-req-inbound').onclick = () => {
    document.getElementById('inbound-status').textContent = 'Requesting...';
    send('request_inbound_liquidity', { userId: 'node4', amount_sats: 500000 }, (m) => {
      const d = m.data;
      if (d.status === 'success') {
         document.getElementById('inbound-status').innerHTML = `<span style="color:green">✅ ${d.data.message}</span>`;
         setTimeout(() => document.getElementById('btn-refresh-liq').click(), 2000); 
      } else {
         document.getElementById('inbound-status').innerHTML = `<span style="color:red">${d.error}</span>`;
      }
      document.getElementById('raw-hub').textContent = JSON.stringify(m, null, 2);
    });
  };
  
  document.getElementById('btn-mine-blocks').onclick = () => {
    const num_blocks = parseInt(document.getElementById('num-blocks').value, 10) || 1;
    const contentEl = document.getElementById('mine-blocks-content');
    contentEl.textContent = `Mining ${num_blocks} block(s)...`;
    send('btc_mine_blocks_regtest', { num_blocks }, (m) => {
      const d = m.data;
      if (d.status === 'success') {
        contentEl.innerHTML = `✅ <b>Success!</b> Mined ${d.data.blocks_mined} block(s).`;
        if (d.data.blocks_mined === 1) contentEl.innerHTML += ` Hash: ${d.data.block_hashes[0]}`;
      } else {
        contentEl.innerHTML = `❌ <b>Error:</b> ${d.error}`;
      }
      document.getElementById('raw-bitcoin').textContent = JSON.stringify(m, null, 2);
    });
  };
}

connect()