import {
  escapeHtml,
  sendTelegramMessage,
} from "../shared/telegram";
import { formatBrazilianPrice } from "../shared/price";
import { availabilityLabel } from "./compare";
import { AlertEvent } from "./types";

const TELEGRAM_MAX_CHARS = 3900;
const ALERT_TITLE = "Monitor de Pneus";
const MAX_NAME_CHARS = 200;

// Reserva o pior caso do cabeçalho paginado ao montar as páginas.
const HEADER_BUDGET = `<b>${ALERT_TITLE} (99/99)</b>\n\n`.length;

export function formatStartupMessage(): string {
  return [
    "<b>Monitor Preços e Classificados</b>",
    "",
    "Serviço iniciado.",
    "Jobs: Nitro (pneus) + Webmotors (HB20).",
    "Nitro: a cada 2h entre 06:00 e 22:00.",
    "Webmotors: a cada 30 min entre 06:00 e 22:30 (America/Sao_Paulo).",
  ].join("\n");
}

export async function sendStartupNotification(
  botToken: string,
  chatId: string,
): Promise<void> {
  await sendTelegramMessage(botToken, chatId, formatStartupMessage());
}

export async function sendTelegramAlerts(
  botToken: string,
  chatId: string,
  events: AlertEvent[],
): Promise<void> {
  for (const message of formatAlertMessages(events)) {
    await sendTelegramMessage(botToken, chatId, message);
  }
}

// O Telegram rejeita mensagens acima de ~4096 caracteres, então os eventos são
// distribuídos em várias mensagens em vez de perder o alerta inteiro.
export function formatAlertMessages(events: AlertEvent[]): string[] {
  if (events.length === 0) {
    return [];
  }

  const pages = packBlocks(
    events.map(formatSingleEvent),
    TELEGRAM_MAX_CHARS - HEADER_BUDGET,
  );

  return pages.map((blocks, index) => {
    const suffix = pages.length > 1 ? ` (${index + 1}/${pages.length})` : "";
    return `<b>${ALERT_TITLE}${suffix}</b>\n\n${blocks.join("\n\n")}`;
  });
}

function packBlocks(blocks: string[], budget: number): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];

  for (const block of blocks) {
    if (current.length > 0 && [...current, block].join("\n\n").length > budget) {
      pages.push(current);
      current = [block];
      continue;
    }

    current.push(block);
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

// Trunca antes de escapar para não cortar uma entidade HTML pela metade; o
// limite mantém cada bloco muito abaixo do orçamento de uma página.
function formatName(name: string): string {
  const trimmed =
    name.length > MAX_NAME_CHARS ? `${name.slice(0, MAX_NAME_CHARS)}…` : name;
  return escapeHtml(trimmed);
}

function formatSingleEvent(event: AlertEvent): string {
  if (event.type === "availability") {
    return [
      `<b>${formatName(event.name)}</b>`,
      `Status: ${availabilityLabel(event.previousAvailability)} → ${availabilityLabel(event.currentAvailability)}`,
      `<a href="${event.url}">Ver produto</a>`,
    ].join("\n");
  }

  return [
    `<b>${formatName(event.name)}</b>`,
    `À vista: ${formatBrazilianPrice(event.previousCashPrice)} → ${formatBrazilianPrice(event.currentCashPrice)}`,
    `Parcelado: ${formatBrazilianPrice(event.previousInstallmentPrice)} → ${formatBrazilianPrice(event.currentInstallmentPrice)}`,
    `<a href="${event.url}">Ver produto</a>`,
  ].join("\n");
}
