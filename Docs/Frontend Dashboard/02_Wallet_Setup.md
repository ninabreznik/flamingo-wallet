# 02_Wallet_Setup.md

## 1. Executive Summary

The Wallet Setup Tab manages the cryptographic identity of the Lightning node. It provides the controls for the lifecycle of the wallet: creation, restoration, backup, and disaster recovery.


## 2. User Interface (UI) Architecture

The interface is structured into two main zones: Identity Management and Disaster Recovery.

### A. Identity Management (Create & Import)

**Create New Wallet:**

- **Output:** A hidden container that reveals the 12-word Mnemonic Seed only after successful generation.

**Import Existing Wallet:**

- **Input:** A text area for pasting a standard BIP39 seed phrase.

- **Action:** A red button Recover & Reset Node to enforce the destructive nature of the action.

### B. Disaster Recovery (SCB)

**Export SCB:** A section to download the Static Channel Backup.



**Restore Funds:** A tool to upload a backup file after a node failure.

- **Input:** A standard HTML File Input (scb-file-upload).
- **Action:** An orange button Restore & Recover Funds that initiates the database repair process.


## 3. Backend Integration (daemon.js)

This module interacts with three powerful backend functions designed to manage the node's lifecycle.

#### API 1: initialize_node_wallet


#### API 2: export_scb


#### API 3: recover_funds


## 4. Data Flow Scenario: Disaster Recovery

This scenario illustrates how a user recovers funds using a backup file.

1. **User Action:** User selects my-channels.scb from their computer and clicks Restore.

2. **Frontend:** FileReader loads the file, converts it to Hex string A1B2..., and sends recover_funds.

3. **Backend (Phase 1):** Daemon receives the request. It stops node4.

4. **Backend (Phase 2):** It wipes the node4/regtest folder (database) but keeps the identity key. It writes the Hex string to node4/regtest/emergency.recover.

5. **Backend (Phase 3):** It restarts node4.

6. **Backend (Phase 4 - Auto Healing):** The script automatically iterates through known peers (Hub/Merchant) and executes connect_node.

7. **Network Effect:** The peers see that node4 has lost its state but has provided a recovery token. They broadcast "Force Close" transactions to the Bitcoin network.

8. **Backend (Phase 5):** The script mines 10 blocks (btc_mine_blocks_regtest) to confirm these closing transactions.

9. **Frontend Update:** The UI receives a success message: "Recovery Initiated! Check your On-Chain Balance."


### Video Explanation :https://youtu.be/-xTH6qcfvjk