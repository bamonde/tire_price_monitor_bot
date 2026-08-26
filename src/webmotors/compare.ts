import { ListingSnapshot, NewListingsResult, SeenStore, WatchConfig } from "./types";
import { filterHighlights, filterMatching } from "./match";

export function isFirstRun(store: SeenStore | null): boolean {
  return store == null || store.ids.length === 0;
}

export function findNewListings(
  watch: WatchConfig,
  listings: ListingSnapshot[],
  previous: SeenStore | null,
): NewListingsResult {
  const allMatching = filterMatching(listings, watch);
  const firstRun = isFirstRun(previous);
  const seen = new Set(previous?.ids ?? []);

  const newListings = firstRun
    ? []
    : allMatching.filter((listing) => !seen.has(listing.id));

  const highlightListings = filterHighlights(newListings, watch);

  return {
    allMatching,
    newListings,
    highlightListings,
    firstRun,
  };
}

export function buildSeenStore(
  watch: WatchConfig,
  listings: ListingSnapshot[],
  previous: SeenStore | null,
): SeenStore {
  const matching = filterMatching(listings, watch);
  const ids = new Set(previous?.ids ?? []);

  for (const listing of matching) {
    ids.add(listing.id);
  }

  return {
    watchId: watch.id,
    updatedAt: new Date().toISOString(),
    ids: [...ids],
  };
}
