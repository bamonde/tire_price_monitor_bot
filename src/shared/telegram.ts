import axios from "axios";

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    },
    { timeout: 15_000 },
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function getTelegramCredentials(
  env: NodeJS.ProcessEnv = process.env,
): { botToken: string; chatId: string } {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error(
      "Variáveis TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID são obrigatórias.",
    );
  }

  return { botToken, chatId };
}
