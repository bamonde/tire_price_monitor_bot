import { ProductSnapshot } from "../domain/types";

export function mergeProductsById(
  products: ProductSnapshot[],
): ProductSnapshot[] {
  const byId = new Map<string, ProductSnapshot>();

  for (const product of products) {
    byId.set(product.id, product);
  }

  return [...byId.values()];
}
