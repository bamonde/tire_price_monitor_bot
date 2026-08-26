import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readSeenStore, writeSeenStore } from "./store";

describe("webmotors store", () => {
  it("persiste e lê IDs vistos", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "wm-seen-"));
    const seenFile = path.join(dir, "seen.json");

    await writeSeenStore(seenFile, {
      watchId: "hb20-tgdi-2023-2025",
      updatedAt: "2026-08-25T00:00:00.000Z",
      ids: ["1", "2"],
    });

    const loaded = await readSeenStore(seenFile);
    expect(loaded?.ids).toEqual(["1", "2"]);
    expect(loaded?.watchId).toBe("hb20-tgdi-2023-2025");
  });

  it("retorna null se arquivo não existe", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "wm-seen-"));
    const seenFile = path.join(dir, "missing.json");
    expect(await readSeenStore(seenFile)).toBeNull();
  });
});
