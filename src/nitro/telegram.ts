import {
  escapeHtml,
  sendTelegramMessage,
} from "../shared/telegram";
import { formatBrazilianPrice } from "../shared/price";
import { availabilityLabel } from "./compare";
import { AlertEvent } from "./types";

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
  if (events.length === 0) {
    return;
  }

  await sendTelegramMessage(botToken, chatId, formatAlertMessage(events));
}

export function formatAlertMessage(events: AlertEvent[]): string {
  const header = "<b>Monitor de Pneus</b>\n\n";
  const blocks = events.map(formatSingleEvent);
  return `${header}${blocks.join("\n\n")}`;
}

function formatSingleEvent(event: AlertEvent): string {
  if (event.type === "availability") {
    return [
      `<b>${escapeHtml(event.name)}</b>`,
      `Status: ${availabilityLabel(event.previousAvailability)} → ${availabilityLabel(event.currentAvailability)}`,
      `<a href="${event.url}">Ver produto</a>`,
    ].join("\n");
  }

  return [
    `<b>${escapeHtml(event.name)}</b>`,
    `À vista: ${formatBrazilianPrice(event.previousCashPrice)} → ${formatBrazilianPrice(event.currentCashPrice)}`,
    `Parcelado: ${formatBrazilianPrice(event.previousInstallmentPrice)} → ${formatBrazilianPrice(event.currentInstallmentPrice)}`,
    `<a href="${event.url}">Ver produto</a>`,
  ].join("\n");
}
