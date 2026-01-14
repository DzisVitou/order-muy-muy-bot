const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();

const token = process.env.BOT_TOKEN || "8451277814:AAHK1ocwQLw_gBsTqy3jVRuvc_uLWvIDRj8";
const ADMIN_ID = 889980978;

const bot = new TelegramBot(token, { polling: true });

// =====================
// DATABASE
// =====================
const db = new sqlite3.Database("./orders.db");

db.run(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  customer TEXT,
  item TEXT,
  price TEXT,
  status TEXT
)`);

db.run(`
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  language TEXT
)`);

// =====================
// TRANSLATION
// =====================
const t = (lang, en, kh) => (lang === "kh" ? kh : en);

// =====================
// START
// =====================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🌍 Choose language / ជ្រើសរើសភាសា", {
    reply_markup: {
      keyboard: [["🇺🇸 English"], ["🇰🇭 ខ្មែរ"]],
      resize_keyboard: true
    }
  });
});

// =====================
// ADMIN COMMAND
// =====================
bot.onText(/\/admin/, (msg) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(msg.chat.id, "⛔ Admin only");
  }

  bot.sendMessage(msg.chat.id, "🛠 Admin Dashboard", {
    reply_markup: {
      keyboard: [
        ["📊 All Orders"],
        ["👥 Users Count"],
        ["⬅ Back"]
      ],
      resize_keyboard: true
    }
  });
});

// =====================
// MAIN HANDLER
// =====================
bot.on("message", (msg) => {
  const text = msg.text || "";
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  console.log("📩 MESSAGE:", text);

  if (text.startsWith("/")) return;

  // =====================
  // ADMIN ACTIONS
  // =====================
  if (userId === ADMIN_ID) {

    if (text.includes("All Orders")) {
      db.all(`SELECT * FROM orders`, [], (err, rows) => {
        if (!rows.length) {
          return bot.sendMessage(chatId, "📭 No orders found");
        }

        let reply = "📊 All Orders\n\n";
        rows.forEach(o => {
          reply += `#${o.id} | ${o.customer} | ${o.item} | ${o.price} | ${o.status}\n`;
        });

        bot.sendMessage(chatId, reply);
      });
      return;
    }

    if (text.includes("Users Count")) {
      db.get(`SELECT COUNT(*) AS total FROM users`, [], (_, row) => {
        bot.sendMessage(chatId, `👥 Total users: ${row.total}`);
      });
      return;
    }

    if (text.includes("Back")) {
      bot.sendMessage(chatId, "⬅ Back to menu", {
        reply_markup: {
          keyboard: [
            ["➕ New Order"],
            ["📋 View Orders"]
          ],
          resize_keyboard: true
        }
      });
      return;
    }
  }

  // =====================
  // LANGUAGE SET
  // =====================
  if (text.includes("English") || text.includes("ខ្មែរ")) {
    const lang = text.includes("ខ្មែរ") ? "kh" : "en";

    db.run(
      `INSERT OR REPLACE INTO users (user_id, language) VALUES (?, ?)`,
      [userId, lang]
    );

    bot.sendMessage(
      chatId,
      t(lang, "✅ Language set!", "✅ បានកំណត់ភាសា"),
      {
        reply_markup: {
          keyboard: [
            [t(lang, "➕ New Order", "➕ កម្មង់ថ្មី")],
            [t(lang, "📋 View Orders", "📋 មើលការកម្មង់")]
          ],
          resize_keyboard: true
        }
      }
    );
  }
});

console.log("🤖 Bot running");
