# Minimal Trenz Lightning Backend

Pre-req:
- bitcoind, bitcoin-cli (Bitcoin Core) installed and on PATH
- Core Lightning: lightningd & lightning-cli installed and on PATH
- node >= 16, npm

1. Edit `.env` if needed.
2. Start nodes + wallet + lightningd:
   ```bash
   ./scripts/start-all.sh
