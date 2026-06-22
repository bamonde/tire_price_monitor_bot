import { describe, expect, it } from "vitest";
import { parseBrazilianPrice, formatBrazilianPrice } from "../utils/price";

describe("parseBrazilianPrice", () => {
  it("converte preço pt-BR para número", () => {
    expect(parseBrazilianPrice("R$ 1.306,82")).toBe(1306.82);
    expect(parseBrazilianPrice("R$ 120,67")).toBe(120.67);
    expect(parseBrazilianPrice("texto inválido")).toBeNull();
  });
});

describe("formatBrazilianPrice", () => {
  it("formata número como moeda BRL", () => {
    expect(formatBrazilianPrice(1306.82)).toContain("1.306,82");
    expect(formatBrazilianPrice(null)).toBe("N/A");
  });
});
