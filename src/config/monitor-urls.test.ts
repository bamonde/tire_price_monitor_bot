import { describe, expect, it } from "vitest";
import { parseMonitorUrls } from "./monitor-urls";

describe("parseMonitorUrls", () => {
  it("aceita MONITOR_URL única", () => {
    expect(
      parseMonitorUrls({
        MONITOR_URL: "https://shop.example.com/busca?a=1",
      }),
    ).toEqual(["https://shop.example.com/busca?a=1"]);
  });

  it("aceita MONITOR_URLS separadas por vírgula", () => {
    expect(
      parseMonitorUrls({
        MONITOR_URLS:
          "https://shop.example.com/busca?a=1,https://shop.example.com/busca?b=2",
      }),
    ).toEqual([
      "https://shop.example.com/busca?a=1",
      "https://shop.example.com/busca?b=2",
    ]);
  });

  it("combina MONITOR_URLS e MONITOR_URL sem duplicar", () => {
    expect(
      parseMonitorUrls({
        MONITOR_URL: "https://shop.example.com/busca?a=1",
        MONITOR_URLS: "https://shop.example.com/busca?a=1,https://shop.example.com/busca?b=2",
      }),
    ).toEqual([
      "https://shop.example.com/busca?a=1",
      "https://shop.example.com/busca?b=2",
    ]);
  });

  it("lança erro quando nenhuma URL está definida", () => {
    expect(() => parseMonitorUrls({})).toThrow(
      "Defina MONITOR_URL ou MONITOR_URLS",
    );
  });
});
