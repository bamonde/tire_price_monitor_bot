import { describe, expect, it } from "vitest";
import { formatAlertMessages, formatStartupMessage } from "./telegram";
import { AlertEvent } from "./types";

const TELEGRAM_LIMIT = 4096;

function priceEvent(index: number, name?: string): AlertEvent {
  return {
    type: "price",
    productId: `000${index}`,
    name: name ?? `Combo de Pneus Marca Modelo ${index} 90/90-21 + 150/70-17 TL`,
    url: `https://www.varellamotos.com.br/produto/000${index}/p?id=000${index}`,
    previousCashPrice: 1900 + index,
    currentCashPrice: 2100 + index,
    previousInstallmentPrice: 170 + index,
    currentInstallmentPrice: 180 + index,
  };
}

describe("formatStartupMessage", () => {
  it("inclui título, jobs e agenda", () => {
    const message = formatStartupMessage();
    expect(message).toContain("Monitor Preços e Classificados");
    expect(message).toContain("Serviço iniciado");
    expect(message).toContain("Webmotors (HB20) desativado");
    expect(message).not.toContain("30 min");
    expect(message).toContain("06:00 e 22:00");
  });
});

describe("formatAlertMessages", () => {
  it("não gera mensagem sem eventos", () => {
    expect(formatAlertMessages([])).toEqual([]);
  });

  it("mantém uma única mensagem sem numeração quando cabe no limite", () => {
    const messages = formatAlertMessages([priceEvent(1), priceEvent(2)]);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("<b>Monitor de Pneus</b>");
    expect(messages[0]).not.toContain("(1/1)");
  });

  it("divide em várias mensagens dentro do limite do Telegram", () => {
    const events = Array.from({ length: 60 }, (_, i) => priceEvent(i));
    const messages = formatAlertMessages(events);

    expect(messages.length).toBeGreaterThan(1);
    for (const message of messages) {
      expect(message.length).toBeLessThanOrEqual(TELEGRAM_LIMIT);
    }
  });

  it("numera as páginas e não perde nenhum evento", () => {
    const events = Array.from({ length: 60 }, (_, i) => priceEvent(i));
    const messages = formatAlertMessages(events);
    const combined = messages.join("\n");

    expect(messages[0]).toContain(`<b>Monitor de Pneus (1/${messages.length})</b>`);
    for (const event of events) {
      expect(combined).toContain(event.url);
    }
  });

  it("trunca nome muito longo sem quebrar o HTML nem o limite", () => {
    const messages = formatAlertMessages([priceEvent(1, "A".repeat(5000))]);

    expect(messages).toHaveLength(1);
    expect(messages[0].length).toBeLessThanOrEqual(TELEGRAM_LIMIT);
    expect(messages[0]).toContain("…</b>");
  });

  it("escapa HTML do nome após truncar", () => {
    const messages = formatAlertMessages([priceEvent(1, "Pneu <Aro> & Cia")]);

    expect(messages[0]).toContain("Pneu &lt;Aro&gt; &amp; Cia");
  });
});
