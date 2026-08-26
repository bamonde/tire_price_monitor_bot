/** Pessoa Física | Loja | Concessionária (AdType da Webmotors). */
export type SellerKind = "Pessoa Física" | "Loja" | "Concessionária" | string;

export interface ListingSnapshot {
  id: string;
  sourceId: "webmotors";
  name: string;
  version: string;
  year: number | null;
  model: string;
  km: number | null;
  price: number | null;
  /** Percentual da FIPE (100 = na tabela). null se ausente. */
  fipePercent: number | null;
  /** Tipo do anunciante (PF / Loja / Concessionária). */
  sellerKind: SellerKind | null;
  /** Nome fantasia da loja (PJ). null em Pessoa Física. */
  sellerName: string | null;
  /** Cidade do anúncio. */
  city: string | null;
  /** UF ou estado (ex: SP, São Paulo (SP)). */
  state: string | null;
  url: string;
  capturedAt: string;
}

export interface WatchConfig {
  id: string;
  label: string;
  make: string;
  model: string;
  yearMin: number;
  yearMax: number;
  /** Substrings normalizadas da versão (ordem: mais específica primeiro). */
  versions: string[];
  /** Exige TGDI na versão/título. */
  requireTgdi: boolean;
  /** km máximo para enviar ficha + link. */
  maxKmForLink: number;
  /** Páginas máximas a varrer (ordenação por mais recentes). */
  maxPages: number;
}

export interface WebmotorsConfig {
  watch: WatchConfig;
  seenFile: string;
  telegramBotToken: string;
  telegramChatId: string;
}

export interface SeenStore {
  watchId: string;
  updatedAt: string;
  ids: string[];
}

export interface NewListingsResult {
  allMatching: ListingSnapshot[];
  newListings: ListingSnapshot[];
  highlightListings: ListingSnapshot[];
  firstRun: boolean;
}
