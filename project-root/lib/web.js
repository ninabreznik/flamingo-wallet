// lib/web.js
const wsUrl = 'ws://localhost:8080';

document.body.innerHTML = `
  <style>
    body { font-family: system-ui, sans-serif; background: #fafafa; margin: 40px; }
    h1 { color: #e83e8c; }
    #status { margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 6px; }
  </style>
  <h1>⚡ Flamingo Wallet — Lightning Node</h1>
  <div id="status">Connecting...</div>
  <section id="balance"></section>
  <section id="outputs"></section>
  <h3>Raw Response</h3>
  <pre id="raw"></pre>
`;

const name = 'frontend';
const to = 'backend';
let mid = 0;
const wait = {};
let ws;

function connect() {
  ws = new WebSocket(wsUrl);

  const statusEl = document.getElementById('status');
  const balanceEl = document.getElementById('balance');
  const outputsEl = document.getElementById('outputs');
  const rawEl = document.getElementById('raw');

  ws.onopen = () => {
    statusEl.textContent = `✅ Connected to ${wsUrl}`;
    statusEl.style.color = 'green';

    send('lightning-listfunds', {}, (m) => {
      const data = m.data?.data;
      if (!data) {
        rawEl.textContent = 'No data received';
        return;
      }

      balanceEl.innerHTML = `
        <div><strong>Balance (BTC):</strong> ${data.balance_btc}</div>
        <div><strong>Balance (sats):</strong> ${data.balance_sats.toLocaleString()}</div>
      `;

      const outputs = data.raw?.outputs || [];
      if (outputs.length === 0) {
        outputsEl.innerHTML = '<i>No on-chain outputs found.</i>';
      } else {
        const rows = outputs
          .map((o, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${o.txid.slice(0, 10)}...</td>
              <td>${(Number(o.amount_msat) / 1000 / 1e8).toFixed(8)} BTC</td>
              <td>${o.status}</td>
              <td>${o.blockheight || '-'}</td>
            </tr>`
          )
          .join('');
        outputsEl.innerHTML = `
          <table>
            <thead>
              <tr><th>#</th><th>TXID</th><th>Amount</th><th>Status</th><th>Block</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      rawEl.textContent = JSON.stringify(m, null, 2);
    });
  };

  ws.onclose = () => {
    statusEl.textContent = '❌ Disconnected — retrying...';
    statusEl.style.color = 'red';
    setTimeout(connect, 2000);
  };

  ws.onerror = (err) => {
    console.error('WebSocket error', err);
    statusEl.textContent = '⚠️ WebSocket Error — see console';
    statusEl.style.color = 'orange';
  };

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    const causeKey = m.refs?.cause?.join(',');
    if (causeKey && wait[causeKey]) {
      const h = wait[causeKey];
      delete wait[causeKey];
      return h(m);
    }
    console.log('unsolicited', m);
  };
}

function send(type, data, handler) {
  const head = [name, to, mid++];
  const msg = { head, type, data };
  wait[head.join(',')] = handler;
  ws.send(JSON.stringify(msg));
}

connect();
