import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deriveBaseUrl, parseProductsFromHtml } from "../scraper/nitro";

const fixturePath = path.join(__dirname, "fixtures", "search-sample.html");

const monitorUrl = "https://shop.example.com/busca?page=1&search=90%2F90-21";

describe("deriveBaseUrl", () => {
  it("extrai origin da MONITOR_URL", () => {
    expect(deriveBaseUrl(monitorUrl)).toBe("https://shop.example.com");
  });
});

describe("parseProductsFromHtml", () => {
  it("extrai preço à vista, parcelado e disponibilidade", () => {
    const html = readFileSync(fixturePath, "utf8");
    const products = parseProductsFromHtml(html, deriveBaseUrl(monitorUrl));

    expect(products.length).toBeGreaterThanOrEqual(2);

    const available = products.find((p) => p.id === "0002223");
    expect(available).toBeDefined();
    expect(available?.name).toContain("Kenda Big Block");
    expect(available?.cashPrice).toBe(1306.82);
    expect(available?.installmentPrice).toBe(120.67);
    expect(available?.installmentCount).toBe(12);
    expect(available?.availability).toBe("in_stock");
    expect(available?.url).toBe(
      "https://shop.example.com/combo-de-pneus-kenda-big-block-90-90-21--150-70-17/0002223/p?id=0002223",
    );

    const unavailable = products.find((p) => p.availability === "out_of_stock");
    expect(unavailable).toBeDefined();
    expect(unavailable?.availability).toBe("out_of_stock");
  });
});
