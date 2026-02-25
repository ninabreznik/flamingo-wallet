# 06_Channels_Tab.md

## 1. Executive Summary

The Channels Tab allows the user to construct their own Lightning Network topology. In the Lightning protocol, you cannot simply send money to an IP address; you must first establish a Peer Connection (networking layer) and then lock funds into a Payment Channel (financial layer).


## 2. User Interface (UI) Architecture

The interface acts as a "Liquidity Wizard," breaking the complex process of channel management into sequential steps.

### Step 0: Fund Node

Before opening a channel, the Lightning node's internal wallet must hold on-chain Bitcoin.

- **Action:** Get Funding Address button.
- **Display:** Shows a specialized Bech32 (SegWit) address. This is distinct from the main wallet address in the Bitcoin tab, ensuring funds are specifically available for channel locking.

### Step 0.5: Network Search

- **Input:** A text box to search for nodes by Alias (e.g., "Alice") or Node ID (e.g., "03a...").
- **Output:** A dynamic result list. Each result displays the node's name, ID, and a smart Connect button.
- **Visual Feedback:** If a node has a known public address, the Connect button is active. If the address is unknown (common in private graphs), it shows a warning "Connect (Need Addr)".

### Step 1: Connect Peer

- **Input:** The "Connection String" field (Pubkey@Host:Port). This is often auto-filled by clicking a search result.
- **Action:** Connect Peer initiates the encrypted P2P handshake.
- **Verification:** List Connected Peers allows the user to confirm the connection is active before risking funds.

### Step 2: Open Channel

- **Input:** Amount (sats). The capacity of the channel to be opened.
- **Action:** Fund Channel broadcasts the funding transaction to the blockchain.

## 3. Backend Integration (daemon.js)

This module wraps the low-level networking RPCs of Core Lightning.

#### API 1: lightning_newaddress

#### API 2: network_node_search

#### API 3: connect_node

#### API 4: list_peers

#### API 5: fund_channel

## 5. Data Flow Scenario: Connecting to "Alice"

This scenario demonstrates how the Search and Connect features work together.

1. **User Action:** User types "Ali" into the Network Search box and clicks Search.
2. **Backend:** network_node_search runs. It finds a node with alias "Alice" (Node 6).
3. **Enrichment:** The backend sees "Alice" is actually Node 6. It injects the address 127.0.0.1:9737 into the result.
4. **Frontend Update:** A row appears: "Alice (NodeID: 03af...)" with a grey Connect button.
5. **User Action:** User clicks the Connect button in the search result.
6. **Frontend Logic:** The app auto-fills the "Peer ID" input field with 03af...@127.0.0.1:9737 and scrolls down.
7. **User Action:** User clicks Connect Peer.
8. **Backend:** Establishes the TCP connection.
9. **User Action:** User enters "100000" and clicks Fund Channel.
10. **Backend:** Broadcasts the funding TX.
11. **Result:** The user has now successfully opened a channel to Alice.

### Video Explanation : https://youtu.be/xLK0bH4PyQA