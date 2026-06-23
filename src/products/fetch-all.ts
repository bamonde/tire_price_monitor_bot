import { ProductSnapshot } from "../domain/types";
import { fetchProducts } from "../scraper/nitro";
import { mergeProductsById } from "./merge";

export async function fetchAllProducts(
  monitorUrls: string[],
): Promise<ProductSnapshot[]> {
  const batches = await Promise.all(
    monitorUrls.map((url) => fetchProducts(url)),
  );

  return mergeProductsById(batches.flat());
}
