# Flamingo Wallet: Docker Environment Documentation

## 1. Introduction

This document outlines the architecture, configuration, and usage of the Dockerized environment for the Flamingo Wallet project.

The setup creates a completely self-contained development environment. It encapsulates the Operating System (Ubuntu), the Bitcoin Blockchain (Bitcoin Core), the Lightning Network (Core Lightning), and the Node.js application layer into a single container. This ensures consistency across different developer machines (Windows, macOS, Linux) and simplifies the complex setup of a Lightning Network node.

---

## 2. Prerequisites

Before you begin, you must have the following installed:

### 2.1 Docker Desktop (**REQUIRED**)

**CRITICAL:** You must download, install, and **run** the Docker Desktop application every time before you try to start this project.

If Docker Desktop is not running in the background, **all `docker-compose` commands will fail**.

Download Docker Desktop from the official Docker website.

### 2.2 Git

Required to clone the repository and manage source control.

---

## 3. Quick Start Guide (How to Run)

Follow these steps to get the project up and running from scratch.

### Step 1: Start Docker Desktop

Launch the Docker Desktop application on your computer. Wait until the engine status indicator turns green or says **Running**.

### Step 2: Build and Start Containers

Open your terminal, navigate to the project root, and run:

```bash
docker-compose up --build
```

**Flags explained:**

- `--build`: Forces Docker to check the Dockerfile and rebuild the image if changes were made.

**What happens now?**

- Docker downloads Ubuntu, Node.js, and Bitcoin dependencies.
- It compiles Core Lightning from source (this may take a few minutes on the first run).
- It starts the app container.
- It launches the Bitcoin daemon and the frontend development server in parallel.

### Step 3: Initialize the Lightning Network

Once the logs show the server is running (you will see output from **budo** and Bitcoin logs), open a new terminal tab and run:

```bash
docker-compose exec app ./scripts/init-network.sh
```

> **Note:** Ensure that the `init-network.sh` file is located in the `scripts/` folder inside your project.

**This script performs the following actions automatically:**

- **Funds Nodes:** Sends 5 BTC to the simulated Node 4, Node 5, and Node 6.
- **Mines Blocks:** Generates Bitcoin blocks to confirm these funding transactions.
- **Builds Topology:** Connects the nodes and opens payment channels in a ring topology (User → Hub → Merchant).
- **Validates:** Waits for channels to be confirmed and usable.

### Step 4: Access the Application

Once initialized, open your web browser and visit:

```
http://localhost:9966
```

At this point, the project should be fully running.

---

## 4. Deep Dive: Configuration Analysis

This section explains the technical details of how the environment is constructed and configured.

### A. Dockerfile (The Blueprint)

This file defines the environment image. It is built on top of **Ubuntu 22.04**.

#### System Environment

- `ENV DEBIAN_FRONTEND=noninteractive`: Prevents installation prompts from hanging the build.
- Installs: `curl`, `git`, `python3`, `build-essential`, `jq`, `wget`.

#### Node.js Runtime

- Installs Node.js **v18.x** via NodeSource.

#### Bitcoin Core (v25.0)

- **Smart Architecture Detection:** Uses `ARG TARGETARCH` to detect whether the host machine is Intel/AMD or Apple Silicon.
- Automatically downloads the correct binary for the host architecture, ensuring native performance.

#### Core Lightning (v23.08.1)

- **Built from Source:** Clones the `v23.08.1` tag directly from GitHub.
- **Dependencies:** Installs `libsodium`, `libgmp`, and `autoconf`.
- **Compilation:** Runs `./configure` and `make` to build `lightningd` and `lightning-cli` inside the container.

#### Exposed Ports

- `9966`: Web UI
- `8080`: WebSocket API

---

### B. docker-compose.yml (The Orchestrator)

This file manages how the container runs and interfaces with your computer.

#### Volumes (Data Persistence & Hot Reloading)

- `./data:/data`
  - **Critical**: Persists Bitcoin blockchain data and Lightning channel state across restarts.

- `.:/app`
  - Mounts the project directory into the container, enabling live code reloads.

- `/app/node_modules`
  - Prevents host `node_modules` (macOS/Windows) from overwriting Linux-compatible dependencies inside the container.

#### Command Override

The container runs a startup command:

```bash
bash -c "npm install && npm run cli start & npm run start"
```

- `npm install`: Installs new dependencies on startup if needed.
- `&`: Runs the backend CLI and frontend web server concurrently in the same container.

---

### C. env.docker.json (The Config Map)

This file is injected into the application and defines paths to Dockerized binaries and data directories.

Key values:

- `BITCOIN_DATADIR`: `/data/bitcoin`
- `LIGHTNINGD_BIN`: `/usr/local/bin/lightningd`
- `LIGHTNING_DIR_4`, `LIGHTNING_DIR_5`, `LIGHTNING_DIR_6`: Data directories for the three simulated Lightning nodes.

---

## 5. Developer Workflow & Troubleshooting

### Essential Commands

```bash
Start Project:          docker-compose up
Stop Project:           Ctrl + C
Remove Containers:      docker-compose down
Enter Container Shell:  docker-compose exec app bash
Rebuild (New Deps):     docker-compose up --build
```

---

### Hard Reset (Wipe Data)

If the blockchain becomes corrupted or you want a clean simulation:

1. Stop the container.
2. Delete the local data folder:

```bash
rm -rf data
```

3. Restart:

```bash
docker-compose up
```

This recreates the folder and starts a fresh Regtest chain.

---

### Troubleshooting Common Issues

#### 1. "Connection refused" or Docker error

- **Cause:** Docker Desktop is not running.
- **Solution:** Start Docker Desktop and wait until it shows as running.

#### 2. `init-network.sh` fails with "Loading block index..."

- **Cause:** Bitcoin Core is still starting.
- **Solution:** Wait 15–20 seconds and look for `init message: Done loading` in the logs before rerunning the script.

#### 3. "bitcoind has gone backwards"

- **Cause:** Switching blockchain states without clearing data.
- **Solution:** Perform a **Hard Reset** by deleting the `data` folder.

#### 4. `lightning-cli` not found

- **Cause:** Command run on the host machine instead of inside the container.
- **Solution:**

```bash
docker-compose exec app lightning-cli --version
```

#### 5. Changes to `package.json` are not reflected

- **Solution:** Stop the container and rebuild:

```bash
docker-compose up --build
```


On regtest, we control everything. We can mint fake Bitcoin, mine blocks instantly, and force channels open using `init-network.sh`. We’re basically gods of the network.

On Mainnet, that’s impossible. Real money is involved, and we can’t command the Bitcoin network to do anything.

### How Mainnet Works Instead

- **Configuration switch:** We change the network from `regtest` to `bitcoin` in `env.docker.json`.
- **No init script:** `init-network.sh` is not used at all.
- **Manual funding:** The app generates a deposit address, and you send real Bitcoin to it.
- **Real waiting:** The system waits for actual Bitcoin confirmations (10–60 minutes). No forced blocks can be mined.

As for backing up everything: because we are using the Docker setup, everything is stored in the `/data` folder. We can simply copy and save this folder to retain a full backup.
