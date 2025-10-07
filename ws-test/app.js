let ws;
const logEl = document.getElementById('log');
const urlEl = document.getElementById('url');

function log(...args) {
  const txt = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
  logEl.textContent += txt + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

// ---------------- WebSocket ----------------
document.getElementById('connect').addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) { log('Already connected'); return; }
  const url = urlEl.value;
  ws = new WebSocket(url);

  ws.onopen = () => {
    log('Connected to', url);
    document.getElementById('connect').disabled = true;
    document.getElementById('disconnect').disabled = false;
  };

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      log('RECV', msg);

      // Auto-fill funding addresses
      if (msg.type === 'new-lightning-address-response' && msg.data?.bech32) {
        document.getElementById('funding-address').value = msg.data.bech32;
      }
      if (msg.type === 'new-lightning-address2-response' && msg.data?.bech32) {
        document.getElementById('funding-address2').value = msg.data.bech32;
      }

      // Auto-fill invoices when received
      if (msg.type === 'create-invoice-node1-response' && msg.data?.bolt11) {
        document.getElementById('bolt11-node1').value = msg.data.bolt11;
      }
      if (msg.type === 'create-invoice-node2-response' && msg.data?.bolt11) {
        document.getElementById('bolt11-node2').value = msg.data.bolt11;
      }

    } catch (e) {
      log('RECV (raw)', evt.data);
    }
  };

  ws.onclose = () => {
    log('Connection closed');
    document.getElementById('connect').disabled = false;
    document.getElementById('disconnect').disabled = true;
  };

  ws.onerror = (e) => {
    log('WebSocket error', e);
  };
});

document.getElementById('disconnect').addEventListener('click', () => {
  if (ws) ws.close();
});

// ---------------- Generic Send ----------------
document.getElementById('send').addEventListener('click', () => {
  sendFromInputs();
});

function sendFromInputs() {
  if (!ws || ws.readyState !== WebSocket.OPEN) { log('Not connected'); return; }
  const type = document.getElementById('type').value.trim();
  let dataStr = document.getElementById('data').value.trim();
  let data = dataStr ? (() => { try { return JSON.parse(dataStr); } catch (e) { log('Invalid JSON in data'); return null; } })() : {};
  if (data === null) return;
  sendRaw({ type, data });
}

function sendRaw({ type, data }) {
  if (!ws || ws.readyState !== WebSocket.OPEN) { log('Not connected'); return; }
  const head = 'cli-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
  const msg = { head, refs: null, type, data };
  ws.send(JSON.stringify(msg));
  log('SENT', msg);
}

// ---------------- Bitcoin ----------------
document.getElementById('subscribe-status').addEventListener('click', () => {
  sendRaw({ type: 'subscribe', data: { event: 'node-status' } });
});
document.getElementById('unsubscribe-status').addEventListener('click', () => {
  sendRaw({ type: 'unsubscribe', data: { event: 'node-status' } });
});
document.getElementById('resume').addEventListener('click', () => {
  sendRaw({ type: 'resume', data: {} });
});
document.getElementById('getinfo-bitcoin').addEventListener('click', () => {
  sendRaw({ type: 'getinfo-bitcoin', data: {} });
});

// ---------------- Node 1 ----------------
document.getElementById('getinfo-lightning').addEventListener('click', () => {
  sendRaw({ type: 'getinfo-lightning', data: {} });
});
document.getElementById('new-lightning-address').addEventListener('click', () => {
  sendRaw({ type: 'new-lightning-address', data: {} });
});
document.getElementById('fund-node').addEventListener('click', () => {
  const address = document.getElementById('funding-address').value.trim();
  const blocks = document.getElementById('funding-blocks').value.trim();
  if (!address) return log('Please generate an address first.');
  if (!blocks || isNaN(parseInt(blocks, 10))) return log('Enter valid blocks.');
  sendRaw({ type: 'fund-lightning-node', data: { address, blocks: parseInt(blocks, 10) } });
});
document.getElementById('list-funds').addEventListener('click', () => {
  sendRaw({ type: 'list-lightning-funds', data: {} });
});

