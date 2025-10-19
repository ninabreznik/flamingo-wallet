const WebSocket = require('ws');
const wallet = require('../lib/node_modules/wallet'); 
const fs = require('fs');
const path = require('path');

const PORT = process.env.WS_PORT || 8080;
const MESSAGE_STORE = path.join(__dirname, 'message-store.json');

let persisted = loadStore();
const subscribers = {};

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(` WS server running on ws://localhost:${PORT}`);
});

// ----------------------------------------------
// Start daemons automatically
// ----------------------------------------------
(async () => {
  try {
    console.log('Attempting to start Bitcoin daemon...');
    await wallet.startBitcoin();
    console.log('Bitcoin daemon started or was already running.');
  } catch (e) {
    console.log('Could not start Bitcoin daemon (maybe already running).');
  }

  console.log('Attempting to start Lightning daemon (node 1)...');
  wallet.startLightning().then(() => {
    console.log('Lightning daemon (node 1) started.');
  }).catch(() => {
    console.log('Could not start Lightning daemon (node 1).');
  });

  console.log('Attempting to start Lightning daemon (node 2)...');
  wallet.startLightning2().then(() => {
    console.log('Lightning daemon (node 2) started.');
  }).catch(() => {
    console.log('Could not start Lightning daemon (node 2).');
  });

  console.log('Attempting to start Lightning daemon (node 3)...');
  wallet.startLightning3().then(() => {
    console.log('Lightning daemon (node 3) started.');
  }).catch(() => {
    console.log('Could not start Lightning daemon (node 3).');
  });
})();

// ----------------------------------------------
// Graceful Shutdown
// ----------------------------------------------
async function gracefulShutdown() {
  console.log('\nGracefully shutting down...');

  try {
    console.log('Attempting to stop Lightning daemon (node 1)...');
    await wallet.stopLightning();
    console.log('Lightning daemon (node 1) stopped.');
  } catch (e) {
    console.log('Could not stop Lightning daemon (node 1).');
  }

  try {
    console.log('Attempting to stop Lightning daemon (node 2)...');
    await wallet.stopLightning2();
    console.log('Lightning daemon (node 2) stopped.');
  } catch (e) {
    console.log('Could not stop Lightning daemon (node 2).');
  }

  try {
    console.log('Attempting to stop Lightning daemon (node 3)...');
    await wallet.stopLightning3();
    console.log('Lightning daemon (node 3) stopped.');
  } catch (e) {
    console.log('Could not stop Lightning daemon (node 3).');
  }

  try {
    console.log('Attempting to stop Bitcoin daemon...');
    await wallet.stopBitcoin();
    console.log('Bitcoin daemon stopped.');
  } catch (e) {
    console.log('Could not stop Bitcoin daemon.');
  }

  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

wss.on('connection', (ws) => {
  console.log('🔌 client connected');
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      ws.send(JSON.stringify({ head: null, refs: null, type: 'error', data: { error: 'invalid JSON' } }));
      return;
    }
    if (msg.head) persistMessage(msg);
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    console.log('client disconnected');
    Object.keys(subscribers).forEach((ev) => subscribers[ev].delete(ws));
  });

  ws.send(JSON.stringify({ 
    head: createMessageHead(SERVER_ID, '*'),
    refs: {},
    type: 'welcome', 
    data: { msg: 'connected' } 
  }));
});

  ws.send(JSON.stringify({ head: null, refs: null, type: 'welcome', data: { msg: 'connected' } }));
});


function loadStore() {
  try {
    if (fs.existsSync(MESSAGE_STORE)) {
      const raw = fs.readFileSync(MESSAGE_STORE, 'utf8');
      return JSON.parse(raw) || [];
    }
  } catch (e) {
    console.error('loadStore error', e);
  }
  return [];
}

function saveStore() {
  try {
    fs.writeFileSync(MESSAGE_STORE, JSON.stringify(persisted, null, 2));
  } catch (e) {
    console.error('saveStore error', e);
  }
}

function persistMessage(m) {
  const idx = persisted.findIndex((p) => p.head === m.head);
  if (idx === -1) {
    persisted.push({ ...m, ts: Date.now(), status: 'stored' });
  } else {
    persisted[idx] = { ...persisted[idx], ...m, status: 'updated' };
  }
  saveStore();
}

const SERVER_ID = 'ws_server';
let messageCounter = 0;

function createMessageHead(senderId, receiverId) {
  return [senderId, receiverId, messageCounter++];
}

function createResponse(originalMessage) {
  return {
    head: createMessageHead(SERVER_ID, originalMessage.head ? originalMessage.head[0] : '*'),
    refs: { cause: originalMessage.head || null }
  };
}

