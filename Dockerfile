FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim

ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends cron tzdata ca-certificates \
  && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
  && echo $TZ > /etc/timezone \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY scripts ./scripts
COPY cron ./cron

RUN chmod +x /app/scripts/run-monitor.sh /app/scripts/run-webmotors.sh /app/scripts/entrypoint.sh \
  && cp /app/cron/monitor.cron /etc/cron.d/monitor \
  && chmod 0644 /etc/cron.d/monitor \
  && mkdir -p /app/data/nitro /app/data/webmotors

CMD ["/app/scripts/entrypoint.sh"]
