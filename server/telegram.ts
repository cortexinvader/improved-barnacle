import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import FormData from 'form-data';
import path from 'path';

interface TelegramConfig {
  botToken?: string;
  chatId?: string;
}

const BACKUP_FILE = process.env.BACKUP_PATH || './data/admin_backup.json';

// Ensure backup directory exists
const backupDir = path.dirname(BACKUP_FILE);
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

export async function sendBackupToTelegram(backupFilePath: string): Promise<void> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Only send if both credentials are configured
    if (!botToken || !chatId) {
      console.log("  ℹ Telegram backup not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)");
      return;
    }

    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("document", await fs.readFile(backupFilePath), {
      filename: "admin_backup.json",
      contentType: "application/json",
    });
    formData.append("caption", `System Backup - ${new Date().toLocaleString()}`);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      {
        method: "POST",
        body: formData as any,
        headers: formData.getHeaders(),
      }
    );

    if (response.ok) {
      console.log("  ✓ Backup sent to Telegram successfully");
    } else {
      const error = await response.text();
      console.error("  ✗ Failed to send backup to Telegram:", error);
    }
  } catch (error) {
    console.error("  ✗ Error sending backup to Telegram:", error);
  }
}