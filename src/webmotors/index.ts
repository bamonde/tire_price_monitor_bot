import { getTelegramCredentials } from "../shared/telegram";
import { findNewListings, buildSeenStore } from "./compare";
import { loadWatch, resolveSeenFile } from "./config";
import { fetchWatchListings } from "./fetch";
import { readSeenStore, writeSeenStore } from "./store";
import {
  sendNewListingsAlert,
  sendSourceDownAlert,
} from "./telegram";
import { WebmotorsConfig } from "./types";

function loadConfig(): WebmotorsConfig {
  const { botToken, chatId } = getTelegramCredentials();
  return {
    watch: loadWatch(),
    seenFile: resolveSeenFile(),
    telegramBotToken: botToken,
    telegramChatId: chatId,
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const startedAt = new Date().toISOString();

  console.log(`[${startedAt}] Iniciando monitor Webmotors`);
  console.log(`Watch: ${config.watch.label} (${config.watch.id})`);

  let listings;
  try {
    listings = await fetchWatchListings(config.watch);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Webmotors fora: ${message}`);
    try {
      await sendSourceDownAlert(
        config.telegramBotToken,
        config.telegramChatId,
        message,
      );
    } catch (notifyError: unknown) {
      const notifyMessage =
        notifyError instanceof Error ? notifyError.message : String(notifyError);
      console.error(`Falha ao notificar fonte fora: ${notifyMessage}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Anúncios brutos na busca: ${listings.length}`);

  const previous = await readSeenStore(config.seenFile);
  const result = findNewListings(config.watch, listings, previous);

  console.log(`Matching watch: ${result.allMatching.length}`);
  console.log(`Novos: ${result.newListings.length}`);
  console.log(`Destaque (≤${config.watch.maxKmForLink} km): ${result.highlightListings.length}`);

  const nextStore = buildSeenStore(config.watch, listings, previous);
  await writeSeenStore(config.seenFile, nextStore);

  if (result.firstRun) {
    console.log(
      `Primeira execução: ${nextStore.ids.length} ID(s) salvos sem alerta.`,
    );
    return;
  }

  if (result.newListings.length === 0) {
    console.log("Nenhum anúncio novo.");
    return;
  }

  const sent = await sendNewListingsAlert(
    config.telegramBotToken,
    config.telegramChatId,
    config.watch,
    result,
  );

  if (sent) {
    console.log("Alerta enviado ao Telegram.");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Erro no monitor Webmotors: ${message}`);
  process.exitCode = 1;
});
