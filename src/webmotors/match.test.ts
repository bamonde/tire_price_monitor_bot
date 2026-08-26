import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HB20_TGDI_WATCH } from "./config";
import {
  buildPermalink,
  parseSearchResponse,
  abbreviateState,
  RawSearchResponse,
} from "./fetch";
import {
  filterHighlights,
  filterMatching,
  isHighlight,
  isRentalSeller,
  matchVersionAlias,
  matchesWatch,
} from "./match";
import { findNewListings, buildSeenStore } from "./compare";
import {
  formatFipeLine,
  formatListingCard,
  formatNewListingsAlert,
  formatNewListingsMessage,
} from "./telegram";
import { ListingSnapshot } from "./types";

const fixturePath = path.join(__dirname, "fixtures", "search-sample.json");

function loadFixtureListings(): ListingSnapshot[] {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as RawSearchResponse;
  return parseSearchResponse(raw, "2026-08-25T00:00:00.000Z");
}

describe("parseSearchResponse", () => {
  it("extrai campos da fixture Webmotors", () => {
    const listings = loadFixtureListings();
    expect(listings.length).toBeGreaterThanOrEqual(5);

    const platinum = listings.find((l) => l.id === "73901769");
    expect(platinum).toBeDefined();
    expect(platinum?.version).toContain("PLATINUM");
    expect(platinum?.km).toBe(43100);
    expect(platinum?.price).toBe(81000);
    expect(platinum?.fipePercent).toBe(93);
    expect(platinum?.sellerKind).toBe("Pessoa Física");
    expect(platinum?.sellerName).toBeNull();
    expect(platinum?.city).toBe("Campinas");
    expect(platinum?.state).toBe("SP");
    expect(platinum?.url).toContain("/73901769/");
  });
});

describe("abbreviateState", () => {
  it("extrai UF de estado completo", () => {
    expect(abbreviateState("São Paulo (SP)")).toBe("SP");
    expect(abbreviateState("sp")).toBe("SP");
    expect(abbreviateState(null)).toBeNull();
  });
});

describe("buildPermalink", () => {
  it("monta URL comprar/", () => {
    const url = buildPermalink({
      UniqueId: 123,
      Specification: {
        Make: { Value: "HYUNDAI" },
        Model: { Value: "HB20" },
        Version: { Value: "1.0 TGDI FLEX PLATINUM AUTOMÁTICO" },
        NumberPorts: "4",
        YearModel: 2023,
      },
    });
    expect(url).toBe(
      "https://www.webmotors.com.br/comprar/hyundai/hb20/1-0-tgdi-flex-platinum-automatico/4-portas/2023/123/",
    );
  });
});

describe("matchVersionAlias", () => {
  it("casa Platinum Safety antes de Platinum", () => {
    expect(
      matchVersionAlias("1.0 TGDI FLEX PLATINUM SAFETY AUTOMÁTICO", [
        "platinum safety",
        "platinum",
      ]),
    ).toBe("platinum safety");
  });

  it("não casa Comfort Plus Tech como Comfort Plus", () => {
    expect(
      matchVersionAlias("1.0 TGDI FLEX COMFORT PLUS TECH AUTOMÁTICO", [
        "comfort plus",
        "confort plus",
      ]),
    ).toBeNull();
  });
});

