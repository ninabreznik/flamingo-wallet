# Channel Management Module

## Overview

This module governs the networking infrastructure of the Lightning node. It provides tools to manage **Peers** (network connections) and **Channels** (financial connections). It includes low-level commands for manual channel management as well as higher-level convenience functions to simplify liquidity setup, such as one-click connections to the Flamingo Hub or requesting inbound capacity.

---

## 1. `list_peers`

### Description

Retrieves a list of all Lightning nodes currently connected to the user’s node via the peer-to-peer network. This API wraps the `listpeers` RPC command.

A **peer** represents a network connection only (no funds involved) and is a prerequisite for opening a channel. The response includes diagnostic details useful for troubleshooting connectivity issues.

### Parameters

- `userId` (`string`, optional)
  - Node to query
  - Defaults to `node4`

### Returns

- `data` (`array`)
  - List of peer objects containing:
    - `id`
    - `netaddr`
    - `connected`
    - Additional peer metadata

---

## 2. `connect_node`

### Description

Establishes a peer-to-peer connection with another Lightning node without transferring any funds. This is the mandatory first step before opening a payment channel.

The function accepts a full node address and initiates the Lightning handshake. It returns success if the connection is established or parses common connection errors (e.g., already connected, connection refused).

### Parameters

- `peer_address` (`string`)
  - Full node address in the format:
    
    ```
    <node_id>@<host>:<port>
    ```

### Returns

- `data` (`object`)
  - Information about the newly connected peer (including Node ID)

---

## 3. `fund_channel`

### Description

Converts a peer connection into a financial relationship by opening a Lightning payment channel. This operation locks on-chain Bitcoin into a 2-of-2 multisig contract shared with the peer.

The API broadcasts a funding transaction to the blockchain. The channel becomes usable only after the transaction receives sufficient confirmations.

### Parameters

- `peer_id` (`string`)
  - Node ID of the remote peer

- `amount_sats` (`number | string`)
  - Amount to fund the channel with, in satoshis
  - Can be set to `"all"` to spend the entire confirmed wallet balance

### Returns

- `data` (`object`)
  - `txid` — Funding transaction ID
  - `channel_id` — Newly created channel identifier

---

## 4. `lightning-listfunds`

### Description

Low-level diagnostic API that exposes the complete financial state of the Lightning node by calling the `listfunds` RPC.

It returns two raw datasets:

- **outputs** — On-chain Bitcoin UTXOs
- **channels** — Off-chain Lightning channel states

Developers use this API to inspect granular details such as UTXO confirmations, channel lifecycle states (e.g., `CHANNELD_AWAITING_LOCKIN`), and exact funding amounts.

### Parameters

- `nodeId` (`string`, optional)
  - Node to query

### Returns

- `data` (`object`)
  - `outputs` array
  - `channels` array

---

## 5. `open_channel_flamingo`

### Description

Convenience shortcut designed to simplify onboarding and liquidity setup. This function automatically:

1. Resolves the Flamingo Hub (**node5**) from the network graph
2. Establishes a peer connection
3. Opens a channel with a default capacity

This creates **outbound liquidity**, allowing the user to send payments once the channel confirms.

### Parameters

- `amount_sats` (`number`, optional)
  - Custom channel size
  - Default: `200_000` sats

### Returns

- `message`
  - Success confirmation

- `txid`
  - Funding transaction ID

- `note`
  - Reminder to mine blocks (Regtest) to activate the channel

---

## 6. `request_inbound_liquidity`

### Description

Solves the **inbound capacity** problem (inability to receive funds). This API simulates a liquidity provider service where the Flamingo Hub (**node5**) opens a channel *to* the user.

In the Regtest environment, the function also mines 6 blocks automatically to instantly confirm the channel. The result is immediate receiving capacity equal to the channel size, enabling invoice-based payments.

### Parameters

- `amount_sats` (`number`)
  - Amount of inbound liquidity to request
  - Default: `1_000_000` sats

### Returns

- `inbound_added`
  - Amount of receiving capacity added

- `txid`
  - Funding transaction ID from the Hub

---

## 7. `get_liquidity_report`

### Description

Performs a health check on the node’s channel liquidity. The function iterates through all active channels and calculates:

- **Outbound capacity** — Funds available to send
- **Inbound capacity** — Space available to receive funds

Based on these values, it applies business logic to return a liquidity status used by the frontend to display warnings or guidance.

Possible health states:

- `EMPTY` — No channels exist
- `LOW_INBOUND` — Cannot receive payments
- `LOW_OUTBOUND` — Cannot send payments
- `HEALTHY` — Balanced liquidity

### Parameters

- None

### Returns

- `outbound_sats`
  - Total spendable balance

- `inbound_sats`
  - Total receivable capacity

- `health` (`object`)
  - `status`
  - `message`
  - `action_required` (`boolean`)

 ### Video Explanation : https://youtu.be/LmDrHDch3Yc

