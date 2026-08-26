import { WatchConfig } from "./types";

/** Watch: Hyundai HB20 1.0 TGDI 2023–2025, versões alvo. */
export const HB20_TGDI_WATCH: WatchConfig = {
  id: "hb20-tgdi-2023-2025",
  label: "Hyundai HB20 1.0 TGDI · 2023–2025",
  make: "HYUNDAI",
  model: "HB20",
  yearMin: 2023,
  yearMax: 2025,
  versions: [
    "platinum safety",
    "platinum plus",
    "comfort plus",
    "confort plus",
    "limited",
    "platinum",
  ],
  requireTgdi: true,
  maxKmForLink: 50_000,
  maxPages: 5,
};

export function resolveSeenFile(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.WEBMOTORS_SEEN_FILE ?? "/app/data/webmotors/seen.json";
}

export function loadWatch(): WatchConfig {
  return HB20_TGDI_WATCH;
}
