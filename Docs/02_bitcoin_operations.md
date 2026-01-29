# Bitcoin Operations Module

## Overview

This module manages all **Layer 1 Bitcoin** interactions. It interfaces directly with the `bitcoind` RPC to handle wallet balances, address generation, transaction broadcasting, and network fee estimation. It also includes utility functions for fiat conversion and Regtest mining simulation.

---

## 1. `bitcoin_newaddress`

### Description

Generates a new Bitcoin address for receiving on-chain payments. This API calls the Bitcoin Core RPC method `getnewaddress` to create a fresh destination within the node’s wallet.

The generated address can be shared with external senders to fund the wallet. In the current configuration, the address type defaults to the node’s standard format (typically SegWit / Bech32 on Regtest).

### Parameters

- None

### Returns

- `data` (`string`)
  - The newly generated Bitcoin address

---

## 2. `get_btc_balance`

### Description

Retrieves the total **confirmed on-chain Bitcoin balance** of the internal wallet. This function calls the `getbalance` RPC method on the Bitcoin node.

The returned value represents funds that are immediately spendable or available for opening Lightning channels.

### Parameters

- None

### Returns

- `btc` (`number`)
  - Wallet balance in Bitcoin (e.g., `1.50000000`)

---

## 3. `sync_wallet_balances`

### Description

A unified synchronization function designed to refresh the frontend UI. It performs two operations in parallel using `Promise.all`:

- Fetches the on-chain Bitcoin balance via `get_btc_balance`
- Fetches the off-chain Lightning balance via `get_ln_balance`

This ensures the user sees a complete and consistent snapshot of their net worth. If either request fails, the function throws an error to prevent mismatched data from being displayed.

### Parameters

- None

### Returns

- `btc_balance` (`number`)
  - On-chain Bitcoin balance

- `ln_balance_sats` (`number`)
  - Total off-chain capacity in satoshis (local channel balance + on-chain funds capable of being channeled)

---

## 4. `send_btc_onchain`

### Description

Constructs and broadcasts a Bitcoin transaction to the network. This API uses the `sendtoaddress` RPC command with the **Replace-By-Fee (RBF)** flag enabled, allowing the transaction fee to be increased later if needed.

It supports optional metadata storage and custom fee selection, handling the full lifecycle of sending funds from the internal wallet to an external address.

### Parameters

- `recipient_address` (`string`)
  - Destination Bitcoin address

- `amount_btc` (`string | number`)
  - Amount to send in BTC

- `note` (`string`, optional)
  - Local comment or memo associated with the transaction

- `fee_rate_sats_per_vb` (`number`, optional)
  - Custom fee rate in satoshis per virtual byte

### Returns

- `tx_id`
  - Transaction ID (hash) of the broadcasted transaction

---

## 5. `calculate_max_btc_send`

### Description

Calculates the maximum amount of Bitcoin that can be safely sent while accounting for network fees.

The function:

1. Fetches the current wallet balance
2. Retrieves the **high-priority** fee estimate
3. Assumes a standard transaction size (~150 vBytes)
4. Subtracts the estimated fee from the total balance

This prevents "insufficient funds" errors when users select **Send Max**.

### Parameters

- None

### Returns

- `max_send_btc`
  - Maximum safe amount that can be sent

- `estimated_fee_btc`
  - Estimated fee reserved for the transaction

- `balance_btc`
  - Total current wallet balance

---

## 6. `estimate_btc_fee`

### Description

Predicts the network fee required for a transaction to confirm within a given time window. The function maps a priority level to a target confirmation depth:

- `high` → 2 blocks
- `medium` → 6 blocks
- `low` → 100 blocks

It queries the `estimatesmartfee` RPC method. Because fee estimation often fails on low-traffic networks like Regtest, the function includes a hardcoded fallback fee of **0.00001 BTC/kB** when no estimate is available.

### Parameters

- `priority` (`string`)
  - One of: `high`, `medium`, or `low`
  - Defaults to `medium`

### Returns

- `feerate_btc_per_kb`
  - Estimated fee rate in BTC per kilobyte

- `blocks`
  - Target number of blocks until confirmation

---

## 7. `validate_btc_address`

### Description

Validates whether a given string is a properly formatted Bitcoin address. This function wraps the `validateaddress` RPC command, which verifies:

- Address checksum
- Address structure (P2PKH, P2SH, Bech32, etc.)

Used by the frontend to provide immediate validation feedback and prevent accidental fund loss.

### Parameters

- `address` (`string`)
  - Bitcoin address to validate

### Returns

- `isvalid` (`boolean`)
  - `true` if the address is valid, otherwise `false`

- `address`
  - Normalized Bitcoin address

---

## 8. `validate_btc_payment`

### Description

Verifies the status of a specific incoming Bitcoin transaction. The function inspects the blockchain entry for a given transaction ID and evaluates:

- Number of confirmations
- Amount received by the wallet

Only outputs classified as `receive` are considered when calculating the credited amount. The function returns:

- `pending` if confirmations are below the required threshold
- `success` if fully confirmed and amounts match expectations

### Parameters

- `tx_id` (`string`)
  - Transaction hash to verify

- `amount` (`number`, optional)
  - Expected amount to verify against

- `min_conf` (`number`)
  - Minimum confirmations required (default: `1`)

### Returns

- `status`
  - `success`, `pending`, or `error`

- `confirmations`
  - Current confirmation count

- `receivedAmount`
  - Actual amount credited by the transaction

---

## 9. `convert_btc_to_usd`

### Description

Provides fiat conversion by fetching real-time market data from the CoinGecko API (`/simple/price`). It retrieves the current BTC → USD exchange rate and calculates the USD value for the provided BTC amount.

This function is intended purely for UI display purposes (e.g., showing *≈ $25.00* next to *0.0005 BTC*).

### Parameters

- `amount_btc` (`number`)
  - Amount of Bitcoin to convert

### Returns

- `usd_value`
  - Converted value in USD

- `rate_per_btc`
  - Current market price of 1 BTC in USD

---

## 10. `btc_mine_blocks_regtest`

### Description

**Development / Testing Only.**

Simulates the mining process on a private Regtest network. The function generates a miner reward address and instructs the node to mine a specified number of blocks using `generatetoaddress`.

This is essential for testing, as transactions in Regtest do not confirm automatically. Developers must explicitly mine blocks to confirm deposits, open channels, or settle payments.

### Parameters

- `num_blocks` (`number`)
  - Number of blocks to mine
  - Default: `1`

### Returns

- `blocks_mined`
  - Number of blocks successfully generated

- `block_hashes`
  - Array of newly mined block hashes

