# Monitor de Preços de Pneu + Webmotors

[![CI](https://github.com/bamonde/tire_price_monitor_bot/actions/workflows/ci.yml/badge.svg)](https://github.com/bamonde/tire_price_monitor_bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/bamonde/tire_price_monitor_bot)](LICENSE)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
[![Telegram Bot](https://img.shields.io/badge/Telegram-@tire__price__monitor__bot-26A5E4?logo=telegram&logoColor=white)](https://t.me/tire_price_monitor_bot)

Dois jobs no mesmo container: **Nitro** (preço/estoque de pneus) e **Webmotors** (anúncios novos de HB20 1.0 TGDI). Cada loja tem pasta, store e cron próprios; o Telegram é compartilhado.

Bot de alertas: [@tire_price_monitor_bot](https://t.me/tire_price_monitor_bot)

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Linguagem | TypeScript |
| HTTP / scraping | Axios + Cheerio (Nitro) · Axios JSON (Webmotors) |
| Notificações | Telegram Bot API |
| Histórico Nitro | JSONL (`data/nitro/`) |
| Vistos Webmotors | JSON (`data/webmotors/seen.json`) |
| Agendamento | Cron (no container) |
| Container | Docker + Docker Compose |
| Testes | Vitest |

## Módulos

```text
src/shared/     envio Telegram, preço BRL
src/nitro/      job de pneus (loja Nitro)
src/webmotors/  job HB20 1.0 TGDI
data/nitro/     histórico de preços
data/webmotors/ IDs de anúncios já vistos
```

### Nitro (pneus)

- Coleta produtos de URLs de busca configuradas
- Extrai preço no Pix, parcelamento e disponibilidade
- Alerta no Telegram quando preço ou estoque mudam
- Retenção de histórico: **72h** (configurável)

### Webmotors (HB20)

Watch fixo:

- Hyundai HB20 · 1.0 **TGDI** · ano **2023–2025**
- Versões: Comfort/Confort Plus, Platinum, Platinum Plus, Platinum Safety, Limited  
  (Comfort Plus Tech **não** entra)
- Conta anúncios **novos** (ID que ainda não estava no store)
- Envia ficha + link só se **km ≤ 50.000** (km ausente = sem link)
- Primeira execução: baseline sem alerta
- Zero novos: silêncio
- Fonte fora (403 etc.): alerta “Webmotors fora” — sem Playwright/bypass

API usada: `GET https://www.webmotors.com.br/api/search/car.xml` (JSON público da listagem).

## Pré-requisitos

- Docker
- Docker Compose
- Conta no Telegram

## Configuração do Telegram

### 1. Criar o bot

1. Abra o Telegram e fale com [@BotFather](https://t.me/BotFather)
2. Envie `/newbot`
3. Escolha um nome e um username (deve terminar com `bot`)
4. Copie o **token** retornado (formato `123456789:ABCdef...`)

### 2. Obter o Chat ID

**Opção A — chat privado com o bot**

1. Envie qualquer mensagem para o bot recém-criado (ex: `oi`)
2. Abra no navegador (substitua `<TOKEN>`):

```text
https://api.telegram.org/bot<TOKEN>/getUpdates
```

3. Procure `"chat":{"id":123456789` no JSON — esse número é o `TELEGRAM_CHAT_ID`

**Opção B — grupo**

1. Adicione o bot ao grupo
2. Envie uma mensagem no grupo
3. Use o mesmo endpoint `getUpdates` e copie o `chat.id` do grupo (geralmente negativo)

## Instalação e execução

```bash
cp .env.example .env
# Edite .env com MONITOR_URL (ou MONITOR_URLS), TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID

docker compose up --build -d
```

### Executar manualmente (teste)

```bash
# Nitro
docker compose run --rm monitor /app/scripts/run-monitor.sh

# Webmotors
docker compose run --rm monitor /app/scripts/run-webmotors.sh
```

> Na **primeira execução** de cada módulo, só grava o store/histórico — **sem alertas retroativos**.

### Ver logs

```bash
docker compose logs -f monitor
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `MONITOR_URL` | URL de busca Nitro | obrigatório se `MONITOR_URLS` vazio |
| `MONITOR_URLS` | Várias URLs Nitro | opcional |
| `HISTORY_FILE` | Histórico Nitro | `/app/data/nitro/price-history.jsonl` (legado `/app/data/price-history.jsonl` ainda funciona) |
| `HISTORY_RETENTION_HOURS` | Retenção Nitro | `72` |
| `WEBMOTORS_SEEN_FILE` | IDs vistos Webmotors | `/app/data/webmotors/seen.json` |
| `TELEGRAM_BOT_TOKEN` | Token do bot | **obrigatório** |
| `TELEGRAM_CHAT_ID` | ID do chat/grupo | **obrigatório** |
| `TZ` | Fuso horário | `America/Sao_Paulo` |

## Desenvolvimento local

```bash
npm install
npm test
npm run build

export $(grep -v '^#' .env | xargs)
HISTORY_FILE=./data/nitro/price-history.jsonl npm run dev:nitro
WEBMOTORS_SEEN_FILE=./data/webmotors/seen.json npm run dev:webmotors
```

## Cron

Agenda em [`cron/monitor.cron`](cron/monitor.cron):

- Nitro: `0 6-22/2 * * *` → `run-monitor.sh` (a cada 2h, 06:00–22:00)
- Webmotors: `*/30 6-22 * * *` → `run-webmotors.sh` (a cada 30 min, 06:00–22:30)

Horários Nitro (America/Sao_Paulo): **06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00**.  
Webmotors: a cada meia hora no mesmo intervalo diurno.

## Limitações

- Nitro: parser depende do HTML da página de busca; layout novo exige ajuste em [`src/nitro/fetch.ts`](src/nitro/fetch.ts)
- Webmotors: depende do endpoint público `car.xml`; 403/challenge → alerta “fonte fora”, sem contornar bloqueio
- Stores ficam no volume `./data` — faça backup se necessário

## Troubleshooting

| Problema | Solução |
|---|---|
| `MONITOR_URL é obrigatória` | Preencha `MONITOR_URL` ou `MONITOR_URLS` no `.env` |
| `TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID são obrigatórias` | Preencha `.env` e recreie o container |
| Bot não envia mensagens | Confirme token/chat ID; envie `/start` ao bot |
| Webmotors fonte fora | Endpoint bloqueou o IP; use alerta nativo do app enquanto isso |
| Cron não executa | `docker compose logs -f monitor` |
