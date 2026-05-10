FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm install --legacy-peer-deps

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/payload.config.ts ./payload.config.ts
COPY --from=builder /app/src ./src
COPY package*.json ./
COPY next.config.ts ./
COPY tsconfig.json ./

EXPOSE 3000
CMD ["sh", "-c", "node -e \"const {Client}=require('pg'); const c=new Client({connectionString:process.env.DATABASE_URI}); c.connect().then(()=>c.query('CREATE SCHEMA IF NOT EXISTS payload').then(()=>c.end())).catch(()=>{})\" 2>/dev/null; node_modules/.bin/payload migrate 2>&1 || true; node_modules/.bin/next start"]
