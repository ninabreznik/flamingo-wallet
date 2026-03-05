# 03_History_Tab.md

## 1. Executive Summary

The History Tab functions as the node's financial ledger and auditing tool. Since the Flamingo Wallet operates on two layers simultaneously—Bitcoin (Layer 1) and Lightning (Layer 2)—tracking cash flow can be complex.


## 2. User Interface (UI) Architecture

The interface is organized into three specific functional zones:

### A. The Statistics Grid

**Purpose:** Provides an "at-a-glance" financial summary of the node's lifetime performance.

**Metrics Displayed:**

- **Net (Sats):** The overall profit or loss (In minus Out).
- **Total In:** Cumulative funds received.
- **Total Out:** Cumulative funds spent.
- **Fees Paid:** The total cost of doing business (network + routing fees).

### B. The Audit Toolkit (Grid Layout)

**Daily Logs:** A calendar-based filter tool. Users select a date (YYYY-MM-DD) to see a focused list of that day's activity.



- **Lookup:** Users paste a generic ID (TXID or Hash) to fetch raw metadata.
- **Validate:** A dedicated "Receiver Side" check where users input an Expected Amount to verify if a specific payment has settled.

### C. Combined Transaction Table

**Purpose:** The main activity feed.

**Features:**

- **Visual Tags:** Distinct badges for BTC (Yellow) and LN (Blue) transaction types.
- **Directional Formatting:** Green (+) for income, Red (-) for spending.
- **Interactive IDs:** Clicking any Transaction ID automatically copies it to the clipboard and populates the "Lookup" tool for instant verification.



## 3. Backend Integration (daemon.js)

The backend performs heavy data normalization to merge the two distinct payment networks.

#### API 1: get_transaction_history


#### API 2: get_transaction_summary

#### API 3: get_daily_transactions


#### API 4: validate_btc_payment


#### API 5: validate_ln_payment


## 4. Data Flow Scenario: Validating a Customer Payment

This scenario illustrates how a merchant validates a Bitcoin transaction manually.

1. **User Action:** The user sees a transaction in the table that looks unconfirmed. They click the TXID link.

2. **Frontend:** handleHistoryClick fires. It copies the ID, pastes it into the "Lookup" box, and auto-clicks Lookup BTC.

3. **Backend:** get_tx_details_from_btcnode returns the raw JSON.

4. **Frontend Update:** The UI displays raw details: "Confirmations: 0".

5. **User Action:** The user inputs "0.005" into the "Validate Payment" box and clicks Check BTC.

6. **Backend:** validate_btc_payment checks the node. It sees confirmations: 0.

7. **Frontend Update:** The UI displays an Orange warning: "⏳ PENDING: 0 confirmations".

8. **(User mines a block in the Bitcoin tab)**

9. **User Action:** User clicks Check BTC again.

10. **Backend:** Now sees confirmations: 1.

11. **Frontend Update:** The UI displays a Green success message: "✅ VALID: Received 0.005 BTC".

### Video Explanation :https://youtu.be/ZAYRpUNtFl4