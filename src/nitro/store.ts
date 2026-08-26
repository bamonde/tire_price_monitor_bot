import { promises as fs } from "node:fs";
import path from "node:path";
import { HistoryEntry, ProductSnapshot } from "./types";

export async function ensureHistoryDir(historyFile: string): Promise<void> {
  await fs.mkdir(path.dirname(historyFile), { recursive: true });
}

export async function readHistory(historyFile: string): Promise<HistoryEntry[]> {
  try {
    const content = await fs.readFile(historyFile, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as HistoryEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function getLatestSnapshotsByProduct(
  history: HistoryEntry[],
): Map<string, ProductSnapshot> {
  const latest = new Map<string, ProductSnapshot>();

  for (const entry of history) {
    latest.set(entry.id, entry);
  }

  return latest;
}

export async function appendSnapshots(
  historyFile: string,
  runId: string,
  snapshots: ProductSnapshot[],
): Promise<void> {
  if (snapshots.length === 0) {
    return;
  }

  await ensureHistoryDir(historyFile);

  const lines = snapshots.map((snapshot) =>
    JSON.stringify({ ...snapshot, runId } satisfies HistoryEntry),
  );

  await fs.appendFile(historyFile, `${lines.join("\n")}\n`, "utf8");
}

export async function pruneHistory(
  historyFile: string,
  retentionHours: number,
): Promise<number> {
  const history = await readHistory(historyFile);

  if (history.length === 0) {
    return 0;
  }

  const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;
  const kept = history.filter(
    (entry) => new Date(entry.capturedAt).getTime() >= cutoff,
  );

  if (kept.length === history.length) {
    return 0;
  }

  await ensureHistoryDir(historyFile);

  if (kept.length === 0) {
    await fs.writeFile(historyFile, "", "utf8");
  } else {
    await fs.writeFile(
      historyFile,
      `${kept.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
      "utf8",
    );
  }

  return history.length - kept.length;
}

export function isFirstRun(history: HistoryEntry[]): boolean {
  return history.length === 0;
}
