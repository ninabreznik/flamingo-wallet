const { WebSocketServer } = require('ws')
const b4a = require('b4a')

async function start () {
  document.querySelector('button.refresh').addEventListener('click', (e) => { 
    e.stopPropagation()
    location = location 
  })
  console.log('Hello Pear', {Pear})
  // console.log({worker: Pear.config.links.worker})
  // const pipe = Pear.worker.run(Pear.config.links.worker)

  // START CORE_LIGHTNING WORKER
  const pipe = start_worker('./core-lightning/index.js', 'core lightning node')

  const wss = new WebSocketServer({ port: 8080 });
  wss.on('connection', async (ws) => {
    console.log('connected')
    ws.on('message', function message(data) {
      console.log('received: %s', data)
      const res = {
        type: 'message',
        text: 'Nice to meet you'
      }
      ws.send(JSON.stringify(res))
    });
  });
  
  const wsUri = 'ws://localhost:8080'

  // console.log('request list of wallets')
  // pipe.write(JSON.stringify({ type: 'listwallets' }))

  const wss_btn = document.querySelector('button.wss')
  wss_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    wss_btn.innerHTML = `Copied ${wsUri}`
    navigator.clipboard.writeText(wsUri);
  })

  const new_wallet_btn = document.querySelector('button.new-wallet')
  new_wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const val = document.querySelector('input.new-wallet').value
    pipe.write(JSON.stringify({ type: 'new_wallet', data: `${val}` }))
  })
  
  const load_wallet_btn = document.querySelector('button.load-wallet')
  load_wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const val = document.querySelector('input.load-wallet').value
    pipe.write(JSON.stringify({ type: 'load_wallet', data: `${val}` }))
  })
  
  const send_wallet_btn = document.querySelector('button.send-btc-wallet')
  send_wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const amount = document.querySelector('input.send-btc-amount-wallet').value
    const address = document.querySelector('input.send-btc-address-wallet').value
    const wallet = document.querySelector('.send-btc-wallets').selectedOptions[0].value
    const data = { amount, address, wallet }
    pipe.write(JSON.stringify({ type: 'send btc', data }))
  })

  const receive_btc_wallets = document.querySelector('.receive-btc-wallets')
  receive_btc_wallets.addEventListener('change', (e) => { 
    e.stopPropagation()
    const selection = document.querySelector('.receive-btc-wallets').selectedOptions[0].value
    pipe.write(JSON.stringify({ type: 'selected', data: selection }))
    const addr_dropdown = document.querySelector('.receive-dropdown-address')
    addr_dropdown.style.display = 'inline'
  })

}

start()

function kill_processes (pipe) {
  pipe.destroy()
}

function start_worker (path, name) {
  const pipe = Pear.worker.run(path)
  pipe.on('data', (data) => {
    console.log(`data from ${name}:`, b4a.toString(data, 'utf-8'))
    parser(data)
  })
  pipe.on('err', (err) => {
    console.log(`err from ${name}:`, err)
  })
  process.on('SIGINT', () => kill_processes(pipe))
  process.on('SIGTERM', () => kill_processes(pipe))
  process.on('exit', () => kill_processes(pipe))

  return pipe
}

function parser (msg) {
  msg = b4a.toString(msg, 'utf-8')
  msg = JSON.parse(msg)
  console.log({type: msg.type})
  if (msg.type === 'wallets') {
    const data = JSON.parse(msg.data)
    console.log('wallets list', data)
    let send_btc_wallets = document.querySelector('.send-btc-wallets')
    let receive_btc_wallets = document.querySelector('.receive-btc-wallets')

    for (const wallet of data) {
      const el_1 = document.createElement('option')
      el_1.innerHTML = `<option>${wallet}</option>`
      send_btc_wallets.appendChild(el_1)
      const el_2 = document.createElement('option')
      el_2.innerHTML = `<option>${wallet}</option>`
      receive_btc_wallets.appendChild(el_2)
    }
  }
  else if (msg.type === 'new wallet') {
    const data = JSON.parse(msg.data)
    // send
    let send_btc_wallets = document.querySelector('.send-btc-wallets')
    const el_1 = document.createElement('option')
    el_1.innerHTML = `<option>${data.name}</option>`
    send_btc_wallets.appendChild(el_1)
    // receive
    let receive_btc_wallets = document.querySelector('.receive-btc-wallets')
    const el_2 = document.createElement('option')
    el_2.innerHTML = `<option>${data.name}</option>`
    receive_btc_wallets.appendChild(el_2)
  }
  else if (msg.type === 'load wallet') {
    const data = JSON.parse(msg.data)
    //send
    const options_1 = document.querySelectorAll('.send-btc-wallets')
    const len_1 = options_1.length
    for (var i = 0; i < len_1; i++) {
      if (options_1[i].value === data.name) return
    }
    let send_btc_wallets = document.querySelector('.send-btc-wallets')
    const el_1 = document.createElement('option')
    el_1.innerHTML = `<option>${data.name}</option>`
    send_btc_wallets.appendChild(el_1)
    // receive
    const options_2 = document.querySelectorAll('.receive-btc-wallets')
    const len_2 = options_2.length
    for (var i = 0; i < len_2; i++) {
      if (options_2[i].value === data.name) return
    }
    let receive_btc_wallets = document.querySelector('.receive-btc-wallets')
    const el_2 = document.createElement('option')
    el_2.innerHTML = `<option>${data.name}</option>`
    receive_btc_wallets.appendChild(el_2)
  }
  else if (msg.type === 'addresses') {
    const addr_dropdown = document.querySelector('.receive-dropdown-address')
    const arr = []
    for (const addr of JSON.parse(msg.data)[0]) {
      const el = document.createElement('option')
      el.innerHTML = `<option>${addr[0]}, (${addr[1]} BTC)</option>`
      console.log({ addr: addr[0], balance: addr[1] })
      arr.push(el)
    }
    addr_dropdown.replaceChildren(...arr)
    // console.log({data})
  }
}