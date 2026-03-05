# Wallet Management Module

## Overview

This module handles the foundational security and identity operations of the Flamingo Wallet. It allows users to initialize a node from a seed phrase, monitor the status of the ecosystem participants (Wallet, Hub, and Merchant), and perform critical disaster recovery operations such as backups and emergency fund sweeping.

---

## 1. `initialize_node_wallet`

### Description

This is the primary setup function for the wallet. It configures the underlying Core Lightning node (**node4**) by generating or importing a cryptographic identity.

When called, the function:

1. Stops the Lightning node.
2. Completely wipes the existing data directory to ensure a clean slate.
3. Accepts a BIP39 mnemonic (seed phrase), either user-provided or newly generated.
4. Deterministically derives a 32-byte `hsm_secret` from the mnemonic.
5. Writes the derived secret into the node configuration.
6. Restarts the node with the new identity.

This guarantees that the node will always produce the same wallet addresses and keys when initialized with the same seed phrase.

### Parameters

- `action` (`string`)
  - Must be one of:
    - `"create"` — Generates a new seed phrase
    - `"recover"` — Uses a provided seed phrase

- `mnemonic` (`string`, optional)
  - A 12-word BIP39 seed phrase
  - **Required** if `action` is set to `"recover"`

### Returns

- `mnemonic`
  - The seed phrase used to initialize the wallet

- `nodeId`
  - The public key (Node ID) of the newly initialized wallet

---

## 2. `list_all_accounts`

### Description

This API acts as a system-wide dashboard for the Flamingo ecosystem. It provides a unified status report for the three core actors:

- **Wallet** (node4)
- **Liquidity Hub** (node5)
- **Merchant** (node6)

Rather than only reporting the user’s balance, this function iterates over the hardcoded node list and attempts to retrieve:

- Connection status via `getinfo`
- Financial balances via `listfunds`

This enables the frontend to clearly display which parts of the simulated network are online and how much liquidity is available at each layer.

### Parameters

- None

### Returns

- An array of objects, where each object contains:

  - `role`
    - The node’s function (`Wallet`, `Hub`, or `Merchant`)

  - `status`
    - `"online"` or `"offline"`

  - `balance`
    - An object containing:
      - `sats` — Balance in satoshis
      - `btc` — Balance in bitcoin

---

## 3. `export_scb`

### Description

This function retrieves the **Static Channel Backup (SCB)**, which is required to recover off-chain funds if the node crashes or its database becomes corrupted.

The API:

1. Reads the `emergency.recover` binary file from the node’s Regtest directory.
2. Converts the binary contents into a hexadecimal string.

Unlike traditional backups, this file is:

- Small in size
- Automatically updated whenever a channel is created

The SCB must be stored securely and is required **alongside the seed phrase** to recover Lightning funds.

### Parameters

- None

### Returns

- `hex`
  - Hexadecimal string representation of the SCB file

- `filename`
  - Suggested filename: `emergency.recover`

---

## 4. `recover_funds`

### Description

This API executes Core Lightning’s **Data Loss Protection** protocol to restore funds from a failed or corrupted node.

The recovery process:

1. Stops the Lightning node.
2. Wipes the database **while preserving the `hsm_secret`**, ensuring the node identity remains intact.
3. Injects the provided SCB into the node’s data directory.
4. Restarts the node.
5. Automatically reconnects to known peers (node5 and node6).

Once reconnected, the peers force-close their channels, pushing funds back to the user’s on-chain wallet. In Regtest, blocks are mined automatically to confirm these closures.

### Parameters

- `hex_data` (`string`)
  - Hexadecimal string from a previously exported SCB

### Returns

- `message`
  - Status confirmation indicating peer reconnection and block confirmations

---

## 5. `emergency_drain`

### Description

This API functions as a **panic button**. It liquidates all wallet assets and transfers them to a secure cold-storage address.

The process is executed in two phases:

1. **Channel Closure**
   - Iterates through all active Lightning channels
   - Initiates a close on each channel
   - Waits (and mines blocks in Regtest) until all funds are settled on-chain

2. **On-chain Sweep**
   - Executes a `withdraw` command using the `all` flag
   - Transfers the entire Bitcoin balance to the provided backup address
   - Leaves the wallet completely empty

### Parameters

- `backup_address` (`string`)
  - Bitcoin address where all funds will be sent

### Returns

- `closed_channels`
  - Number of Lightning channels that were closed

- `withdraw_txid`
  - Transaction ID of the final sweep transaction


###  Video Explaination: https://youtu.be/CFQ2-dbvHBI?si=fFDxoe9qSSHII9e-&t=142
