// lib/web.js
const wsUrl = 'ws://localhost:8080';
const name = 'frontend';
const by = name;
const to = 'backend';
let mid = 0;
const wait = {};

const ws = new WebSocket(wsUrl);
ws.onopen = () => {
  console.log('WS open to', wsUrl);
  send('lightning-listfunds', {}, (m) => {
    console.log('backend response', m);
    const el = document.getElementById('out');
    if (el) el.textContent = JSON.stringify(m, null, 2);
  });
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

function send(type, data, handler) {
  const head = [by, to, mid++];
  const msg = { head, type, data };
  wait[head.join(',')] = handler;
  ws.send(JSON.stringify(msg));
}
