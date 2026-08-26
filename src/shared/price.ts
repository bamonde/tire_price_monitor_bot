/**
 * Converte texto de preço pt-BR (ex: "R$ 1.306,82") para número.
 */
export function parseBrazilianPrice(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }

  const match = text.match(/R\$\s*([\d.]+,\d{2})/);
  if (!match) {
    return null;
  }

  const normalized = match[1].replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);

  return Number.isFinite(value) ? value : null;
}

/**
 * Formata número como moeda BRL para mensagens.
 */
export function formatBrazilianPrice(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
