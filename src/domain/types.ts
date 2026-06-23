export type Availability = "in_stock" | "out_of_stock";

export interface ProductSnapshot {
  id: string;
  name: string;
  url: string;
  cashPrice: number | null;
  installmentPrice: number | null;
  installmentCount: number | null;
  availability: Availability;
  capturedAt: string;
}

export interface HistoryEntry extends ProductSnapshot {
  runId: string;
}

export interface PriceChange {
  type: "price";
  productId: string;
  name: string;
  url: string;
  previousCashPrice: number | null;
  currentCashPrice: number | null;
  previousInstallmentPrice: number | null;
  currentInstallmentPrice: number | null;
}

export interface AvailabilityChange {
  type: "availability";
  productId: string;
  name: string;
  url: string;
  previousAvailability: Availability;
  currentAvailability: Availability;
}

export type AlertEvent = PriceChange | AvailabilityChange;

export interface MonitorConfig {
  monitorUrls: string[];
  historyFile: string;
  retentionHours: number;
  telegramBotToken: string;
  telegramChatId: string;
}
