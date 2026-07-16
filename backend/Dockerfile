# =============================================================
# Puku Puku CRM — Backend (Node 22 + Python 3)
# Multi-platform build: docker buildx build --platform linux/amd64,linux/arm64 ...
# =============================================================
FROM node:22-bookworm-slim AS base
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
  python3 python3-pip wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python deps (ML) ──
COPY ml/requirements.txt ml/
RUN pip3 install --no-cache-dir -r ml/requirements.txt 2>/dev/null || true

# ── Node deps ──
COPY package*.json ./
RUN npm install --omit=dev

# ── Prisma generate ──
COPY prisma/ prisma/
RUN npx prisma generate

# ── App source ──
COPY src/ src/
COPY tsconfig.json ./

# ── TypeScript build (optional, JS runtime compat) ──
RUN npx tsc -p tsconfig.json 2>/dev/null || true

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "src/server.js"]
