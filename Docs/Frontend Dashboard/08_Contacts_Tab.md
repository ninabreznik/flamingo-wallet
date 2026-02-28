# 08_Contacts_Tab.md

## 1. Executive Summary

The Contacts Tab serves as the user's private address book. In the world of Bitcoin and Lightning, addresses are long, case-sensitive cryptographic strings (e.g., bcrt1q... or 03af2...) that are impossible to memorize and risky to type manually.

## 2. User Interface (UI) Architecture

The interface is divided into two columns: Input (Add) and Display (List).

### A. Add Contact Form

**Inputs:**

- **Name / Alias:** The friendly display name (e.g., "Alice").
- **Address:** The raw cryptographic string (Bitcoin Address, Bolt11 Invoice, or Node Pubkey).
- **Note:** An optional private comment field (e.g., "Coffee shop wallet").

**Action:** Save Contact button.

### B. Saved Contacts List

**Purpose:** A scrollable directory of all saved entries.

**Visual Cards:** Each contact is displayed as a card containing:

- **Name & Note:** Prominently displayed.
- **Type Badge:** A color-coded tag indicating the address type:
  - Yellow: BTC (On-Chain).
  - Blue: LN (Lightning Invoice).
  - Grey: NodeID (Network Identity).
- **Interactive Address:** Clicking the address string automatically copies it to the clipboard.
- **Delete Action:** A small red Del button to remove the entry.


## 3. Backend Integration (daemon.js)

This module manages a local, file-based database (contacts.json). Crucially, this data is private and never broadcast to the network.

#### API 1: contact_add

#### API 2: contact_list

#### API 3: contact_delete

### Pending requests APIS

#### API 1: save_request
#### API 2: get_active_requests


## 4. Data Flow Scenario: Adding a Node Peer

This scenario illustrates how the Address Book supports the "Keysend" feature.

1. **User Action:** User copies a Node ID (03af2...) from an explorer or the Network Search tab.
2. **User Action:** In the Contacts Tab, they enter Name: "Bob", pastes the ID into Address, and clicks Save Contact.
3. **Frontend Logic:**
   - Detects the 66-char hex string. Sets type to 'NodeID'.
   - Sends contact_add command.
4. **Backend:** Saves the entry to contacts.json.
5. **Frontend Update:** The list refreshes. A new card appears with a Grey "NodeID" Badge.
6. **User Action:** User navigates to the Lightning Tab.
7. **System Integration:** The Keysend dropdown menu (refreshKeysendContacts) automatically fetches the contact list. It sees "Bob" is a NodeID type and adds him to the dropdown.
8. **Result:** The user can now select "Bob" from the list to send him money instantly, without ever needing to copy-paste his ID again.


### Video Explanation : https://youtu.be/DhdWhl2lvng