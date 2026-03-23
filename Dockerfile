FROM lscr.io/linuxserver/webtop:ubuntu-xfce

# Install Node.js 24
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Chromium (arm64 compatible, from xtradeb PPA already in webtop)
RUN apt-get update && \
    apt-get install -y chromium --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install openclaw globally
RUN npm install -g openclaw

# Symlink: /root/.openclaw -> /config/.openclaw (persisted by volume)
RUN mkdir -p /config/.openclaw && \
    ln -sf /config/.openclaw /root/.openclaw

