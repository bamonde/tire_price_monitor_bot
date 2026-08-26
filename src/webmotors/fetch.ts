import axios from "axios";
import { ListingSnapshot, WatchConfig } from "./types";

const API_BASE = "https://www.webmotors.com.br/api/search/car.xml";
const PAGE_SIZE = 24;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Order=1: relevância (mistura usados). Preferimos varrer páginas e filtrar. */
const ORDER_RELEVANCE = "1";

export interface RawSearchResult {
  UniqueId?: number | string;
  Specification?: {
    Title?: string;
    Make?: { Value?: string };
    Model?: { Value?: string };
    Version?: { Value?: string };
    YearFabrication?: string;
    YearModel?: number;
    Odometer?: number;
    NumberPorts?: string | number;
  };
  Prices?: { Price?: number };
  FipePercent?: number | null;
  Seller?: {
    SellerType?: string;
    FantasyName?: string;
    City?: string;
    State?: string;
    AdType?: { id?: number; Value?: string };
    Localization?: Array<{
      City?: string;
      State?: string;
      AbbrState?: string;
      Neighborhood?: string;
    }>;
  };
}

export interface RawSearchResponse {
  SearchResults?: RawSearchResult[];
  Pagination?: { PageCurrent?: number; PageTotal?: number };
}

export function buildSearchUrl(
  watch: WatchConfig,
  page: number,
): string {
  const params = new URLSearchParams();
  params.set("actualPage", String(page));
  params.set("displayPerPage", String(PAGE_SIZE));
  params.set("marca1", watch.make);
  params.set("modelo1", watch.model);
  params.set("anoDe", String(watch.yearMin));
  params.set("anoAte", String(watch.yearMax));
  params.set("Order", ORDER_RELEVANCE);
  return `${API_BASE}?${params.toString()}`;
}

export function buildPermalink(raw: RawSearchResult): string {
  const spec = raw.Specification ?? {};
  const makeSlug = slugify(spec.Make?.Value ?? "");
  const modelSlug = slugify(spec.Model?.Value ?? "");
  const versionSlug = slugify(spec.Version?.Value ?? "");
  const doors = spec.NumberPorts ?? 4;
  const year = Math.trunc(spec.YearModel ?? 0);
  const id = raw.UniqueId ?? 0;
  return `https://www.webmotors.com.br/comprar/${makeSlug}/${modelSlug}/${versionSlug}/${doors}-portas/${year}/${id}/`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseListing(
  raw: RawSearchResult,
  capturedAt: string = new Date().toISOString(),
): ListingSnapshot | null {
  const spec = raw.Specification ?? {};
  const title = spec.Title?.trim();
  if (!title || raw.UniqueId == null) {
    return null;
  }

  const yearRaw = spec.YearModel;
  const year =
    typeof yearRaw === "number" && Number.isFinite(yearRaw)
      ? Math.trunc(yearRaw)
      : null;

  const kmRaw = spec.Odometer;
  const km =
    typeof kmRaw === "number" && Number.isFinite(kmRaw) ? kmRaw : null;

  const priceRaw = raw.Prices?.Price;
  const price =
    typeof priceRaw === "number" && Number.isFinite(priceRaw)
      ? priceRaw
      : null;

  const fipeRaw = raw.FipePercent;
  const fipePercent =
    typeof fipeRaw === "number" && Number.isFinite(fipeRaw) ? fipeRaw : null;

  const seller = raw.Seller ?? {};
  const localization = seller.Localization?.[0];
  const sellerKind = seller.AdType?.Value?.trim() || null;
  const sellerName = seller.FantasyName?.trim() || null;
  const city =
    seller.City?.trim() || localization?.City?.trim() || null;
  const stateFromAbbr =
    localization?.AbbrState && /^[A-Z]{2}$/i.test(localization.AbbrState.trim())
      ? localization.AbbrState.trim().toUpperCase()
      : null;
  const state =
    abbreviateState(seller.State) ||
    stateFromAbbr ||
    abbreviateState(localization?.State) ||
    null;

  return {
    id: String(raw.UniqueId),
    sourceId: "webmotors",
    name: title,
    version: spec.Version?.Value?.trim() ?? "",
    year,
    model: spec.Model?.Value?.trim() ?? "HB20",
    km,
    price,
    fipePercent,
    sellerKind,
    sellerName,
    city,
    state,
    url: buildPermalink(raw),
    capturedAt,
  };
}

/** Extrai UF de "São Paulo (SP)" ou devolve o texto se já for curto. */
export function abbreviateState(state: string | null | undefined): string | null {
  if (!state?.trim()) {
    return null;
  }

  const trimmed = state.trim();
  const paren = trimmed.match(/\(([A-Z]{2})\)\s*$/);
  if (paren) {
    return paren[1];
  }

  if (/^[A-Z]{2}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return trimmed;
}

export function parseSearchResponse(
  data: RawSearchResponse,
  capturedAt: string = new Date().toISOString(),
): ListingSnapshot[] {
  const results = data.SearchResults ?? [];
  const listings: ListingSnapshot[] = [];

  for (const raw of results) {
    const listing = parseListing(raw, capturedAt);
    if (listing) {
      listings.push(listing);
    }
  }

  return listings;
}

export async function fetchSearchPage(
  watch: WatchConfig,
  page: number,
): Promise<RawSearchResponse> {
  const url = buildSearchUrl(watch, page);
  const response = await axios.get<RawSearchResponse>(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
    timeout: 30_000,
    validateStatus: (status) => status < 500,
  });

  if (response.status === 403 || response.status === 401) {
    throw new Error(
      `Webmotors bloqueou a busca (HTTP ${response.status}). Sem bypass — use alerta nativo do app.`,
    );
  }

  if (response.status !== 200) {
    throw new Error(`Webmotors retornou HTTP ${response.status}.`);
  }

  if (!response.data || !Array.isArray(response.data.SearchResults)) {
    throw new Error(
      "Resposta da Webmotors sem SearchResults — estrutura pode ter mudado.",
    );
  }

  return response.data;
}

export async function fetchWatchListings(
  watch: WatchConfig,
): Promise<ListingSnapshot[]> {
  const capturedAt = new Date().toISOString();
  const byId = new Map<string, ListingSnapshot>();

  for (let page = 1; page <= watch.maxPages; page++) {
    const data = await fetchSearchPage(watch, page);
    const pageListings = parseSearchResponse(data, capturedAt);

    if (pageListings.length === 0) {
      break;
    }

    for (const listing of pageListings) {
      byId.set(listing.id, listing);
    }

    if (pageListings.length < PAGE_SIZE) {
      break;
    }
  }

  return [...byId.values()];
}
