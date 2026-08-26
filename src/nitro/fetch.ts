import axios from "axios";
import * as cheerio from "cheerio";
import { Availability, ProductSnapshot } from "./types";
import { parseBrazilianPrice } from "../shared/price";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function deriveBaseUrl(monitorUrl: string): string {
  return new URL(monitorUrl).origin;
}

export async function fetchProducts(monitorUrl: string): Promise<ProductSnapshot[]> {
  const response = await axios.get<string>(monitorUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
    timeout: 30_000,
    responseType: "text",
  });

  return parseProductsFromHtml(response.data, deriveBaseUrl(monitorUrl));
}

export function parseProductsFromHtml(
  html: string,
  baseUrl: string,
): ProductSnapshot[] {
  const $ = cheerio.load(html);
  const capturedAt = new Date().toISOString();
  const products: ProductSnapshot[] = [];

  $("a#product-card").each((_, element) => {
    const card = $(element);
    const href = card.attr("href") ?? "";
    const url = href.startsWith("http") ? href : `${baseUrl}${href}`;
    const name =
      card.find("p[title]").first().attr("title")?.trim() ??
      card.find("p[title]").first().text().trim();

    if (!name) {
      return;
    }

    const id = extractProductId(url, name);
    const cardText = card.text();
    const availability = detectAvailability(card, cardText);
    const cashPrice = extractCashPrice(card, cardText);
    const { installmentPrice, installmentCount } = extractInstallment(cardText);

    products.push({
      id,
      name,
      url,
      cashPrice,
      installmentPrice,
      installmentCount,
      availability,
      capturedAt,
    });
  });

  return products;
}

function extractProductId(url: string, name: string): string {
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch) {
    return idMatch[1];
  }

  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function detectAvailability(
  card: cheerio.Cheerio<any>,
  cardText: string,
): Availability {
  if (/indispon[ií]vel/i.test(cardText)) {
    return "out_of_stock";
  }

  const buyButton = card.find("p").filter((_, el) => {
    return cheerio.load(el).text().trim().toLowerCase() === "comprar";
  });

  if (buyButton.length > 0) {
    return "in_stock";
  }

  return "out_of_stock";
}

function extractCashPrice(
  card: cheerio.Cheerio<any>,
  cardText: string,
): number | null {
  const priceSpan = card.find("span.text-\\[20px\\].font-semibold").first();
  const fromSpan = parseBrazilianPrice(priceSpan.text());

  if (fromSpan !== null) {
    return fromSpan;
  }

  const pixMatch = cardText.match(/R\$\s*[\d.]+,\d{2}\s*no\s*Pix/i);
  return parseBrazilianPrice(pixMatch?.[0]);
}

function extractInstallment(cardText: string): {
  installmentPrice: number | null;
  installmentCount: number | null;
} {
  const match = cardText.match(/(\d+)\s*x\s*de\s*(R\$\s*[\d.]+,\d{2})/i);

  if (!match) {
    return { installmentPrice: null, installmentCount: null };
  }

  return {
    installmentCount: Number.parseInt(match[1], 10),
    installmentPrice: parseBrazilianPrice(match[2]),
  };
}

export async function fetchAllProducts(
  monitorUrls: string[],
): Promise<ProductSnapshot[]> {
  const batches = await Promise.all(
    monitorUrls.map((url) => fetchProducts(url)),
  );

  return mergeProductsById(batches.flat());
}

export function mergeProductsById(
  products: ProductSnapshot[],
): ProductSnapshot[] {
  const byId = new Map<string, ProductSnapshot>();

  for (const product of products) {
    byId.set(product.id, product);
  }

  return [...byId.values()];
}
