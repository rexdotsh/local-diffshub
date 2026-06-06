FROM oven/bun:1.3.10 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS build

COPY . .
RUN bun run build

FROM oven/bun:1.3.10-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

ENV HOST=0.0.0.0 \
  PORT=3003 \
  LOCAL_DIFFSHUB_STATE_PATH=/data/state.json \
  NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./package.json

RUN mkdir -p /data /repos

EXPOSE 3003

CMD ["bun", "run", "start"]
