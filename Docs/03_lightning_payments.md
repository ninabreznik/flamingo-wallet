# Lightning Payments Module

## Overview

This module handles all operations directly related to the **Lightning Network** layer. It manages the lifecycle of off-chain payments, from generating Bolt11 invoices and decoding them to executing payments and monitoring their status. It interfaces with the Core Lightning (CLN) node to manage channel funds and route payments.

---

## 1. `lightning_getinfo`

### Description

Diagnostic API used to identify and verify the Lightning node. It retrieves the current node status, including:

- Unique public key (`id`)
- Friendly name (`alias`)
- Current synced block height

This API is commonly called at startup to confirm the node is running and to display the user’s Node ID in the dashboard.

### Parameters

- `nodeId` (`string`, optional)
  - Target node
  - Defaults to `node4`

### Returns

- `data` (`object`)
  - Includes `id`, `alias`, `blockheight`, `num_peers`, and related metadata

---

## 2. `lightning_newaddress`

### Description

Generates a **Bech32 (SegWit)** on-chain address specifically for funding the Lightning node’s internal wallet. Unlike the standard Bitcoin API, this request is routed through the Lightning node itself.

Funds sent to this address are automatically detected by the Lightning node and become available for opening channels. The API parses the raw RPC response and returns only the address string.

### Parameters

- None

### Returns

- `data` (`string`)
  - Bech32 address (e.g., `bcrt1q...`)

---

## 3. `get_ln_balance`

### Description

Calculates the **total financial capacity** of the Lightning node by aggregating:

- **On-chain funds**: Confirmed outputs owned by the Lightning wallet
- **Off-chain funds**: Local channel balance (`our_amount_msat`)

The function converts values from millisatoshis (msats) into satoshis and Bitcoin for UI-friendly display.

### Parameters

- None

### Returns

- `sats` (`number`)
  - Total balance in satoshis

- `btc` (`number`)
  - Total balance in bitcoin

- `raw` (`object`)
  - Full JSON response from the Lightning node (for debugging)

---

## 4. `create_ln_invoice`

### Description

Generates a **Bolt11 invoice**, which is a QR-code-ready payment request string. The API accepts an amount and description, then auto-generates a unique label using the format:

```
flamingo-{nodeId}-{timestamp}
```

A critical feature of this function is persistence: it automatically saves the invoice metadata into `requests.json` with a `pending` state. This ensures incoming payments are not lost if the application restarts.

### Parameters

- `amount_msat` (`number`)
  - Amount to receive in millisatoshis

- `description` (`string`)
  - Memo shown to the payer

- `expiry` (`number`, optional)
  - Invoice expiry time in seconds

### Returns

- `bolt11`
  - The Lightning invoice string

- `payment_hash`
  - Unique identifier for the payment

---

## 5. `pay_ln_invoice`

### Description

Attempts to pay a provided Bolt11 invoice. The Lightning node tries to discover a valid route through the network and execute the payment.

The function includes error parsing to translate generic node failures into clearer messages (e.g., distinguishing between routing failures and insufficient balance).

### Parameters

- `invoice_string` (`string`)
  - Bolt11 invoice to be paid

### Returns

- `status`
  - `pending` (payment in flight) or `error`

- `data`
  - Payment details, including the payment preimage

---

## 6. `keysend_ln_payment`

### Description

Enables **spontaneous payments (Keysend)**, allowing direct payments to a node without requiring an invoice.

The API validates:

- Destination is a valid 66-character hex public key
- Amount is positive

This method is useful for tipping or transfers between trusted or self-owned nodes. A successful payment returns the preimage as cryptographic proof.

### Parameters

- `destination_pubkey` (`string`)
  - Recipient Node ID

- `amount_sats` (`number`)
  - Amount to send in satoshis

### Returns

- `payment_preimage`
  - Proof that the recipient accepted the payment

---

## 7. `decode_ln_invoice`

### Description

Decodes and analyzes a Bolt11 invoice before payment. It extracts key details such as:

- Requested amount
- Expiry time
- Destination Node ID

A unique enhancement of this API is node recognition: it cross-references the destination ID against known Flamingo nodes (Node 4, 5, 6). If matched, it injects a friendly `_alias` (e.g., `Merchant`) into the response.

### Parameters

- `invoice_string` (`string`)
  - Bolt11 invoice to decode

### Returns

- `amount_msat`
  - Requested amount

- `payee`
  - Destination Node ID

- `description`
  - Invoice memo

- `_alias` (optional)
  - Friendly node name if recognized

---

## 8. `get_ln_payment_status`

### Description

Checks the status of an **outgoing** Lightning payment. It queries the node’s payment history using the `payment_hash` and normalizes internal states into three simple outcomes:

- `success` — Payment completed
- `failed` — Payment failed
- `pending` — Payment still in flight

Used by the frontend to update transaction history and confirmation indicators.

### Parameters

- `payment_hash` (`string`)
  - Payment identifier

### Returns

- `status`
  - `success`, `failed`, or `pending`

- `data`
  - Full payment details

---

## 9. `validate_ln_payment`

### Description

Validates the status of an **incoming** Lightning payment (an invoice created by the user). It verifies:

- Whether the invoice has been paid
- Whether the received amount matches the expected value

If the invoice is marked as `paid` and the amounts match, the API returns success. Otherwise, it reports `pending` or an error state.

### Parameters

- `payment_hash` (`string`)
  - Invoice identifier

- `amount_msat` (`number`, optional)
  - Expected amount for verification

### Returns

- `status`
  - `success` or `pending`

- `data`
  - Invoice details

---

## 10. `subscribe_invoices`

### Description

Establishes a **real-time monitoring stream** for incoming Lightning payments. Instead of polling, this API:

- Opens a WebSocket connection
- Starts a background polling loop (every 2 seconds)
- Tracks paid invoice count

When a new payment is detected, it immediately pushes a `payment_received` event to the frontend with the invoice data.

### Parameters

- `ws` (`WebSocket`)
  - Active WebSocket connection (passed automatically)

### Returns

- `message`
  - Confirmation that subscription has started

### Events

- `payment_received`
  - Emitted when a new invoice is paid
  - Payload contains invoice details



###  Video Explaination: https://youtu.be/JZKdosNvRwk
