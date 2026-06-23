import { randomUUID } from "node:crypto";
import { sendTelegramAlerts } from "./alerts/telegram";
import { compareSnapshots } from "./alerts/compare";
import { parseMonitorUrls } from "./config/monitor-urls";
import { MonitorConfig } from "./domain/types";
import {
  appendSnapshots,
  getLatestSnapshotsByProduct,
  isFirstRun,
  pruneHistory,
  readHistory,
} from "./history/store";
import { fetchAllProducts } from "./products/fetch-all";

function loadConfig(): MonitorConfig {
  const monitorUrls = parseMonitorUrls();

  const historyFile =
    process.env.HISTORY_FILE ?? "/app/data/price-history.jsonl";

  const retentionHours = Number.parseInt(
    process.env.HISTORY_RETENTION_HOURS ?? "72",
    10,
  );

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !telegramChatId) {
    throw new Error(
      "Variáveis TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID são obrigatórias.",
    );
  }

  if (!Number.isFinite(retentionHours) || retentionHours <= 0) {
    throw new Error("HISTORY_RETENTION_HOURS deve ser um número positivo.");
  }

  return {
    monitorUrls,
    historyFile,
    retentionHours,
    telegramBotToken,
    telegramChatId,
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const runId = randomUUID();
  const startedAt = new Date().toISOString();

  console.log(`[${startedAt}] Iniciando monitor (runId=${runId})`);
  console.log(`URLs monitoradas: ${config.monitorUrls.length}`);
  for (const url of config.monitorUrls) {
    console.log(`- ${url}`);
  }

  const history = await readHistory(config.historyFile);
  const previousSnapshots = getLatestSnapshotsByProduct(history);
  const firstRun = isFirstRun(history);

  const products = await fetchAllProducts(config.monitorUrls);
  console.log(`Produtos encontrados: ${products.length}`);

  if (products.length === 0) {
    throw new Error("Nenhum produto encontrado nas páginas monitoradas.");
  }

  await appendSnapshots(config.historyFile, runId, products);

  const removed = await pruneHistory(
    config.historyFile,
    config.retentionHours,
  );

  if (removed > 0) {
    console.log(`Histórico expurgado: ${removed} registro(s) removido(s).`);
  }

  if (firstRun) {
    console.log(
      "Primeira execução: histórico salvo sem envio de alertas retroativos.",
    );
    return;
  }

  const events = compareSnapshots(previousSnapshots, products);

  if (events.length === 0) {
    console.log("Nenhuma mudança detectada.");
    return;
  }

  console.log(`Mudanças detectadas: ${events.length}`);
  await sendTelegramAlerts(
    config.telegramBotToken,
    config.telegramChatId,
    events,
  );
  console.log("Alertas enviados ao Telegram.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Erro no monitor: ${message}`);
  process.exitCode = 1;
});
