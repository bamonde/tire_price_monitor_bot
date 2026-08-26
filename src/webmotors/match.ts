import { ListingSnapshot, WatchConfig } from "./types";

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trechos do nome do anunciante/loja que indicam locadora.
 * Match por substring no sellerName (e no título como fallback).
 */
export const RENTAL_SELLER_NEEDLES = [
  "localiza",
  "movida",
  "unidas",
  "hertz",
  "avis",
  "alamo",
  "enterprise",
  "budget",
  "foco seminovos",
  "foco rent",
  "foco locadora",
  "vamos seminovos",
  "vamos locacao",
  "vamos locadora",
  "locamerica",
  "loc america",
  "ouro verde",
  "turbi",
  "moover",
  "yes rent",
  "rent a car",
  "rentacar",
  "locadora",
  "lm frota",
  "lm rent",
  "seminovos localiza",
  "seminovos movida",
  "seminovos unidas",
] as const;

/**
 * True se o anunciante parece locadora (Localiza, Movida, Unidas, etc.).
 */
export function isRentalSeller(listing: ListingSnapshot): boolean {
  const corpus = normalizeText(
    [listing.sellerName, listing.name].filter(Boolean).join(" "),
  );

  if (!corpus) {
    return false;
  }

  return RENTAL_SELLER_NEEDLES.some((needle) =>
    corpus.includes(normalizeText(needle)),
  );
}

/**
 * Retorna o alias de versão casado, ou null.
 * Comfort Plus Tech não conta como Comfort Plus.
 */
export function matchVersionAlias(
  version: string,
  aliases: string[],
): string | null {
  const normalized = normalizeText(version);

  for (const alias of aliases) {
    const needle = normalizeText(alias);
    if (!needle || !normalized.includes(needle)) {
      continue;
    }

    if (needle === "comfort plus" || needle === "confort plus") {
      if (/\bplus\s+tech\b/.test(normalized)) {
        continue;
      }
    }

    if (needle === "platinum") {
      if (
        normalized.includes("platinum safety") ||
        normalized.includes("platinum plus")
      ) {
        continue;
      }
    }

    return alias;
  }

  return null;
}

export function matchesWatch(
  listing: ListingSnapshot,
  watch: WatchConfig,
): boolean {
  const corpus = normalizeText(`${listing.name} ${listing.version}`);

  if (watch.requireTgdi && !corpus.includes("tgdi")) {
    return false;
  }

  if (listing.year != null) {
    if (listing.year < watch.yearMin || listing.year > watch.yearMax) {
      return false;
    }
  }

  return matchVersionAlias(listing.version || listing.name, watch.versions) != null;
}

export function isHighlight(
  listing: ListingSnapshot,
  watch: WatchConfig,
): boolean {
  if (!matchesWatch(listing, watch)) {
    return false;
  }

  if (isRentalSeller(listing)) {
    return false;
  }

  if (listing.km == null) {
    return false;
  }

  return listing.km <= watch.maxKmForLink;
}

export function filterMatching(
  listings: ListingSnapshot[],
  watch: WatchConfig,
): ListingSnapshot[] {
  return listings.filter((listing) => matchesWatch(listing, watch));
}

export function filterHighlights(
  listings: ListingSnapshot[],
  watch: WatchConfig,
): ListingSnapshot[] {
  return listings
    .filter((listing) => isHighlight(listing, watch))
    .sort((a, b) => (a.km ?? Number.POSITIVE_INFINITY) - (b.km ?? Number.POSITIVE_INFINITY));
}
