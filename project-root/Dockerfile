FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    python3 \
    git \
    wget \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Bitcoin Core
# Install Bitcoin Core
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "amd64" ]; then \
    wget https://bitcoincore.org/bin/bitcoin-core-25.0/bitcoin-25.0-x86_64-linux-gnu.tar.gz -O bitcoin.tar.gz && \
    tar xzf bitcoin.tar.gz && \
    install -m 0755 -o root -g root -t /usr/local/bin bitcoin-25.0/bin/*; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
    wget https://bitcoincore.org/bin/bitcoin-core-25.0/bitcoin-25.0-aarch64-linux-gnu.tar.gz -O bitcoin.tar.gz && \
    tar xzf bitcoin.tar.gz && \
    install -m 0755 -o root -g root -t /usr/local/bin bitcoin-25.0/bin/*; \
    else \
    echo "Unsupported architecture: $TARGETARCH" && exit 1; \
    fi && \
    rm -rf bitcoin.tar.gz bitcoin-25.0*

# Install Core Lightning
# We'll use a pre-built binary or minimal build instructions. For simplicity and reliability in Ubuntu 22.04,
# we can follow standard build steps or use a PPA if available. 
# Building from source is robust.
RUN apt-get update && apt-get install -y \
    autoconf automake libtool libgmp-dev \
    libsqlite3-dev python3-pip libsodium-dev gettext \
    && pip3 install --upgrade pip \
    && pip3 install mako \
    && git clone https://github.com/ElementsProject/lightning.git \
    && cd lightning \
    && git checkout v23.08.1 \
    && ./configure --disable-valgrind \
    && make -j$(nproc) \
    && make install \
    && cd .. \
    && rm -rf lightning \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for caching
COPY package.json ./

# Install npm dependencies
RUN npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 9966 8080

# Default command (overridden by docker-compose)
CMD ["npm", "run", "cli", "start"]
