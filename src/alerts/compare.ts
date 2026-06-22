import {
  AlertEvent,
  Availability,
  ProductSnapshot,
} from "../domain/types";

function pricesEqual(a: number | null, b: number | null): boolean {
  return a === b;
}

export function compareSnapshots(
  previous: Map<string, ProductSnapshot>,
  current: ProductSnapshot[],
): AlertEvent[] {
  const events: AlertEvent[] = [];
  const currentIds = new Set(current.map((product) => product.id));

  for (const product of current) {
    const prior = previous.get(product.id);

    if (!prior) {
      continue;
    }

    if (prior.availability !== product.availability) {
      events.push({
        type: "availability",
        productId: product.id,
        name: product.name,
        url: product.url,
        previousAvailability: prior.availability,
        currentAvailability: product.availability,
      });
    }

    const cashChanged = !pricesEqual(prior.cashPrice, product.cashPrice);
    const installmentChanged = !pricesEqual(
      prior.installmentPrice,
      product.installmentPrice,
    );

    if (cashChanged || installmentChanged) {
      events.push({
        type: "price",
        productId: product.id,
        name: product.name,
        url: product.url,
        previousCashPrice: prior.cashPrice,
        currentCashPrice: product.cashPrice,
        previousInstallmentPrice: prior.installmentPrice,
        currentInstallmentPrice: product.installmentPrice,
      });
    }
  }

  for (const [productId, prior] of previous) {
    if (currentIds.has(productId)) {
      continue;
    }

    if (prior.availability !== "out_of_stock") {
      events.push({
        type: "availability",
        productId,
        name: prior.name,
        url: prior.url,
        previousAvailability: prior.availability,
        currentAvailability: "out_of_stock",
      });
    }
  }

  return events;
}

export function availabilityLabel(availability: Availability): string {
  return availability === "in_stock" ? "Disponível" : "Indisponível";
}
