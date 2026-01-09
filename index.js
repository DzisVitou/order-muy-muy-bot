const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();

// 🔑 TOKEN (move to ENV later)
const token = "8451277814:AAHK1ocwQLw_gBsTqy3jVRuvc_uLWvIDRj8";
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
// /START → LANGUAGE MENU
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
// MAIN MESSAGE HANDLER
// =====================
bot.on("message", (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (text === "/start") return;

  // Get user language
  db.get(
    `SELECT language FROM users WHERE user_id = ?`,
    [userId],
    (err, row) => {
      const lang = row?.language || "en";

      // =====================
      // LANGUAGE SELECTION
      // =====================
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

      // =====================
      // NEW ORDER
      // =====================
      if (text === t(lang, "➕ New Order", "➕ កម្មង់ថ្មី")) {
        bot.sendMessage(chatId, t(lang, "Customer name?", "ឈ្មោះអតិថិជន?"));

        bot.once("message", (m1) => {
          const customer = m1.text;

          bot.sendMessage(chatId, t(lang, "Item?", "មុខទំនិញ?"));
          bot.once("message", (m2) => {
            const item = m2.text;

            bot.sendMessage(chatId, t(lang, "Price?", "តម្លៃ?"));
            bot.once("message", (m3) => {
              const price = m3.text;

              db.run(
                `INSERT INTO orders (user_id, customer, item, price, status)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, customer, item, price, "Pending"]
              );

              bot.sendMessage(
                chatId,
                t(lang, "🟡 Order saved.", "🟡 ការកម្មង់ត្រូវបានរក្សាទុក។")
              );
            });
          });
        });
      }

      // =====================
      // VIEW ORDERS
      // =====================
      if (text === t(lang, "📋 View Orders", "📋 មើលការកម្មង់")) {
        db.all(
          `SELECT * FROM orders WHERE user_id = ?`,
          [userId],
          (err, rows) => {
            if (!rows || rows.length === 0) {
              bot.sendMessage(
                chatId,
                t(lang, "No orders yet.", "មិនទាន់មានការកម្មង់ទេ។")
              );
            } else {
              let reply = t(
                lang,
                "📋 Your Orders:\n",
                "📋 ការកម្មង់របស់អ្នក៖\n"
              );

              rows.forEach(o => {
                reply += `#${o.id} ${o.customer} – ${o.item} (${o.status})\n`;
              });

              bot.sendMessage(chatId, reply);
            }
          }
        );
      }

      // =====================
      // MARK PAID
      // =====================
      if (text === t(lang, "✅ Mark Paid", "✅ បង់ប្រាក់រួច")) {
        bot.sendMessage(
          chatId,
          t(
            lang,
            "Send order ID to mark as PAID:",
            "ផ្ញើលេខកម្មង់ដើម្បីសម្គាល់ថាបានបង់ប្រាក់៖"
          )
        );

        bot.once("message", (m) => {
          const orderId = m.text;

          db.run(
            `UPDATE orders SET status = 'Paid' WHERE id = ? AND user_id = ?`,
            [orderId, userId],
            function () {
              bot.sendMessage(
                chatId,
                this.changes === 0
                  ? t(lang, "❌ Order not found.", "❌ រកមិនឃើញកម្មង់។")
                  : t(
                      lang,
                      `✅ Order #${orderId} marked as PAID.`,
                      `✅ កម្មង់ #${orderId} បានបង់ប្រាក់រួច។`
                    )
              );
            }
          );
        });
      }

      // =====================
      // MARK DELIVERED
      // =====================
      if (text === t(lang, "📦 Mark Delivered", "📦 បានដឹកជញ្ជូន")) {
        bot.sendMessage(
          chatId,
          t(
            lang,
            "Send order ID to mark as DELIVERED:",
            "ផ្ញើលេខកម្មង់ដើម្បីសម្គាល់ថាបានដឹកជញ្ជូន៖"
          )
        );

        bot.once("message", (m) => {
          const orderId = m.text;

          db.run(
            `UPDATE orders SET status = 'Delivered' WHERE id = ? AND user_id = ?`,
            [orderId, userId],
            function () {
              bot.sendMessage(
                chatId,
                this.changes === 0
                  ? t(lang, "❌ Order not found.", "❌ រកមិនឃើញកម្មង់។")
                  : t(
                      lang,
                      `📦 Order #${orderId} marked as DELIVERED.`,
                      `📦 កម្មង់ #${orderId} បានដឹកជញ្ជូន។`
                    )
              );
            }
          );
        });
      }
    }
  );
});
