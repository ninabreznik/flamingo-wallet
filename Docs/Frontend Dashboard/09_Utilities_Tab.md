# 09_Utilities_Tab.md

## 1. Executive Summary

The Utilities Tab provides essential financial planning tools for the user. While not directly involved in moving funds, these helpers allow users to make informed decisions before initiating transactions.


## 2. User Interface (UI) Architecture

The interface is simple and functional, divided into two specific utility cards.

### A. Fee Estimator

- **Purpose:** Helps users choose the right fee rate for on-chain transactions based on urgency.
- **Controls (Radio Buttons):**
  - **High:** Targets confirmation in ~2 blocks (approx. 20 mins).
  - **Med:** Targets confirmation in ~6 blocks (approx. 1 hour).
  - **Low:** Targets confirmation in ~100 blocks (Economy/Overnight).
- **Action:** `Estimate Fee` button.
- **Output:** Displays the recommended rate in `BTC/kB`.

### B. BTC to USD Converter

- **Purpose:** A quick calculator to verify the fiat value of a specific Bitcoin amount.
- **Input:** `BTC Amount` (decimal).
- **Action:** `Convert` button.
- **Output:** Displays the live USD value (e.g., "$54,320.50 USD").


## 3. Backend Integration (`daemon.js`)

This module interacts with both the Bitcoin node and external APIs.

#### API 1: `estimate_btc_fee`


#### API 2: `convert_btc_to_usd`

## 4. Data Flow Scenario: Checking Fees before Sending

This scenario illustrates how a user plans a transaction.

1. **User Action:** User selects "High (2 blks)" and clicks Estimate Fee.
2. **Frontend:** Sends `{ type: 'estimate_btc_fee', data: { priority: 'high' } }`.
3. **Backend:**
   - Maps 'high' to `2` blocks.
   - Calls `bitcoind estimatesmartfee 2`.
   - (Simulated): Node returns `0.00001500`.
4. **Backend Response:** `{ status: 'success', data: { feerate_btc_per_kb: 0.00001500, blocks: 2 } }`.
5. **Frontend Update:** UI displays: "Feerate: 0.00001500 BTC/kB".
6. **User Decision:** The user now knows exactly what to type into the "Fee" field in the Bitcoin Tab to get fast confirmation.


### Video Explanation : https://youtu.be/hazMMnLDYnU
