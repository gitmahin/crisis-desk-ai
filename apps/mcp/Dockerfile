FROM node:24-alpine AS base

# ******************************SETUP PNPM*********************************
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ******************************PRUNE THE PROJECT*********************************
FROM base AS pruner

WORKDIR /app


COPY . .
RUN pnpm dlx turbo prune mcp --docker

# ******************************INSTALLATION**************************************
FROM base AS installer

WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/turbo.json ./turbo.json

RUN pnpm install --frozen-lockfile

# ******************************BUILD THE APP*************************************
FROM base AS builder

WORKDIR /app

COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

ENV TURBO_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm turbo run build

# ******************************RUN THE APP***********************************
FROM base AS runner
WORKDIR /app

ENV TURBO_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/mcp/package*.json ./apps/mcp/
COPY --from=builder /app/apps/mcp/node_modules ./apps/mcp/node_modules/
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/apps/mcp/build ./apps/mcp/build/
COPY --from=builder /app/packages ./packages/

ENV HOST=0.0.0.0
ENV PORT=5000

CMD [ "node", "apps/mcp/build/index.mjs" ]