# =============================================================================
# Dockerfile — Containerized OminAPI test runner
# -----------------------------------------------------------------------------
# WHY: environment parity — the SAME image runs locally and in CI, eliminating
# "works on my machine". API-only suite needs no browsers, so a slim Node image
# is enough (no Playwright browser download).
#
# LAYER ORDER: copy manifests and `npm ci` BEFORE copying source, so the
# dependency layer is cached and only re-built when package*.json change.
# =============================================================================
FROM node:22-bookworm-slim

WORKDIR /app

# 1) Dependencies layer (cached unless package*.json change).
COPY package.json package-lock.json ./
RUN npm ci

# 2) Application source.
COPY . .

# Default to a CI-style run (validated config, all reporters).
ENV CI=true
CMD ["npm", "run", "test:ci"]
