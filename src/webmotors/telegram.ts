import {
  escapeHtml,
  sendTelegramMessage,
} from "../shared/telegram";
import { formatBrazilianPrice } from "../shared/price";
import { ListingSnapshot, NewListingsResult, WatchConfig } from "./types";

const TELEGRAM_MAX_CHARS = 3900;
const MAX_HIGHLIGHT_CARDS = 8;

export function formatFipeLine(fipePercent: number | null): string {
  if (fipePercent == null) {
    return "FIPE: n/d";
  }

  const delta = Math.round(fipePercent - 100);
  if (delta === 0) {
    return "FIPE: na tabela";
  }

  if (delta < 0) {
    return `FIPE: ${Math.abs(delta)}% abaixo`;
  }

  return `FIPE: ${delta}% acima`;
}

export function formatKm(km: number | null): string {
  if (km == null) {
    return "n/d";
  }

  return `${Math.round(km).toLocaleString("pt-BR")} km`;
}

export function formatLocation(
  city: string | null,
  state: string | null,
): string {
  if (city && state) {
    return `${city}/${state}`;
  }
  if (city) {
    return city;
  }
  if (state) {
    return state;
  }
  return "n/d";
}

export function formatListingCard(listing: ListingSnapshot): string {
  return [
    `<b>${escapeHtml(listing.name)}</b>`,
    `Versão: ${escapeHtml(listing.version || "n/d")}`,
    `Ano: ${listing.year ?? "n/d"}`,
    `Modelo: ${escapeHtml(listing.model)}`,
    `km: ${formatKm(listing.km)}`,
    `Valor: ${formatBrazilianPrice(listing.price)}`,
    formatFipeLine(listing.fipePercent),
    `Vendedor: ${escapeHtml(listing.sellerKind || "n/d")}`,
    `Loja: ${escapeHtml(listing.sellerName || "n/d")}`,
    `Local: ${escapeHtml(formatLocation(listing.city, listing.state))}`,
    `<a href="${listing.url}">Ver anúncio</a>`,
  ].join("\n");
}

export function formatNewListingsMessage(
  watch: WatchConfig,
  result: NewListingsResult,
): string | null {
  if (result.firstRun || result.newListings.length === 0) {
    return null;
  }

  const header = [
    `<b>Webmotors · ${escapeHtml(watch.label)}</b>`,
    `${result.newListings.length} anúncio(s) novo(s)`,
  ];

  const highlights = result.highlightListings;
  if (highlights.length === 0) {
    header.push(`Nenhum com até ${watch.maxKmForLink.toLocaleString("pt-BR")} km.`);
    return header.join("\n");
  }

  header.push(
    `${highlights.length} com até ${watch.maxKmForLink.toLocaleString("pt-BR")} km:`,
    "",
  );

  const cards: string[] = [];
  let omitted = 0;

  for (let i = 0; i < highlights.length; i++) {
    if (i >= MAX_HIGHLIGHT_CARDS) {
      omitted = highlights.length - i;
      break;
    }

    const card = `${i + 1}. ${formatListingCard(highlights[i])}`;
    const candidate = [...header, ...cards, card, ""].join("\n");
    if (candidate.length > TELEGRAM_MAX_CHARS) {
      omitted = highlights.length - i;
      break;
    }
    cards.push(card);
  }

  const parts = [...header, ...cards];
  if (omitted > 0) {
    parts.push(`+${omitted} no critério, omitidos.`);
  }

  return parts.join("\n").trim();
}

export function formatSourceDownMessage(detail: string): string {
  return [
    "<b>Webmotors · fonte fora</b>",
    "",
    escapeHtml(detail),
  ].join("\n");
}

export async function sendNewListingsAlert(
  botToken: string,
  chatId: string,
  watch: WatchConfig,
  result: NewListingsResult,
): Promise<boolean> {
  const message = formatNewListingsMessage(watch, result);
  if (!message) {
    return false;
  }

  await sendTelegramMessage(botToken, chatId, message);
  return true;
}

export async function sendSourceDownAlert(
  botToken: string,
  chatId: string,
  detail: string,
): Promise<void> {
  await sendTelegramMessage(botToken, chatId, formatSourceDownMessage(detail));
}
