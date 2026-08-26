import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendSnapshots,
  pruneHistory,
  readHistory,
} from "./store";
import { ProductSnapshot } from "./types";

describe("history store", () => {
  it("persiste snapshots e remove entradas antigas", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "history-"));
    const historyFile = path.join(dir, "price-history.jsonl");

    const oldDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date().toISOString();

    const oldEntry = {
      id: "old",
      name: "Old",
      url: "https://example.com/old",
      cashPrice: 1,
      installmentPrice: 1,
      installmentCount: 1,
      availability: "in_stock" as const,
      capturedAt: oldDate,
      runId: "run-old",
    };

    await writeFile(historyFile, `${JSON.stringify(oldEntry)}\n`, "utf8");

    const snapshot: ProductSnapshot = {
      id: "new",
      name: "New",
      url: "https://example.com/new",
      cashPrice: 2,
      installmentPrice: 2,
      installmentCount: 12,
      availability: "in_stock",
      capturedAt: recentDate,
    };

    await appendSnapshots(historyFile, "run-new", [snapshot]);
    const removed = await pruneHistory(historyFile, 72);
    const history = await readHistory(historyFile);

    expect(removed).toBe(1);
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("new");
  });
});