const on = {
  echo: async (m, ws) => {
    const { data } = m;
    const response = createResponse(m);
    ws.send(JSON.stringify({ 
      ...response,
      type: 'echo-response', 
      data 
    }));
  },

  'new-lightning-address': async (m, ws) => {
    try {
      const result = await wallet.newLightningAddress();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'new-lightning-address-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'new-lightning-address2': async (m, ws) => {
    try {
      const result = await wallet.newLightningAddress2();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'new-lightning-address2-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'fund-lightning-node': async (m, ws) => {
    try {
      const { address, blocks } = m.data;
      if (!address || !blocks) {
        throw new Error('address and blocks are required');
      }
      const result = await wallet.fundLightningNode(address, blocks);
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'fund-lightning-node-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'fund-lightning-node2': async (m, ws) => {
    try {
      const { address, blocks } = m.data;
      if (!address || !blocks) {
        throw new Error('address and blocks are required');
      }
      // same bitcoin funding helper; wallet.fundLightningNode uses bitcoin-cli
      const result = await wallet.fundLightningNode(address, blocks);
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'fund-lightning-node2-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'list-lightning-funds': async (m, ws) => {
    try {
      const result = await wallet.listLightningFunds();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'list-lightning-funds-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'list-lightning-funds2': async (m, ws) => {
    try {
      const result = await wallet.listLightningFunds2();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'list-lightning-funds2-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'getinfo-lightning': async (m, ws) => {
    try {
      const result = await wallet.getInfoLightning();
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'getinfo-lightning-response', 
        data: result 
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'error', 
        data: { error: err.message || String(err) } 
      }));
    }
  },

  'getinfo-lightning2': async (m, ws) => {
    try {
      const result = await wallet.getInfoLightning2();
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'getinfo-lightning2-response', 
        data: result 
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'error', 
        data: { error: err.message || String(err) } 
      }));
    }
  },

  'connect-peer': async (m, ws) => {
    try {
      // First, get the info of node 2 to find its ID and port
      const node2Info = await wallet.getInfoLightning2();
      const peerId = node2Info.id;
      const port = (node2Info.binding && node2Info.binding[0] && node2Info.binding[0].port) || 9736;

      // Now, connect from node 1 to node 2
      const result = await wallet.connectPeer(peerId, '127.0.0.1', port);
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'connect-peer-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'connect-node1-node3': async (m, ws) => {
    try {
      const node3Info = await wallet.getInfoLightning3();
      const peerId = node3Info.id;
      const port = (node3Info.binding && node3Info.binding[0] && node3Info.binding[0].port) || 9737;
      const result = await wallet.connectPeer(peerId, '127.0.0.1', port);
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'connect-node1-node3-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'connect-node2-node3': async (m, ws) => {
    try {
      const node3Info = await wallet.getInfoLightning3();
      const peerId = node3Info.id;
      const port = (node3Info.binding && node3Info.binding[0] && node3Info.binding[0].port) || 9737;
      // This should be called from node 2, so we need a new wallet method or adjust existing.
      // Assuming a new method `connectPeer2` for clarity.
      const result = await wallet.connectPeer2(peerId, '127.0.0.1', port);
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'connect-node2-node3-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'list-peers': async (m, ws) => {
    try {
      const result = await wallet.listPeers();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'list-peers-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },
  //-------------
   'open-channel': async (m, ws) => {
    try {
      const { satoshis } = m.data;
      if (!satoshis) {
        throw new Error('satoshis amount is required');
      }

      // Get Node 2's ID so Node 1 can open a channel to it
      const node2Info = await wallet.getInfoLightning2();
      const peerId = node2Info.id;

      // Open channel from node 1 -> node 2
      const result = await wallet.openChannel(peerId, satoshis);

      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'open-channel-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'open-channel2': async (m, ws) => {
    try {
      const { satoshis } = m.data;
      if (!satoshis) {
        throw new Error('satoshis amount is required');
      }

      // Get Node 1's ID so Node 2 can open a channel to it
      const node1Info = await wallet.getInfoLightning();
      const peerId = node1Info.id;

      // Open channel from node 2 -> node 1
      const result = await wallet.openChannel2(peerId, satoshis);

      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'open-channel2-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },
//---------
  //-------------
  'list-channels': async (m, ws) => {
    try {
      const result = await wallet.listChannels();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'list-channels-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'list-funds-channel': async (m, ws) => {
    try {
      const result = await wallet.verifyChannelFunds();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'list-funds-channel-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },
  //-------------

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//  Lightning Invoice + Payment Operations
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

'create-invoice-node1': async (m, ws) => {
  try {
    const { amount, label, description } = m.data;
    const result = await wallet.createInvoiceNode1(amount, label, description);
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'create-invoice-node1-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'pay-invoice-node1': async (m, ws) => {
  try {
    const { bolt11 } = m.data;
    const result = await wallet.payInvoiceNode1(bolt11);
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'pay-invoice-node1-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'list-invoices-node1': async (m, ws) => {
  try {
    const result = await wallet.listInvoicesNode1();
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'list-invoices-node1-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'list-pays-node1': async (m, ws) => {
  try {
    const result = await wallet.listPaysNode1();
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'list-pays-node1-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

// ------------------------------------------------------------
// Node 2
// ------------------------------------------------------------

'create-invoice-node2': async (m, ws) => {
  try {
    const { amount, label, description } = m.data;
    const result = await wallet.createInvoiceNode2(amount, label, description);
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'create-invoice-node2-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'pay-invoice-node2': async (m, ws) => {
  try {
    const { bolt11 } = m.data;
    const result = await wallet.payInvoiceNode2(bolt11);
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'pay-invoice-node2-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'list-invoices-node2': async (m, ws) => {
  try {
    const result = await wallet.listInvoicesNode2();
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'list-invoices-node2-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'list-pays-node2': async (m, ws) => {
  try {
    const result = await wallet.listPaysNode2();
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'list-pays-node2-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},
  // ----------------------------------------------
  // Lightning Node 3 basic operations
  // ----------------------------------------------
  'getinfo-lightning3': async (m, ws) => {
    try {
      const result = await wallet.getInfoLightning3();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'getinfo-lightning3-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'new-lightning-address3': async (m, ws) => {
    try {
      const result = await wallet.newLightningAddress3();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'new-lightning-address3-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'fund-lightning-node3': async (m, ws) => {
    try {
      const { address, blocks } = m.data;
      if (!address || !blocks) throw new Error('address and blocks are required');
      const result = await wallet.fundLightningNode(address, blocks);
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'fund-lightning-node3-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'list-lightning-funds3': async (m, ws) => {
    try {
      const result = await wallet.listLightningFunds3();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'list-lightning-funds3-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'list-peers3': async (m, ws) => {
    try {
      const result = await wallet.listPeers3();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'list-peers3-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'open-channel3': async (m, ws) => {
    try {
      const { satoshis } = m.data;
      if (!satoshis) throw new Error('satoshis amount is required');

      // For setup: Node 3 opens a channel with Node 2
      const node3Info = await wallet.getInfoLightning3();
      const peerId = node3Info.id; // This should be node 3's ID to send to node 2's channel

      const result = await wallet.openChannel2(peerId, satoshis);
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'open-channel3-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },
// ------------------------------------------------------------
// ------------------------------------------------------------
// Lightning Node 3 - Invoice + Payment + Multi-hop Route Operations
// ------------------------------------------------------------

'create-invoice-node3': async (m, ws) => {
  try {
    const { amount, label, description } = m.data;
    const result = await wallet.createInvoiceNode3(amount, label, description);
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'create-invoice-node3-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'pay-invoice-node3': async (m, ws) => {
  try {
    const { bolt11 } = m.data;
    const result = await wallet.payInvoiceNode3(bolt11);
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'pay-invoice-node3-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'list-invoices-node3': async (m, ws) => {
  try {
    const result = await wallet.listInvoicesNode3();
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'list-invoices-node3-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'list-pays-node3': async (m, ws) => {
  try {
    const result = await wallet.listPaysNode3();
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'list-pays-node3-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'get-route-node1-to-node3': async (m, ws) => {
  try {
    const { destId, msat } = m.data;
    const node3Info = await wallet.getInfoLightning3();
    const peerId = node3Info.id; // This should be node 3's ID 
    // if (!destId) throw new Error('destId is required');
    const result = await wallet.getRouteNode1to3(peerId, msat || 1000);
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'get-route-node1-to-node3-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

'list-forwards-node2': async (m, ws) => {
  try {
    const result = await wallet.listForwardsNode2();
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'list-forwards-node2-response',
      data: result
    }));
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({
      ...response,
      type: 'error',
      data: { error: err.message || String(err) }
    }));
  }
},

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// END Lightning Invoice + Payment Operations
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  'getinfo-bitcoin': async (m, ws) => {
    try {
      const result = await wallet.getInfoBitcoin();
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'getinfo-bitcoin-response', 
        data: result 
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'error', 
        data: { error: err.message || String(err) } 
      }));
    }
  },

  subscribe: async (m, ws) => {
    const { data } = m;
    const ev = data && data.event ? data.event : 'node-status';
    subscribers[ev] = subscribers[ev] || new Set();
    subscribers[ev].add(ws);
    const response = createResponse(m);
    ws.send(JSON.stringify({ 
      ...response,
      type: 'subscribe-response', 
      data: { subscribed: ev } 
    }));
  },

  unsubscribe: async (m, ws) => {
    const { data } = m;
    const ev = data && data.event ? data.event : 'node-status';
    if (subscribers[ev]) subscribers[ev].delete(ws);
    const response = createResponse(m);
    ws.send(JSON.stringify({ 
      ...response,
      type: 'unsubscribe-response', 
      data: { unsubscribed: ev } 
    }));
  },

  resume: async (m, ws) => {
    const { data } = m;
    const sinceHead = data && data.sinceHead;
    let toSend;
    if (sinceHead) {
      const sinceMsg = persisted.find((p) => p.head[2] === sinceHead[2]);
      const sinceTs = sinceMsg ? sinceMsg.ts : 0;
      toSend = persisted.filter((p) => p.ts > sinceTs);
    } else {
      toSend = persisted;
    }
    
    toSend.forEach((item) => {
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'resume-item', 
        data: item.data || item 
      }));
    });

    const finalResponse = createResponse(m);
    ws.send(JSON.stringify({ 
      ...finalResponse,
      type: 'resume-complete', 
      data: { count: toSend.length } 
    }));
  }
};

function fail(m, ws) {
  const response = createResponse(m);
  ws.send(JSON.stringify({ 
    ...response,
    type: 'fail', 
    data: { error: 'unknown type: ' + m.type } 
  }));
}

function handleMessage(ws, m) {
  try {
    (on[m.type] || fail)(m, ws);
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({ 
      ...response,
      type: 'error', 
      data: { error: err.message || String(err) } 
    }));
  }
}

setInterval(async () => {
  try {
    const [bInfo, lInfo, lInfo2] = await Promise.all([
      wallet.getInfoBitcoin(),
      wallet.getInfoLightning(),
      wallet.getInfoLightning2(),

async function handleMessage(ws, m) {
  const { type, head, refs, data } = m;

  try {
    switch (type) {
      case 'echo':
        ws.send(JSON.stringify({ head, refs, type: 'echo-response', data }));
        break;

      case 'getinfo-lightning': {
        const result = await wallet.getInfoLightning();
        ws.send(JSON.stringify({ head, refs, type: 'getinfo-lightning-response', data: result }));
        break;
      }

      case 'getinfo-bitcoin': {
        const result = await wallet.getInfoBitcoin();
        ws.send(JSON.stringify({ head, refs, type: 'getinfo-bitcoin-response', data: result }));
        break;
      }

      case 'subscribe': {
        const ev = data && data.event ? data.event : 'node-status';
        subscribers[ev] = subscribers[ev] || new Set();
        subscribers[ev].add(ws);
        ws.send(JSON.stringify({ head, refs, type: 'subscribe-response', data: { subscribed: ev } }));
        break;
      }

      case 'unsubscribe': {
        const ev = data && data.event ? data.event : 'node-status';
        if (subscribers[ev]) subscribers[ev].delete(ws);
        ws.send(JSON.stringify({ head, refs, type: 'unsubscribe-response', data: { unsubscribed: ev } }));
        break;
      }

      case 'resume': {
        const sinceHead = data && data.sinceHead;
        let toSend;
        if (sinceHead) {
          const sinceMsg = persisted.find((p) => p.head === sinceHead);
          const sinceTs = sinceMsg ? sinceMsg.ts : 0;
          toSend = persisted.filter((p) => p.ts > sinceTs);
        } else {
          toSend = persisted;
        }
        toSend.forEach((item) => {
          ws.send(JSON.stringify({ head: item.head, refs: item.refs, type: 'resume-item', data: item.data || item }));
        });
        ws.send(JSON.stringify({ head, refs, type: 'resume-complete', data: { count: toSend.length } }));
        break;
      }

      default:
        ws.send(JSON.stringify({ head, refs, type: 'error', data: { error: 'unknown type: ' + type } }));
    }
  } catch (err) {
    ws.send(JSON.stringify({ head, refs, type: 'error', data: { error: err.message || String(err) } }));
  }
}


setInterval(async () => {
  try {
    const [bInfo, lInfo] = await Promise.all([
      wallet.getInfoBitcoin(),
      wallet.getInfoLightning(),
    ]);
    const payload = {
      timestamp: Date.now(),
      bitcoin: bInfo,
      lightning: lInfo,
      lightning2: lInfo2,
    };
    const s = Array.from(subscribers['node-status'] || []);
    s.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const msg = { 
          head: createMessageHead(SERVER_ID, '*', messageCounter++),
          refs: {},  
          type: 'node-status', 
          data: payload 
        };
        const head = 'srv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        const msg = { head, refs: null, type: 'node-status', data: payload };
        ws.send(JSON.stringify(msg));
        persistMessage(msg);
      }
    });
  } catch (e) {
    console.error('node-status ticker error', e);
  }
}, 10000);


setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
