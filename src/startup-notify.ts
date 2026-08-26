import { sendStartupNotification } from "./nitro/telegram";

async function main(): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log("Telegram não configurado; notificação de startup ignorada.");
    return;
  }

  try {
    await sendStartupNotification(botToken, chatId);
    console.log("Notificação de startup enviada ao Telegram.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha ao enviar notificação de startup: ${message}`);
  }
}

main();
