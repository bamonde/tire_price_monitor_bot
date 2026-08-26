import { promises as fs } from "node:fs";
import path from "node:path";
import { SeenStore } from "./types";

export async function ensureStoreDir(seenFile: string): Promise<void> {
  await fs.mkdir(path.dirname(seenFile), { recursive: true });
}

export async function readSeenStore(
  seenFile: string,
): Promise<SeenStore | null> {
  try {
    const content = await fs.readFile(seenFile, "utf8");
    const parsed = JSON.parse(content) as SeenStore;
    if (!parsed || !Array.isArray(parsed.ids)) {
      return null;
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeSeenStore(
  seenFile: string,
  store: SeenStore,
): Promise<void> {
  await ensureStoreDir(seenFile);
  await fs.writeFile(seenFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}
