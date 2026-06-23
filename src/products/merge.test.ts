import { describe, expect, it } from "vitest";
import { ProductSnapshot } from "../domain/types";
import { mergeProductsById } from "./merge";

function product(
  id: string,
  overrides: Partial<ProductSnapshot> = {},
): ProductSnapshot {
  return {
    id,
    name: `Produto ${id}`,
    url: `https://shop.example.com/p?id=${id}`,
    cashPrice: 100,
    installmentPrice: 10,
    installmentCount: 12,
    availability: "in_stock",
    capturedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mergeProductsById", () => {
  it("deduplica produtos pelo id", () => {
    const merged = mergeProductsById([
      product("001", { cashPrice: 100 }),
      product("002"),
      product("001", { cashPrice: 90 }),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.id === "001")?.cashPrice).toBe(90);
  });
});
