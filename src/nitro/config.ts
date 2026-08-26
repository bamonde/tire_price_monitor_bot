export function parseMonitorUrls(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const fromList = (env.MONITOR_URLS ?? "")
    .split(/[,\n]/)
    .map((url) => url.trim())
    .filter(Boolean);

  const single = env.MONITOR_URL?.trim();
  const urls = single ? [...fromList, single] : fromList;
  const unique = [...new Set(urls)];

  if (unique.length === 0) {
    throw new Error(
      "Defina MONITOR_URL ou MONITOR_URLS (URLs separadas por vírgula ou quebra de linha).",
    );
  }

  return unique;
}

export function resolveHistoryFile(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.HISTORY_FILE ?? "/app/data/nitro/price-history.jsonl";
}
