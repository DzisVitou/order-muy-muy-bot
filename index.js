const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();

// =====================
// 🔑 CONFIG
// =====================
const token = "8451277814:AAHK1ocwQLw_gBsTqy3jVRuvc_uLWvIDRj8"; // move to ENV later
const ADMIN_ID = 889980978; // 👈 YOUR Telegram user ID

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
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    language TEXT
  )
`);

// =====================
// TRANSLATION HELPER
// =====================
function t(lang, en, kh) {
  return lang === "kh" ? kh : en;
}

// =====================
// /START COMMAND
// =====================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🌍 Choose language / ជ្រើសរើសភាសា",
    {
      reply_markup: {
        keyboard: [
          ["🇺🇸 English"],
          ["🇰🇭 ខ្មែរ"]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
});

// =====================
// /ADMIN COMMAND
// =====================
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_ID) {
    bot.sendMessage(chatId, "⛔ Admin access only.");
    return;
  }

  bot.sendMessage(chatId, "🛠 Admin Dashboard", {
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
// MAIN MESSAGE HANDLER
// =====================
bot.on("message", (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!text) return;
  if (text === "/start" || text === "/admin") return;

  // =====================
  // 🔐 ADMIN ACTIONS
  // =====================
  if (userId === ADMIN_ID) {

    // 📊 ALL ORDERS
    if (text === "📊 All Orders") {
      db.all(`SELECT * FROM orders`, [], (err, rows) => {
        if (!rows || rows.length === 0) {
          bot.sendMessage(chatId, "📭 No orders found.");
        } else {
          let reply = "📊 All Orders:\n\n";
          rows.forEach(o => {
            reply += `#${o.id}\n👤 ${o.customer}\n📦 ${o.item}\n💰 ${o.price}\n📌 ${o.status}\n\n`;
          });
          bot.sendMessage(chatId, reply);
        }
      });
      return;
    }

    // 👥 USERS COUNT
    if (text === "👥 Users Count") {
      db.get(`SELECT COUNT(*) AS count FROM users`, [], (err, row) => {
        bot.sendMessage(chatId, `👥 Total users: ${row.count}`);
      });
      return;
    }

    // ⬅ BACK
    if (text === "⬅ Back") {
      db.get(
        `SELECT language FROM users WHERE user_id = ?`,
        [userId],
        (err, row) => {
          const lang = row?.language || "en";

          bot.sendMessage(
            chatId,
            t(lang, "Choose an option:", "ជ្រើសរើសមុខងារ៖"),
            {
              reply_markup: {
                keyboard: [
                  [t(lang, "➕ New Order", "➕ កម្មង់ថ្មី")],
                  [t(lang, "📋 View Orders", "📋 មើលការកម្មង់")],
                  [
                    t(lang, "✅ Mark Paid", "✅ បង់ប្រាក់រួច"),
                    t(lang, "📦 Mark Delivered", "📦 បានដឹកជញ្ជូន")
                  ]
                ],
                resize_keyboard: true
              }
            }
          );
        }
      );
      return;
    }
  }

  // =====================
  // 🌍 USER FLOW
  // =====================
  db.get(
    `SELECT language FROM users WHERE user_id = ?`,
    [userId],
    (err, row) => {
      const lang = row?.language || "en";

      // LANGUAGE SELECT
      if (text === "🇺🇸 English" || text === "🇰🇭 ខ្មែរ") {
        const selectedLang = text.includes("ខ្មែរ") ? "kh" : "en";

        db.run(
          `INSERT OR REPLACE INTO users (user_id, language) VALUES (?, ?)`,
          [userId, selectedLang]
        );

        bot.sendMessage(
          chatId,
          t(
            selectedLang,
            "✅ Language set!\nChoose an option:",
            "✅ ភាសាត្រូវបានកំណត់!\nជ្រើសរើសមុខងារ៖"
          ),
          {
            reply_markup: {
              keyboard: [
                [t(selectedLang, "➕ New Order", "➕ កម្មង់ថ្មី")],
                [t(selectedLang, "📋 View Orders", "📋 មើលការកម្មង់")],
                [
                  t(selectedLang, "✅ Mark Paid", "✅ បង់ប្រាក់រួច"),
                  t(selectedLang, "📦 Mark Delivered", "📦 បានដឹកជញ្ជូន")
                ]
              ],
              resize_keyboard: true
            }
          }
        );
        return;
      }
    }
  );
});

console.log("🤖 Bot is running...");
  