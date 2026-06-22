import axios from "axios";
import { AlertEvent } from "../domain/types";
import { availabilityLabel } from "./compare";
import { formatBrazilianPrice } from "../utils/price";

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    },
    { timeout: 15_000 },
  );
}

export function formatStartupMessage(): string {
  return [
    "<b>Monitor de Pneus</b>",
    "",
    "Serviço iniciado.",
    "Agenda: a cada 2h entre 06:00 e 22:00 (America/Sao_Paulo).",
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
