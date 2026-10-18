import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/TELEGRAM_BOT_TOKEN=["']?([^"'\r\n]+)/);
  if (match) {
    const token = match[1].trim();
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    console.log("Telegram getMe status:", data.ok ? `VALID BOT: @${data.result.username} (${data.result.first_name})` : data);
  } else {
    console.log("No TELEGRAM_BOT_TOKEN found in .env.local");
  }
}
