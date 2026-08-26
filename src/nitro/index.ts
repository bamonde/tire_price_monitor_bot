import { randomUUID } from "node:crypto";
import { getTelegramCredentials } from "../shared/telegram";
import { parseMonitorUrls, resolveHistoryFile } from "./config";
import { compareSnapshots } from "./compare";
import { fetchAllProducts } from "./fetch";
import {
  appendSnapshots,
  getLatestSnapshotsByProduct,
  isFirstRun,
  pruneHistory,
  readHistory,
} from "./store";
import { sendTelegramAlerts } from "./telegram";
import { NitroConfig } from "./types";

function loadConfig(): NitroConfig {
  const monitorUrls = parseMonitorUrls();
  const historyFile = resolveHistoryFile();
  const retentionHours = Number.parseInt(
    process.env.HISTORY_RETENTION_HOURS ?? "72",
    10,
  );
  const { botToken, chatId } = getTelegramCredentials();

  if (!Number.isFinite(retentionHours) || retentionHours <= 0) {
    throw new Error("HISTORY_RETENTION_HOURS deve ser um número positivo.");
  }

  return {
    monitorUrls,
    historyFile,
    retentionHours,
    telegramBotToken: botToken,
    telegramChatId: chatId,
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const runId = randomUUID();
  const startedAt = new Date().toISOString();

  console.log(`[${startedAt}] Iniciando monitor Nitro (runId=${runId})`);
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
  console.error(`Erro no monitor Nitro: ${message}`);
  process.exitCode = 1;
});
