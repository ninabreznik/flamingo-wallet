# 04_Bitcoin_Tab.md

## 1. Executive Summary

The Bitcoin Tab manages all Layer 1 (On-Chain) operations. While Lightning is the focus of Flamingo Wallet, a functional On-Chain wallet is required to fund channels and manage base assets.


## 2. User Interface (UI) Architecture

The interface is divided into two primary columns: Operations (Send/Receive) and Developer Tools.

### A. Receive Zone

- **Action:** Create Request button.
- **Input:** A description field (e.g., "Consulting Fee") to tag the incoming payment.
- **Output:** Displays the newly generated Bech32 address.
- **Smart Feature:** Quick Templates. Chips that allow one-click replication of common requests (e.g., "Coffee (0.005 BTC)").

### B. Pending Requests Widget (The Chat)

- **Purpose:** A "Chat-like" history of unpaid invoices.
- **Visuals:** Uses colored bubbles to indicate status:
  - Blue (⏳): Pending (Waiting for funds).
  - Yellow (⚠️): Partial Payment (Received less than requested).
  - Green (✅): Paid (Funds confirmed).

### C. Send Zone

- **Inputs:** Recipient Address, Amount (BTC), and Fee Rate (sats/vByte).
- **Validation:** A Validate Address button that visually turns Green/Red.
- **Convenience:** A Max button to sweep the entire wallet balance.

### D. Developer Tools (Regtest Only)

- **Mining:** Input for Blocks to Mine and a Mine Blocks button.



## 3. Backend Integration (daemon.js)

This tab bridges the UI to the Bitcoin Core (bitcoind) RPC interface.

#### API 1: bitcoin-newaddress

#### API 2: save_request


#### API 3: validate_btc_address

#### API 4: calculate_max_btc_send

#### API 5: send_btc_onchain

#### API 6: btc_mine_blocks_regtest


## 4. Data Flow Scenario: Sending "Max" Funds

This scenario illustrates the "Send Max" calculation flow.

1. **User Action:** User enters a destination address and clicks the Max button.
2. **Frontend:** Sends type: 'calculate_max_btc_send'.
3. **Backend:**
   - Queries bitcoind: Balance is 1.0 BTC.
   - Queries Fee: Rate is 0.00010000 BTC/kB.
   - Calculates: Transaction size approx 150 bytes. Fee ≈ 0.00001500 BTC.
   - **Result:** 0.99998500.
4. **Frontend Update:**
   - Sets Amount Input to 0.99998500.
   - Displays green text: "✅ Set to Max Sendable (Fee: 0.00001500)".
5. **User Action:** User clicks Send BTC On-Chain.
6. **Backend:** Broadcasts transaction. Returns TXID.
7. **User Action:** User goes to "Mining" section and clicks Mine 1 Block.
8. **Backend:** Generates block. The transaction is now confirmed.


### Video Explanation : https://youtu.be/co5bU0YtqEY