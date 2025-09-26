let ws;
const logEl = document.getElementById('log');
const urlEl = document.getElementById('url');

function log(...args) {
  const txt = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
  logEl.textContent += txt + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

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

      // auto-fill address fields when new addr comes back
      if (msg.type === 'new-lightning-address-response' && msg.data?.bech32) {
        document.getElementById('funding-address').value = msg.data.bech32;
      }
      if (msg.type === 'new-lightning-address2-response' && msg.data?.bech32) {
        document.getElementById('funding-address2').value = msg.data.bech32;
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

document.getElementById('send').addEventListener('click', () => {
  sendFromInputs();
});

function sendFromInputs() {
  if (!ws || ws.readyState !== WebSocket.OPEN) { log('Not connected'); return; }
  const type = document.getElementById('type').value.trim();
  let dataStr = document.getElementById('data').value.trim();
  let data = dataStr ? (() => { try { return JSON.parse(dataStr); } catch (e) { log('Invalid JSON in data'); return null; } })() : {};
  if (data === null) return;
  const head = 'cli-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
  const msg = { head, refs: null, type, data };
  ws.send(JSON.stringify(msg));
  log('SENT', msg);
}

// helper buttons for subscriptions and Bitcoin
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

// ---------- Node 1 ----------
document.getElementById('getinfo-lightning').addEventListener('click', () => {
  sendRaw({ type: 'getinfo-lightning', data: {} });
});
document.getElementById('new-lightning-address').addEventListener('click', () => {
  sendRaw({ type: 'new-lightning-address', data: {} });
});
document.getElementById('fund-node').addEventListener('click', () => {
  const address = document.getElementById('funding-address').value.trim();
  const blocks = document.getElementById('funding-blocks').value.trim();
  if (!address) { log('Please generate an address first.'); return; }
  if (!blocks || isNaN(parseInt(blocks, 10))) { log('Please enter a valid number of blocks.'); return; }
  sendRaw({ type: 'fund-lightning-node', data: { address, blocks: parseInt(blocks, 10) } });
});
document.getElementById('list-funds').addEventListener('click', () => {
  sendRaw({ type: 'list-lightning-funds', data: {} });
});

// ---------- Node 2 ----------
document.getElementById('getinfo-lightning2').addEventListener('click', () => {
  sendRaw({ type: 'getinfo-lightning2', data: {} });
});
document.getElementById('new-lightning-address2').addEventListener('click', () => {
  sendRaw({ type: 'new-lightning-address2', data: {} });
});
document.getElementById('fund-node2').addEventListener('click', () => {
  const address = document.getElementById('funding-address2').value.trim();
  const blocks = document.getElementById('funding-blocks2').value.trim();
  if (!address) { log('Please generate an address first (Node2).'); return; }
  if (!blocks || isNaN(parseInt(blocks, 10))) { log('Please enter a valid number of blocks.'); return; }
  sendRaw({ type: 'fund-lightning-node', data: { address, blocks: parseInt(blocks, 10) } });
});
document.getElementById('list-funds2').addEventListener('click', () => {
  sendRaw({ type: 'list-lightning-funds2', data: {} });
});

// ---------- P2P Actions ----------
document.getElementById('connect-nodes').addEventListener('click', () => {
  sendRaw({ type: 'connect-peer', data: {} });
});
document.getElementById('list-peers').addEventListener('click', () => {
  sendRaw({ type: 'list-peers', data: {} });
});

// ---------- Channel Operations ----------
document.getElementById('open-channel').addEventListener('click', () => {
  const satoshis = document.getElementById('channel-amount').value.trim();
  if (!satoshis || isNaN(parseInt(satoshis, 10))) {
    log('Please enter a valid channel amount (satoshis).');
    return;
  }
  sendRaw({ 
    type: 'open-channel', 
    data: { satoshis: parseInt(satoshis, 10) } 
  });
});

document.getElementById('open-channel2').addEventListener('click', () => {
  const satoshis = document.getElementById('channel-amount2').value.trim();
  if (!satoshis || isNaN(parseInt(satoshis, 10))) {
    log('Please enter a valid channel amount (satoshis).');
    return;
  }
  sendRaw({ 
    type: 'open-channel2', 
    data: { satoshis: parseInt(satoshis, 10) } 
  });
});

document.getElementById('list-channels').addEventListener('click', () => {
  sendRaw({ type: 'list-channels', data: {} });
});

document.getElementById('list-funds-channel').addEventListener('click', () => {
  sendRaw({ type: 'list-lightning-funds', data: {} });
});

// ---------- Helper ----------
function sendRaw({ type, data }) {
  if (!ws || ws.readyState !== WebSocket.OPEN) { log('Not connected'); return; }
  const head = 'cli-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
  const msg = { head, refs: null, type, data };
  ws.send(JSON.stringify(msg));
  log('SENT', msg);
}

