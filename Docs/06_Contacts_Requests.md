# 06_Contacts_Requests.md

## Overview
This module provides the "Address Book" and "Payment Tracking" features for the wallet. Unlike the core Lightning functions which are stateless or rely on the node's database, these APIs manage a local file-based database (`contacts.json` and `requests.json`). This allows the application to save user-friendly metadata (like names and notes) and track the status of payment requests even if the node itself doesn't natively support such tagging.


## Concepts: Local Contacts vs. Network Gossip

It is important to distinguish between Contacts (this module) and the Lightning Network Graph.

**Lightning Network (Gossip)**: Your node automatically exchanges data with peers to build a global map of the network. This is similar to a routing table. It happens automatically in the background via the "Gossip Protocol," where nodes cryptographically prove they have open channels backed by real Bitcoin.

**Contacts (Address Book)**: This module is purely local to your application. It is a private JSON list (contacts.json) where you store friendly names (e.g., "Alice's Laptop") for long, complex Node IDs. It acts like a phonebook on your device; adding someone here does not broadcast anything to the P2P network.

---

## 1. contact_add

**Description:**  
This API saves a new entry to the user's local address book. It reads the local `contacts.json` file and appends a new contact object. A clever feature of this function is its auto-detection logic: if the provided address matches the format of a Lightning Node ID (66 hexadecimal characters), it automatically sets the contact type to `NodeID`. It generates a simple timestamp-based ID for the record and saves it back to the file system, allowing the user to label frequent peers or Bitcoin addresses with human-readable names.

**Parameters:**
- `name` (string): The display name for the contact.
- `address` (string): The Bitcoin address or Lightning Node ID.
- `type` (string, optional): Manually specify `BTC` or `NodeID`.
- `note` (string, optional): Additional comments.

**Returns:**
- `status`: `'success'` or `'error'`
- `data`: The created contact object, including its generated `id`.

---

## 2. contact_list

**Description:**  
This function retrieves the entire address book from the local storage. It reads the `contacts.json` file, parses the data, and returns the list of saved contacts. To ensure the most relevant (recently added) contacts appear at the top of the UI, it reverses the order of the array before returning it. This simple API powers the "Contacts" or "Favorites" view in the wallet interface.

**Parameters:**  
None.

**Returns:**
- `data` (array): A list of contact objects sorted by newest first.

---

## 3. contact_delete

**Description:**  
This API allows the user to remove an entry from their address book. It accepts the unique `id` of the contact to be deleted. The function reads the current list, filters out the item with the matching ID, and writes the updated list back to `contacts.json`. It includes a check to ensure the ID actually existed; if the list length remains unchanged after the filter operation, it returns an error indicating the contact was not found.

**Parameters:**
- `id` (string): The unique identifier of the contact to remove.

**Returns:**
- `status`: `'success'` or `'error'`
- `data`: Object containing `deleted: true`

---

## 4. save_request

**Description:**  
This function is the entry point for the "Payment Request" tracking system. When a user generates a Bitcoin address or a Lightning invoice to show to someone else, this API saves that intent to `requests.json`. It stores key details like the expected amount, type (`BTC` or `LN`), and description, setting the initial status to `pending`. This persistence ensures that the wallet remembers it is waiting for money, even if the application is restarted, allowing the UI to show a "Pending Requests" list.

**Parameters:**
- `id` (string): The identifier (Bitcoin Address or Lightning Payment Hash).
- `type` (string): `BTC` or `LN`.
- `amount` (number): Expected amount.
- `description` (string, optional): Context for the request.
- `expiry` (number, optional): Expiry time (for LN invoices).

**Returns:**
- `data`: The saved request object.

---

## 5. get_active_requests

**Description:**  
This API fetches the history of payment requests created by the user. It reads the `requests.json` file and returns the list sorted by creation time (newest first). While the name implies it might only return "active" (pending) requests, the code currently returns the full list, allowing the frontend UI to decide whether to show pending, paid, or expired requests. This serves as the data source for the "My Invoices" or "Receivables" screen.

**Parameters:**  
None.

**Returns:**
- `data` (array): List of request objects.

---

## 6. monitor_btc_requests

**Description:**  
This is a background polling service designed to track the status of pending requests. When called, it starts a recurring interval (every 5 seconds) that checks the `requests.json` file for items marked as `pending`.

- For Bitcoin (BTC) requests, it queries the blockchain (`getreceivedbyaddress`) to see if funds have arrived.
- For Lightning (LN) requests, it checks the invoice status.

If it detects that funds have been received, it updates the status in the JSON file (to `paid` or `partial_payment`) and pushes a real-time WebSocket update (`request_update`) to the frontend, triggering an instant UI notification without the user needing to refresh.

**Parameters:**
- `ws` (WebSocket): The active WebSocket connection (passed automatically).

**Returns:**
- **Events:** Pushes JSON messages via WebSocket when a request status changes.