// Node1 Invoice/Payments
document.getElementById('create-invoice-node1').addEventListener('click', () => {
  const amount = parseInt(document.getElementById('invoice-amount-node1').value.trim(), 10);
  const label = document.getElementById('invoice-label-node1').value.trim() || `inv1-${Date.now()}`;
  const description = document.getElementById('invoice-desc-node1').value.trim() || 'Payment Request';
  if (!amount || isNaN(amount)) return log('Invalid amount.');
  sendRaw({ type: 'create-invoice-node1', data: { amount, label, description } });
});
document.getElementById('pay-invoice-node1').addEventListener('click', () => {
  const bolt11 = document.getElementById('bolt11-node1').value.trim();
  if (!bolt11) return log('Paste BOLT11 invoice first.');
  sendRaw({ type: 'pay-invoice-node1', data: { bolt11 } });
});
document.getElementById('list-invoices-node1').addEventListener('click', () => {
  sendRaw({ type: 'list-invoices-node1', data: {} });
});
document.getElementById('list-pays-node1').addEventListener('click', () => {
  sendRaw({ type: 'list-pays-node1', data: {} });
});

// ---------------- Node 2 ----------------
document.getElementById('getinfo-lightning2').addEventListener('click', () => {
  sendRaw({ type: 'getinfo-lightning2', data: {} });
});
document.getElementById('new-lightning-address2').addEventListener('click', () => {
  sendRaw({ type: 'new-lightning-address2', data: {} });
});
document.getElementById('fund-node2').addEventListener('click', () => {
  const address = document.getElementById('funding-address2').value.trim();
  const blocks = document.getElementById('funding-blocks2').value.trim();
  if (!address) return log('Generate address first (Node2).');
  if (!blocks || isNaN(parseInt(blocks, 10))) return log('Enter valid blocks.');
  sendRaw({ type: 'fund-lightning-node2', data: { address, blocks: parseInt(blocks, 10) } });
});
document.getElementById('list-funds2').addEventListener('click', () => {
  sendRaw({ type: 'list-lightning-funds2', data: {} });
});

// Node2 Invoice/Payments
document.getElementById('create-invoice-node2').addEventListener('click', () => {
  const amount = parseInt(document.getElementById('invoice-amount-node2').value.trim(), 10);
  const label = document.getElementById('invoice-label-node2').value.trim() || `inv2-${Date.now()}`;
  const description = document.getElementById('invoice-desc-node2').value.trim() || 'Payment Request';
  if (!amount || isNaN(amount)) return log('Invalid amount.');
  sendRaw({ type: 'create-invoice-node2', data: { amount, label, description } });
});
document.getElementById('pay-invoice-node2').addEventListener('click', () => {
  const bolt11 = document.getElementById('bolt11-node2').value.trim();
  if (!bolt11) return log('Paste BOLT11 invoice first.');
  sendRaw({ type: 'pay-invoice-node2', data: { bolt11 } });
});
document.getElementById('list-invoices-node2').addEventListener('click', () => {
  sendRaw({ type: 'list-invoices-node2', data: {} });
});
document.getElementById('list-pays-node2').addEventListener('click', () => {
  sendRaw({ type: 'list-pays-node2', data: {} });
});

// ---------------- P2P ----------------
document.getElementById('connect-nodes').addEventListener('click', () => {
  sendRaw({ type: 'connect-peer', data: {} });
});
document.getElementById('list-peers').addEventListener('click', () => {
  sendRaw({ type: 'list-peers', data: {} });
});

// ---------------- Channels ----------------
document.getElementById('open-channel').addEventListener('click', () => {
  const satoshis = document.getElementById('channel-amount').value.trim();
  if (!satoshis || isNaN(parseInt(satoshis, 10))) return log('Enter valid amount.');
  sendRaw({ type: 'open-channel', data: { satoshis: parseInt(satoshis, 10) } });
});
document.getElementById('open-channel2').addEventListener('click', () => {
  const satoshis = document.getElementById('channel-amount2').value.trim();
  if (!satoshis || isNaN(parseInt(satoshis, 10))) return log('Enter valid amount.');
  sendRaw({ type: 'open-channel2', data: { satoshis: parseInt(satoshis, 10) } });
});
document.getElementById('list-channels').addEventListener('click', () => {
  sendRaw({ type: 'list-channels', data: {} });
});
document.getElementById('list-funds-channel').addEventListener('click', () => {
  sendRaw({ type: 'list-lightning-funds', data: {} });
});
