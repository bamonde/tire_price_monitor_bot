import { describe, expect, it } from "vitest";
import { compareSnapshots } from "../alerts/compare";
import { ProductSnapshot } from "../domain/types";

function snapshot(
  overrides: Partial<ProductSnapshot> & Pick<ProductSnapshot, "id" | "name" | "url">,
): ProductSnapshot {
  return {
    cashPrice: 100,
    installmentPrice: 10,
    installmentCount: 12,
    availability: "in_stock",
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("compareSnapshots", () => {
  it("detecta mudança de preço e disponibilidade", () => {
    const previous = new Map([
      [
        "001",
        snapshot({
          id: "001",
          name: "Produto A",
          url: "https://example.com/a",
          cashPrice: 100,
          installmentPrice: 10,
          availability: "in_stock",
        }),
      ],
    ]);

    const current = [
      snapshot({
        id: "001",
        name: "Produto A",
        url: "https://example.com/a",
        cashPrice: 90,
        installmentPrice: 10,
        availability: "out_of_stock",
      }),
    ];

    const events = compareSnapshots(previous, current);
    expect(events).toHaveLength(2);
    expect(events.some((e) => e.type === "price")).toBe(true);
    expect(events.some((e) => e.type === "availability")).toBe(true);
  });
});
