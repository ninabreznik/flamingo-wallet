# 05_Lightning_Tab.md

## 1. Executive Summary

The Lightning Tab is the core interface for Layer 2 operations, enabling high-speed, low-cost off-chain transactions. Unlike the base Bitcoin layer, Lightning requires a more interactive workflow involving invoices, peer-to-peer routing, and real-time connectivity.


## 2. User Interface (UI) Architecture

The interface is organized into a clean grid layout separating Inbound (Receive) and Outbound (Send) operations.

### A. Receive Zone

**Inputs:**

- **Amount (msat):** The value requested (in millisatoshis).
- **Description:** A memo field (e.g., "Pizza").
- **Quick Templates:** A dynamic list of "Chips" populated from previous requests (e.g., "Coffee (50000 msat)"). Clicking one auto-fills the form.

**Action:** Create Invoice generates the BOLT11 string.

**Test Tool:** A special Simulate Payment button that commands the backend simulation Hub (Node 5) to pay the invoice you just created.

### B. Send Zone (Standard)

- **Input:** A text field for the BOLT11 Invoice String (starts with lnbc...).
- **Pre-Flight Check:** A Decode Invoice button that parses the string and displays the destination alias, amount, and expiry before money is sent.
- **Action:** Pay Invoice executes the transaction.

### C. Keysend Zone (Chat Pay)

**Purpose:** Send money instantly to a contact without asking them for an invoice.

**Components:**

- **Contact Dropdown:** A list of saved contacts
- **Destination Pubkey:** The raw 66-character hex ID of the recipient.
- **Amount (sats):** The amount to push.

### D. Identity Tools

- **Sign Message:** Input a text message → Output a cryptographic signature (zbase32).
- **Verify Signature:** Input a message + signature → Output "Valid/Invalid" and the signer's identity.

## 3. Backend Integration (daemon.js)

This tab interacts with the Core Lightning (CLN) node's invoice and routing subsystems.

#### API 1: create_ln_invoice

#### API 2: decode_ln_invoice

#### API 3: keysend_ln_payment

#### API 4: simulate_incoming_payment

#### API 5: sign_message / verify_message

## 4. Data Flow Scenario: Testing the "Receive" UI

This scenario demonstrates the synergy between creation and simulation.

1. **User Action:** User enters "50000" msat, desc "Test", and clicks Create Invoice.
2. **Frontend:**
   - Calls create_ln_invoice.
   - Receives BOLT11: lnbcrt500n....
   - Sets window.lastGeneratedInvoice = 'lnbcrt500n...'.
   - Displays the invoice on screen.
3. **User Action:** User clicks the purple Simulate Payment (Node 5 Pay) button.
4. **Frontend:** Reads the global variable and sends { bolt11: 'lnbcrt500n...' } to the backend.
5. **Backend:**
   - Node 5 attempts to pay the invoice.
   - Success! Node 5 sends funds to Node 4.
6. **Network Event:** Node 4 detects the incoming payment.
7. **Push Notification:** The subscribe_invoices loop in the backend sees the status change to paid. It sends a WebSocket message: { type: 'payment_received', data: ... }.
8. **Frontend Update:** A large Green Banner "✅ Payment Received!" animates into view automatically.


### Video Explanation : https://youtu.be/anmHpToIIPw