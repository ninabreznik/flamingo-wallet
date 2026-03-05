# 01_Overview_Tab

## 1. Executive Summary

The Overview Tab serves as the **"Mission Control"** for the Flamingo Wallet. It is the default landing screen that provides the user with an immediate snapshot of the node's health, identity, and financial status.

Because Flamingo Wallet is designed as a development and simulation tool, this tab also houses the **Account Switcher**. This unique feature allows the operator to instantly toggle control between the **User Wallet (node4)**, the **Liquidity Hub (node5)**, and the **Merchant Node (node6)** without restarting the server.

---

## 2. User Interface (UI) Architecture

The dashboard is divided into three primary interactive zones:

### A. The Header & Status Bar

- **Connection Status:**  
  A text indicator (`#status`) that changes color (**Green / Red**) based on the WebSocket connection state.

- **Profile Icon:**  
  A circular button (top-right) displaying the initial of the current active node (e.g., **"N"** for Node 4). Clicking this triggers the **Account Drawer**.

---

### B. Node Information Card

**Purpose:** Identifies *“Who am I?”* in the network.

**Display Fields:**

- **Alias:** The friendly name of the node (e.g., `flaming-wallet`)
- **Node ID:** The cryptographic public key (Pubkey)
- **Version:** The version of the Core Lightning (CLN) backend
- **Network:** The Bitcoin network (Regtest / Testnet / Mainnet)

**Action:**

- **Refresh Info** button to pull the latest metadata.

---

### C. Balances Card

**Purpose:** Provides a unified financial view, separating **On-Chain** and **Off-Chain** funds.

**Components:**

- **LN Funds (Off-Chain):** Displays total capacity in **Satoshis**
- **On-Chain (BTC):** Displays confirmed wallet balance in **BTC**

**Actions:**

- **Check LN Funds**
- **Check On-Chain Balance**

These allow independent refreshing of each data source.

---

## 3. Frontend Logic (`web.js`)

The frontend relies on a **persistent WebSocket connection** to drive these UI elements.

### Initialization: `connect()`

- On page load, `connect()` establishes a link to:
  ```
  ws://localhost:8080
  ```

- **On Open:** Updates the status text to **"✅ Connected"** in green.
- **On Close:** Updates the status to **"❌ Disconnected"** in red and attempts reconnection every **2 seconds**.
- **On Message:** Listens for responses (`mid` matching) and push notifications (e.g., `payment_received`).

---

### Global Context: `window.currentCtxUserId`

This global variable is the **“State of Truth”** for the frontend.

- Default value: `'node4'`
- All API calls (creating invoices, checking balances, etc.) read this variable to determine which backend node to target.

---

### The Account Drawer Logic

#### `toggleDrawer()`
Controls CSS classes to slide the sidebar **in/out** from the right side of the screen.

#### `renderAccountSwitcher()`
When the drawer opens:

- Sends command: `list_all_accounts` to the backend
- Renders cards displaying:
  - Node Alias & Role (**Wallet / Hub / Merchant**)
  - **Online / Offline** status dot
  - Current balance summary

#### `switchAccount(nodeId)`

When a user clicks a card:

1. Updates `window.currentCtxUserId`
2. Closes the drawer
3. **Auto-Refresh Triggers:**
   - `btn-getinfo.click()`
   - `btn-listfunds.click()`
   - `btn-refresh-all-hist.click()`

This updates the dashboard with the new node’s data.

---

## 4. Backend Integration (`daemon.js`)

The Overview tab interacts with **four backend endpoints**.

---

### API 1: `list_all_accounts`

**Trigger:** Opening the Profile / Account Drawer

**Backend Logic:**

- Hardcoded array of nodes: `node4`, `node5`, `node6`
- Performs a **Health Check** on each node:
  - Calls `lightning_getinfo`
  - Calls `get_ln_balance`

**Return Data Example:**

```json
[
  { "id": "node4", "role": "Wallet", "status": "online", "balance": { "sats": 50000 } },
  { "id": "node5", "role": "Hub", "status": "online", "balance": { "sats": 2000000 } }
]
```

---

### API 2: `lightning-getinfo`

**Trigger:** Clicking **Refresh Info** (or auto-load on switch)

**Backend Logic:**

- Executes Core Lightning RPC command: `getinfo`

**Key Detail:**

- The response includes the **binding array (IP addresses)**.
- Frontend uses this to populate the **Connect String**:
  ```
  id@host:port
  ```

---

### API 3: `get_ln_balance`

**Trigger:** Clicking **Check LN Funds**

**Backend Logic:**

- Calls `listfunds` RPC
- Sums:
  - Confirmed UTXOs (On-Chain Outputs)
  - `our_amount_msat` of active channels

**Result:** Total **Spending Capacity**

---

### API 4: `get_btc_balance`

**Trigger:** Clicking **Check On-Chain (BTC) Balance**

**Backend Logic:**

- Calls Bitcoin Core RPC: `getbalance`

**Distinction:**

- Strictly **Layer 1 wallet balance**
- Separate from Lightning node internal wallet

---

## 5. Data Flow Scenario: Switching Accounts

### Step-by-Step Lifecycle

**User Action:**  
User clicks the blue **"N"** profile icon.

**Frontend:**
- `toggleDrawer()` fires
- `renderAccountSwitcher()` sends:
  ```
  type: 'list_all_accounts'
  ```

**Backend:**
- `daemon.js` polls nodes 4, 5, and 6
- Sends compiled JSON status list back

**Frontend:**
- Drawer populates with 3 cards
- User clicks **"Flamingo Hub"**

**Frontend Logic:**
- `window.currentCtxUserId` → `'node5'`
- Drawer closes
- Auto-trigger:
  ```
  btn-getinfo.click()
  ```

**Backend:**
- Receives `lightning-getinfo` with payload:
  ```json
  { "nodeId": "node5" }
  ```

**Frontend Update:**
- Node Info card updates to:
  ```
  Alias: Flamingo Hub
  ```
- Confirms user now controls the **Hub**

### Video Explanation : https://youtu.be/fS7X1uzXkD4