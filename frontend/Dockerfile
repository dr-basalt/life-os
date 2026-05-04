# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY . .

# svelte-kit sync pour générer les types
RUN npx svelte-kit sync

ARG PUBLIC_PB_URL=http://localhost:8090
ENV PUBLIC_PB_URL=$PUBLIC_PB_URL

RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copier le build + node_modules du builder (évite npm install en prod)
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "build"]
