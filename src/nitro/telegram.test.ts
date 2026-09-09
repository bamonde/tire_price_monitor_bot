import { describe, expect, it } from "vitest";
import { formatStartupMessage } from "./telegram";

describe("formatStartupMessage", () => {
  it("inclui título, jobs e agenda", () => {
    const message = formatStartupMessage();
    expect(message).toContain("Monitor Preços e Classificados");
    expect(message).toContain("Serviço iniciado");
    expect(message).toContain("Webmotors");
    expect(message).toContain("30 min");
    expect(message).toContain("06:00 e 22:00");
  });
});
