# 07_Flamingo_Hub_Tab.md

## 1. Executive Summary

The Flamingo Hub Tab is the control center for the application's unique ecosystem simulation. While other tabs focus on standard node management, this tab houses the specific Business Logic and Automation Scripts that define the Flamingo project.

It serves two roles:

- **Simulation Orchestrator:** Tools to set up the "Golden Path" routing topology (User → Hub → Merchant) and verify the revenue model.
- **Automated Health Manager:** "Automagic" tools that monitor the user's liquidity health and offer one-click fixes, such as requesting inbound capacity or performing an emergency exit.

## 2. User Interface (UI) Architecture

The interface is segmented into three distinct functional areas:

### A. Hub Business Logic (The Workflow)

A sequence of three buttons designed to be run in order to set up the demo environment:

- **User Onboarding:** A Connect to Hub button that acts as a "One-Click Setup" for new users, automatically linking them to the central Hub node.
- **Admin Routes:** A Setup Backend Routes button (Dev/Admin only) that configures the connection between the Hub (Node 5) and the Merchant (Node 6), establishing the second half of the payment route.
- **Revenue Verification:** A Verify Fees button that runs an end-to-end payment test to confirm the Hub is earning routing fees.

### B. Liquidity Automagic

- **Visual Health Bars:** Two progress bars (Out vs In) that visualize the node's spending vs. receiving capacity.
- **Health Status:** A text badge displaying the current state (e.g., HEALTHY, LOW_INBOUND).
- **Auto-Fix Tool:** A conditional button (Request Inbound) that only appears when the system detects the user cannot receive payments. It offers a single-click solution to the complex problem of inbound liquidity.

### C. The Danger Zone

- **Reset World:** A button to close all channels and reset the environment (useful for restarting demos).
- **Emergency Drain (Panic Button):**
  - **Input:** Backup Bitcoin Address.
  - **Action:** DRAIN ALL FUNDS. This is a "Nuclear Option" that force-closes every active channel and sweeps all assets to the backup address immediately.


## 3. Backend Integration (daemon.js)

This module executes high-level scripts that chain multiple RPC commands together.

#### API 1: open_channel_flamingo

#### API 2: admin_setup_hub

#### API 3: verify_revenue

#### API 4: get_liquidity_report

#### API 5: request_inbound_liquidity

#### API 6: emergency_drain


## 4. Data Flow Scenario: The "Auto-Fix" Loop

This scenario demonstrates how the system detects and repairs liquidity issues automatically.

1. **User Action:** User clicks Refresh Health Report.
2. **Backend:** get_liquidity_report analyzes channels. It sees the user has 200k Outbound but 0 Inbound.
3. **Response:** Returns { status: 'LOW_INBOUND', action_required: true }.
4. **Frontend Update:**
   - Inbound Bar is empty (0%).
   - Auto-Fix Area appears with message: "⚠️ You have low receiving capacity."
5. **User Action:** User clicks 🔧 Auto-Fix: Request Inbound.
6. **Backend:** request_inbound_liquidity executes.
   - Node 5 opens a 1,000,000 sat channel to Node 4.
   - Blocks are mined.
7. **Frontend Logic:** The script waits 2 seconds and auto-clicks "Refresh Health" again.
8. **Frontend Update:**
   - Inbound Bar fills up (now ~80%).
   - Status badge turns Green (HEALTHY).
   - Auto-Fix button disappears.


### Video Explanation : https://youtu.be/rb_7YsAr31c