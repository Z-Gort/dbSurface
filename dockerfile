# -------------------- 1. base stage --------------------
FROM node:20-alpine AS base

# -------------------- 2. deps stage --------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat     
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate \
 && pnpm install --frozen-lockfile                         \
    --prod=false                                           \
    --no-optional                                          \
    --unsafe-perm                                          \
    --reporter=silent

# -------------------- 3. builder stage -----------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

### -------- vars for client bundle --------
ARG NEXT_PUBLIC_VERCEL_REMOTE_URL=https://test-rho-gules-70.vercel.app
ARG NEXT_PUBLIC_KINDE_CLIENT_ID=f3f18d5a27554fd883ece869952a5052
ARG NEXT_PUBLIC_KINDE_DOMAIN=https://dbsurface.kinde.com

# Expose to the build environment
ENV NEXT_PUBLIC_VERCEL_REMOTE_URL=$NEXT_PUBLIC_VERCEL_REMOTE_URL
ENV NEXT_PUBLIC_KINDE_CLIENT_ID=$NEXT_PUBLIC_KINDE_CLIENT_ID
ENV NEXT_PUBLIC_KINDE_DOMAIN=$NEXT_PUBLIC_KINDE_DOMAIN


RUN corepack enable pnpm && pnpm run build     

# -------------------- 4. runner stage ------------------
FROM base AS runner
WORKDIR /app

ARG NEXT_PUBLIC_VERCEL_REMOTE_URL=https://test-rho-gules-70.vercel.app
ARG NEXT_PUBLIC_KINDE_CLIENT_ID=f3f18d5a27554fd883ece869952a5052
ARG NEXT_PUBLIC_KINDE_DOMAIN=https://dbsurface.kinde.com

ENV NEXT_PUBLIC_VERCEL_REMOTE_URL=$NEXT_PUBLIC_VERCEL_REMOTE_URL
ENV NEXT_PUBLIC_KINDE_CLIENT_ID=$NEXT_PUBLIC_KINDE_CLIENT_ID
ENV NEXT_PUBLIC_KINDE_DOMAIN=$NEXT_PUBLIC_KINDE_DOMAIN

ENV NODE_ENV=production
# non‑root for a bit more safety
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the minimal production bundle
COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static    ./.next/static

USER nextjs

EXPOSE 3000                 
ENV PORT=3000
ENV HOSTNAME=0.0.0.0    

CMD ["node", "server.js"]