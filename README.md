# Monitor de Preços de Pneu

[![CI](https://github.com/bamonde/tire_price_monitor_bot/actions/workflows/ci.yml/badge.svg)](https://github.com/bamonde/tire_price_monitor_bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/bamonde/tire_price_monitor_bot)](LICENSE)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
[![Telegram Bot](https://img.shields.io/badge/Telegram-@tire__price__monitor__bot-26A5E4?logo=telegram&logoColor=white)](https://t.me/tire_price_monitor_bot)

Monitor automático de preços (à vista e parcelado) e disponibilidade de produtos em páginas de busca, com histórico simples e alertas no Telegram.

Bot de alertas: [@tire_price_monitor_bot](https://t.me/tire_price_monitor_bot)

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Linguagem | TypeScript |
| HTTP / scraping | Axios + Cheerio |
| Notificações | Telegram Bot API |
| Histórico | JSONL (arquivo local) |
| Agendamento | Cron (no container) |
| Container | Docker + Docker Compose |
| Testes | Vitest |

## O que faz

- Coleta produtos da URL de busca configurada
- Extrai preço no Pix (à vista), parcelamento e status (disponível/indisponível)
- Salva histórico em arquivo JSONL (`data/price-history.jsonl`)
- Mantém apenas os últimos **3 dias** de histórico
- Envia alerta no Telegram quando:
  - preço à vista ou parcelado muda
  - produto fica disponível ou indisponível
- Envia mensagem no Telegram quando o **container inicia**
- Executa automaticamente via **cron** a cada **2 horas**, entre **06:00 e 22:00** (horário de São Paulo)

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
3. Use o mesmo endpoint `getUpdates` e copie o `chat.id` do grupo (geralmente negativo, ex: `-1001234567890`)

## Instalação e execução

```bash
cp .env.example .env
# Edite .env com MONITOR_URL, TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID

docker compose up --build -d
```

### Executar manualmente (teste)

```bash
docker compose run --rm monitor /app/scripts/run-monitor.sh
```

> Na **primeira execução**, o monitor apenas grava o histórico baseline — **sem alertas retroativos**.

### Ver logs

```bash
docker compose logs -f monitor
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `MONITOR_URL` | URL de busca monitorada | **obrigatório** |
| `HISTORY_FILE` | Caminho do histórico | `/app/data/price-history.jsonl` |
| `HISTORY_RETENTION_HOURS` | Retenção do histórico | `72` (3 dias) |
| `TELEGRAM_BOT_TOKEN` | Token do bot | **obrigatório** |
| `TELEGRAM_CHAT_ID` | ID do chat/grupo | **obrigatório** |
| `TZ` | Fuso horário | `America/Sao_Paulo` |

## Desenvolvimento local

```bash
npm install
npm test
npm run build

# Execução direta (requer .env)
export $(grep -v '^#' .env | xargs)
HISTORY_FILE=./data/price-history.jsonl npm run dev
```

## Estrutura do histórico

Cada linha do arquivo JSONL representa um produto em uma execução:

```json
{
  "id": "0002223",
  "name": "Combo de Pneus Kenda Big Block 90/90-21 + 150/70-17",
  "url": "https://shop.example.com/produto/0002223/p?id=0002223",
  "cashPrice": 1306.82,
  "installmentPrice": 120.67,
  "installmentCount": 12,
  "availability": "in_stock",
  "capturedAt": "2026-06-22T22:00:00.000Z",
  "runId": "uuid-da-execucao"
}
```

## Cron

Agenda configurada em [`cron/monitor.cron`](cron/monitor.cron):

```cron
0 6-22/2 * * *
```

Horários de execução (America/Sao_Paulo): **06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00**.

## Limitações

- O parser depende da estrutura HTML da página de busca configurada
- Mudanças de layout no site podem exigir ajuste nos seletores em [`src/scraper/nitro.ts`](src/scraper/nitro.ts)
- O histórico fica no volume `./data` — faça backup se necessário

## Troubleshooting

| Problema | Solução |
|---|---|
| `MONITOR_URL é obrigatória` | Preencha `MONITOR_URL` no `.env` |
| `TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID são obrigatórias` | Preencha `.env` e recrie o container |
| Bot não envia mensagens | Confirme token/chat ID; envie `/start` ao bot |
| Nenhum produto encontrado | Verifique se a URL de busca ainda retorna resultados |
| Cron não executa | Verifique logs com `docker compose logs -f monitor` |