describe("matchesWatch / highlights", () => {
  it("filtra TGDI + versões do watch", () => {
    const listings = loadFixtureListings();
    const matching = filterMatching(listings, HB20_TGDI_WATCH);

    expect(matching.some((l) => l.id === "73901769")).toBe(true);
    expect(matching.some((l) => l.id === "70788840")).toBe(true);
    expect(matching.some((l) => l.id === "78357315")).toBe(true);
    expect(matching.some((l) => l.id === "65848522")).toBe(false);
    expect(matching.some((l) => l.id === "77802817")).toBe(false);
  });

  it("destaque só com km <= 50000", () => {
    const listings = loadFixtureListings();
    const highlights = filterHighlights(listings, HB20_TGDI_WATCH);

    expect(highlights.some((l) => l.id === "78357315")).toBe(true);
    expect(highlights.some((l) => l.id === "58618372")).toBe(true);
    expect(highlights.some((l) => l.id === "78421541")).toBe(false);
    expect(highlights.some((l) => l.id === "78276902")).toBe(false);
  });

  it("km ausente não destaca", () => {
    const listing: ListingSnapshot = {
      id: "1",
      sourceId: "webmotors",
      name: "HYUNDAI HB20 1.0 TGDI FLEX PLATINUM AUTOMÁTICO",
      version: "1.0 TGDI FLEX PLATINUM AUTOMÁTICO",
      year: 2024,
      model: "HB20",
      km: null,
      price: 90000,
      fipePercent: 100,
      sellerKind: "Pessoa Física",
      sellerName: null,
      city: "Campinas",
      state: "SP",
      url: "https://example.com/1",
      capturedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(matchesWatch(listing, HB20_TGDI_WATCH)).toBe(true);
    expect(isHighlight(listing, HB20_TGDI_WATCH)).toBe(false);
  });

  it("locadora não gera card mesmo com km baixo", () => {
    const listing: ListingSnapshot = {
      id: "rental-1",
      sourceId: "webmotors",
      name: "HYUNDAI HB20 1.0 TGDI FLEX PLATINUM AUTOMÁTICO",
      version: "1.0 TGDI FLEX PLATINUM AUTOMÁTICO",
      year: 2024,
      model: "HB20",
      km: 12000,
      price: 95000,
      fipePercent: 100,
      sellerKind: "Concessionária",
      sellerName: "LOCALIZA SEMINOVOS SP",
      city: "São Paulo",
      state: "SP",
      url: "https://example.com/rental",
      capturedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(isRentalSeller(listing)).toBe(true);
    expect(matchesWatch(listing, HB20_TGDI_WATCH)).toBe(true);
    expect(isHighlight(listing, HB20_TGDI_WATCH)).toBe(false);
  });

  it("detecta Movida, Unidas e outras locadoras", () => {
    expect(
      isRentalSeller({
        id: "1",
        sourceId: "webmotors",
        name: "HB20",
        version: "TGDI PLATINUM",
        year: 2024,
        model: "HB20",
        km: 1,
        price: 1,
        fipePercent: null,
        sellerKind: "Loja",
        sellerName: "Movida Seminovos",
        city: null,
        state: null,
        url: "https://example.com",
        capturedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(true);

    expect(
      isRentalSeller({
        id: "2",
        sourceId: "webmotors",
        name: "HB20",
        version: "TGDI PLATINUM",
        year: 2024,
        model: "HB20",
        km: 1,
        price: 1,
        fipePercent: null,
        sellerKind: "Loja",
        sellerName: "Unidas",
        city: null,
        state: null,
        url: "https://example.com",
        capturedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(true);

    expect(
      isRentalSeller({
        id: "3",
        sourceId: "webmotors",
        name: "HB20",
        version: "TGDI PLATINUM",
        year: 2024,
        model: "HB20",
        km: 1,
        price: 1,
        fipePercent: null,
        sellerKind: "Loja",
        sellerName: "AUTO MECANICA",
        city: null,
        state: null,
        url: "https://example.com",
        capturedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("findNewListings", () => {
  it("primeira execução não gera novos", () => {
    const listings = loadFixtureListings();
    const result = findNewListings(HB20_TGDI_WATCH, listings, null);
    expect(result.firstRun).toBe(true);
    expect(result.newListings).toHaveLength(0);

    const store = buildSeenStore(HB20_TGDI_WATCH, listings, null);
    expect(store.ids.length).toBeGreaterThan(0);
  });

  it("detecta IDs novos após baseline", () => {
    const listings = loadFixtureListings();
    const baseline = buildSeenStore(HB20_TGDI_WATCH, listings, null);
    const known = baseline.ids.slice(0, -1);
    const previous = { ...baseline, ids: known };

    const result = findNewListings(HB20_TGDI_WATCH, listings, previous);
    expect(result.firstRun).toBe(false);
    expect(result.newListings.length).toBe(1);
  });
});

describe("telegram format", () => {
  it("formata FIPE abaixo/acima/n/d", () => {
    expect(formatFipeLine(93)).toBe("FIPE: 7% abaixo");
    expect(formatFipeLine(105)).toBe("FIPE: 5% acima");
    expect(formatFipeLine(100)).toBe("FIPE: na tabela");
    expect(formatFipeLine(null)).toBe("FIPE: n/d");
  });

  it("monta mensagem com volume e cards", () => {
    const listings = loadFixtureListings();
    const matching = filterMatching(listings, HB20_TGDI_WATCH);
    const highlights = filterHighlights(matching, HB20_TGDI_WATCH).slice(0, 2);
    const alert = formatNewListingsAlert(HB20_TGDI_WATCH, {
      allMatching: matching,
      newListings: matching,
      highlightListings: highlights,
      firstRun: false,
    });

    expect(alert).not.toBeNull();
    expect(alert?.messages).toHaveLength(3);

    const [summary, firstCard, secondCard] = alert!.messages;
    expect(summary.text).toContain("Webmotors");
    expect(summary.text).toContain("anúncio(s) novo(s)");
    expect(summary.text).not.toContain("Versão:");
    expect(summary.buttons).toEqual([]);

    expect(firstCard.text).toContain("Versão:");
    expect(firstCard.text).not.toContain("Ver anúncio");
    expect(firstCard.buttons).toEqual([
      { text: "Ver anúncio", url: highlights[0].url },
    ]);
    expect(secondCard.buttons).toEqual([
      { text: "Ver anúncio", url: highlights[1].url },
    ]);
  });

  it("card inclui campos pedidos", () => {
    const listings = loadFixtureListings();
    const platinum = listings.find((l) => l.id === "73901769")!;
    const card = formatListingCard(platinum);
    expect(card).toContain("PLATINUM");
    expect(card).toContain("Ano:");
    expect(card).toContain("Modelo:");
    expect(card).toContain("km:");
    expect(card).toContain("Valor:");
    expect(card).toContain("FIPE:");
    expect(card).toContain("Vendedor: Pessoa Física");
    expect(card).toContain("Loja: n/d");
    expect(card).toContain("Local: Campinas/SP");
    expect(card).not.toContain("Ver anúncio");
    expect(card).not.toContain("<a href");
  });

  it("um único destaque usa botão sem numeração", () => {
    const listings = loadFixtureListings();
    const matching = filterMatching(listings, HB20_TGDI_WATCH);
    const highlights = filterHighlights(matching, HB20_TGDI_WATCH).slice(0, 1);
    const alert = formatNewListingsAlert(HB20_TGDI_WATCH, {
      allMatching: matching,
      newListings: matching,
      highlightListings: highlights,
      firstRun: false,
    });

    expect(alert?.messages).toHaveLength(2);
    expect(alert?.messages[0]?.buttons).toEqual([]);
    expect(alert?.messages[1]?.buttons).toEqual([
      { text: "Ver anúncio", url: highlights[0].url },
    ]);
  });

  it("card de loja inclui nome fantasia", () => {
    const listings = loadFixtureListings();
    const dealer = listings.find((l) => l.id === "70788840")!;
    const card = formatListingCard(dealer);
    expect(card).toContain("Vendedor: Concessionária");
    expect(card).toContain("Loja: AUTO MECANICA");
    expect(card).toContain("Local: Videira/SC");
  });

  it("sem destaque informa nenhum com km", () => {
    const message = formatNewListingsMessage(HB20_TGDI_WATCH, {
      allMatching: [],
      newListings: [
        {
          id: "x",
          sourceId: "webmotors",
          name: "HB20",
          version: "1.0 TGDI FLEX PLATINUM",
          year: 2024,
          model: "HB20",
          km: 80000,
          price: 1,
          fipePercent: null,
          sellerKind: "Loja",
          sellerName: "TESTE",
          city: "Campinas",
          state: "SP",
          url: "https://example.com",
          capturedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      highlightListings: [],
      firstRun: false,
    });
    expect(message).toContain("Nenhum com até");
  });
});
