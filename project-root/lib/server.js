// lib/server.js
import { exec } from 'child_process';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const WS_PORT = process.env.WS_PORT || 8080;
const BITCOIN_RPCPORT = process.env.BITCOIN_RPCPORT || 18443;
const BITCOIN_RPCUSER = process.env.BITCOIN_RPCUSER || 'rpcuser';
const BITCOIN_RPCPASSWORD = process.env.BITCOIN_RPCPASSWORD || 'rpcpassword';
const LIGHTNING_DIR = process.env.LIGHTNING_DATADIR || './lightning-node';

// small exec helper
export function runCommand(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error((stderr || err.message || '').toString()));
      }
      resolve({ stdout: stdout ? stdout.toString() : '', stderr: stderr ? stderr.toString() : '' });
    });
  });
}

// API handler(s)
async function lightning_listfunds() {
  // Use lightning-cli and explicitly set --lightning-dir so it finds the socket/dir
  const cmd = `lightning-cli --network=regtest --lightning-dir=${LIGHTNING_DIR} listfunds`;
  try {
    const { stdout } = await runCommand(cmd);
    let parsed = null;
    try {
      parsed = JSON.parse(stdout);
    } catch (err) {
      return { status: 'error', log: stdout, error: 'parse_error:' + err.message };
    }
    const outputs = parsed.outputs || [];
    const satTotal = outputs.reduce((acc, o) => acc + (Number(o.value) || 0), 0);
    return { status: 'success', log: stdout, data: { raw: parsed, balance_sats: satTotal, balance_btc: (satTotal/1e8) + ' BTC' } };
  } catch (err) {
    return { status: 'error', log: err.message || String(err) };
  }
}

// central router
async function handleMessage(msg) {
  if (!msg || !msg.head || !msg.type) {
    throw new Error('invalid-message: missing head/type');
  }
  const [by, to, mid] = msg.head;
  const intent = msg.type;

  if (intent === 'lightning-listfunds') {
    return buildResponse({
      from: to,
      to: by,
      mid,
      cause: msg.head,
      type: intent,
      payload: await lightning_listfunds()
    });
  }

  // unknown
  return buildResponse({
    from: to,
    to: by,
    mid,
    cause: msg.head,
    type: intent,
    payload: { status: 'error', error: `unknown_type: ${intent}` }
  });
}

function buildResponse({ from, to, mid, cause, type, payload }) {
  return {
    head: [from, to, mid],
    refs: { cause },
    type: `${type}:response`,
    data: payload
  };
}

// WebSocket server
const wss = new WebSocketServer({ port: Number(WS_PORT) });
console.log(`Backend WS listening on ws://localhost:${WS_PORT}`);

wss.on('connection', (ws, req) => {
  console.log('client connected:', req.socket.remoteAddress);

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      console.error('bad-json', err.message);
      ws.send(JSON.stringify({ type: 'error', data: { error: 'invalid_json' } }));
      return;
    }

    try {
      const res = await handleMessage(msg);
      ws.send(JSON.stringify(res));
    } catch (err) {
      console.error('handleMessage error:', err.message);
      const fallback = {
        head: ['backend', msg?.head?.[0] || 'unknown', msg?.head?.[2] || 0],
        refs: { cause: msg?.head || null },
        type: `${msg?.type || 'unknown'}:response`,
        data: { status: 'error', error: err.message }
      };
      ws.send(JSON.stringify(fallback));
    }
  });

  ws.on('close', () => {
    console.log('client disconnected');
  });
});
