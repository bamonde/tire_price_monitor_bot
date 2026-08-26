import axios from "axios";

export interface TelegramUrlButton {
  text: string;
  url: string;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  options?: { buttons?: TelegramUrlButton[] },
): Promise<void> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (options?.buttons && options.buttons.length > 0) {
    payload.reply_markup = {
      inline_keyboard: options.buttons.map((button) => [
        { text: button.text, url: button.url },
      ]),
    };
  }

  await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    payload,
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
