import { describe, expect, it } from "vitest";
import { formatStartupMessage } from "../alerts/telegram";

describe("formatStartupMessage", () => {
  it("inclui título e agenda", () => {
    const message = formatStartupMessage();
    expect(message).toContain("Monitor de Pneus");
    expect(message).toContain("Serviço iniciado");
    expect(message).toContain("06:00 e 22:00");
  });
});
