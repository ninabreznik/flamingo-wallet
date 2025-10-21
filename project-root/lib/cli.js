// lib/cli.js
import WebSocket from 'ws';

const url = 'ws://localhost:8080';
const name = 'frontend';
const by = name;
const to = 'backend';
let mid = 0;
const wait = new Map();

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('connected to backend at', url);
  send('lightning-listfunds', {}, (m) => {
    console.log('--- response received ---');
    console.log(JSON.stringify(m, null, 2));
    ws.close();
  });
});

ws.on('message', (raw) => {
  try {
    const m = JSON.parse(raw.toString());
    const cause = m.refs?.cause;
    const key = cause ? cause.join(',') : null;
    if (key && wait.has(key)) {
      const h = wait.get(key);
      wait.delete(key);
      return h(m);
    }
    console.log('unsolicited message:', JSON.stringify(m));
  } catch (err) {
    console.error('invalid message', err.message);
  }
});

function send(type, data, handler) {
  const head = [by, to, mid++];
  const msg = { head, type, data };
  wait.set(head.join(','), handler);
  ws.send(JSON.stringify(msg));
}
