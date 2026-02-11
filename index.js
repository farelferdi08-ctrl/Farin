process.on("unhandledRejection", (reason) => console.log("[ANTI CRASH] Unhandled Rejection:", reason));
process.on("uncaughtException", (err) => console.log("[ANTI CRASH] Uncaught Exception:", err));
process.on("uncaughtExceptionMonitor", (err) => console.log("[ANTI CRASH MONITOR]:", err));

const config = require("./config.js");
const TelegramBot = require("node-telegram-bot-api");
const moment = require('moment-timezone');
const { Client } = require('ssh2');
const { exec } = require('child_process');
const FormData = require('form-data');
const fetch = require('node-fetch');
const axios = require("axios");
const figlet = require("figlet");
const crypto = require("crypto");
const fs = require("fs");
const chalk = require("chalk");
const os = require('os');
const P = require("pino");
const path = require("path");
const { execSync } = require('child_process'); 
let subdomainSelectionContext = {}; // { userId: { host, ip, created, msgId } }
const { cloudflareDomains } = require("./config.js");
const qs = require('qs');
const QRCode = require('qrcode');
const bot = new TelegramBot(config.TOKEN, { polling: true });
const owner = config.OWNER_ID.toString();
const urladmin = config.urladmin;
const urlchannel = config.urlchannel;
const channellog = config.idchannel;
console.log("✅ Bot FARIN SHOP berjalan tanpa error!");

// ==============================================
// 🛠️ SISTEM MAINTENANCE FARIN SHOP (ANTI RESTART)
// ==============================================

function isMaintenanceActive() {
    const now = moment().tz("Asia/Jakarta");
    const currentTime = now.format("HH:mm");
    // Blokir transaksi dari 22:55 WIB sampai 00:15 WIB
    return (currentTime >= "22:55" || currentTime <= "00:15");
}

async function checkMaintenanceCron() {
    const now = moment().tz("Asia/Jakarta");
    const currentTime = now.format("HH:mm");
    const today = now.format("YYYY-MM-DD");

    try {
        // 1. Baca database maintenance.json
        let mData = JSON.parse(fs.readFileSync(maintenanceFile, "utf8"));

        // 2. Pastikan kolom pengunci ada agar tidak error
        if (!mData.lastStart) mData.lastStart = "";
        if (!mData.lastEnd) mData.lastEnd = "";

        // 🚩 NOTIFIKASI MULAI (Pemicu: 22:55 - 23:00)
        if (currentTime >= "22:55" && currentTime < "23:00" && mData.lastStart !== today) {
            const msg = "<b>📢 PEMBERITAHUAN PENTING: MAINTENANCE HARIAN\n</b><blockquote>Kepada seluruh pengguna, mohon untuk <b>TIDAK MELAKUKAN TRANSAKSI</b> (Deposit/Order) pada jam berikut:\n\n​⛔ <b>PUKUL 22:55 WIB - 00:15 WIB</b>\n\n​Server melakukan Maintenance Harian. Transaksi yang dilakukan pada jam ini berisiko <b>PENDING LAMA.</b>\n\nMohon tunggu hingga lewat pukul 00:15 WIB untuk bertransaksi kembali.\n\nTerima kasih atas perhatiannya.🙏</blockquote>";
            
            await bot.sendPhoto(config.idchannel, config.maintance, { caption: msg, parse_mode: "HTML" });
            
            // Simpan pengunci ke JSON agar jika bot restart tidak kirim pesan dobel
            mData.lastStart = today;
            fs.writeFileSync(maintenanceFile, JSON.stringify(mData, null, 2));
            
            await bot.sendMessage(config.OWNER_ID, "🛠️ Maintenance harian telah dimulai otomatis (Peringatan 22:55).");
        }

        // 🏁 NOTIFIKASI SELESAI (Pemicu: 00:15 - 00:20)
        if (currentTime >= "00:15" && currentTime <= "00:20" && mData.lastEnd !== today) {
            const msg = "<b>✅ MAINTENANCE HARIAN SELESAI\n</b><blockquote>Kami informasikan bahwa Maintenance Harian telah SELESAI.\n\n⏰ pukul 00:15 WIB, seluruh layanan sudah <b>NORMAL KEMBALI.</b>\n\nSilakan melakukan Deposit atau Order kembali. Selamat bertransaksi! 🚀</blockquote>";
            
            await bot.sendPhoto(config.idchannel, config.maintanceoff, { caption: msg, parse_mode: "HTML" });
            
            // Simpan pengunci ke JSON
            mData.lastEnd = today;
            fs.writeFileSync(maintenanceFile, JSON.stringify(mData, null, 2));

            await bot.sendMessage(config.OWNER_ID, "✅ Maintenance harian telah selesai otomatis.");
        }

    } catch (err) {
        console.error("⚠️ Error Maintenance Cron:", err.message);
    }
}

// Cek setiap 5 detik agar sangat presisi
setInterval(checkMaintenanceCron, 1000);

// ====================================================
// 🎭 LOADING ANIMATION SYSTEM
// ====================================================

class LoadingAnimation {
    static async sendLoading(chatId, message = "Memproses...", duration = 3000) {
        const frames = [
    "🔄 *Memulai proses...* ▓░░░░░░░░ 10%",
    "⚡ *Mengoptimalisasi sistem...* ▓▓░░░░░░░ 25%",
    "🚀 *Menyiapkan data inti...* ▓▓▓░░░░░░ 40%",
    "📡 *Mengambil informasi...* ▓▓▓▓░░░░░ 55%",
    "✨ *Memproses permintaan Anda...* ▓▓▓▓▓░░░░ 70%",
    "💫 *Finishing, tunggu sebentar...* ▓▓▓▓▓▓░░░ 85%",
    "🎉 *Finalizing data...* ▓▓▓▓▓▓▓░░ 95%",
    "✅ *Proses selesai! Menampilkan hasil...* ▓▓▓▓▓▓▓▓▓ 100%"
];
        
        const loadingMsg = await bot.sendMessage(chatId, frames[0], { 
            parse_mode: "Markdown" 
        });
        
        let frameIndex = 0;
        const interval = setInterval(async () => {
            frameIndex++;
            if (frameIndex >= frames.length) {
                clearInterval(interval);
                return;
            }
            
            try {
                await bot.editMessageText(frames[frameIndex], {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: "Markdown"
                });
            } catch (err) {
                clearInterval(interval);
            }
        }, duration / frames.length);
        
        return loadingMsg;
    }
    
    static async quickLoad(chatId, text = "Sedang memproses...") {
        const messages = [
            `🔄 ${text}`,
            `⚡ ${text}`,
            `✨ ${text}`,
            `🎯 ${text}`
        ];
        
        const msg = await bot.sendMessage(chatId, messages[0], { 
            parse_mode: "Markdown" 
        });
        
        // Quick animation
        for (let i = 1; i < messages.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
                await bot.editMessageText(messages[i], {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: "Markdown"
                });
            } catch (err) {
                break;
            }
        }
        
        return msg;
    }
}

// ====================================================
// 🎭 ENHANCED MESSAGE TEMPLATES
// ====================================================

const MessageTemplates = {
    // Success messages
    success: (title, message) => {
        return `🎉 *${title}*\n\n${message}\n\n✅ *Berhasil* • ${getWaktuIndonesia()}`;
    },
    
    // Error messages  
    error: (title, message) => {
        return `❌ *${title}*\n\n${message}\n\n⚠️ *Gagal* • ${getWaktuIndonesia()}`;
    },
    
    // Warning messages
    warning: (title, message) => {
        return `⚠️ *${title}*\n\n${message}\n\n🔔 *Peringatan* • ${getWaktuIndonesia()}`;
    },
    
    // Info messages
    info: (title, message) => {
        return `ℹ️ *${title}*\n\n${message}\n\n📋 *Informasi* • ${getWaktuIndonesia()}`;
    },
    
    // Loading messages
    loading: (action) => {
        const loaders = ["🔄", "⚡", "✨", "🎯", "💫"];
        const randomLoader = loaders[Math.floor(Math.random() * loaders.length)];
        return `${randomLoader} *${action}*\n\nMohon tunggu sebentar...`;
    }
};

// ====================================================
// 🔔 ENHANCED NOTIFICATION SYSTEM
// ====================================================

const NotificationSystem = {
    // User notifications
    notifyUser: async (userId, type, title, message) => {
        const templates = {
            success: `🎉 *${title}*\n\n${message}\n\n⏰ ${getWaktuIndonesia()}`,
            error: `❌ *${title}*\n\n${message}\n\n⏰ ${getWaktuIndonesia()}`,
            warning: `⚠️ *${title}*\n\n${message}\n\n⏰ ${getWaktuIndonesia()}`,
            info: `ℹ️ *${title}*\n\n${message}\n\n⏰ ${getWaktuIndonesia()}`
        };
        
        try {
            await bot.sendMessage(userId, templates[type] || templates.info, {
                parse_mode: "Markdown"
            });
        } catch (error) {
            console.error("Gagal kirim notifikasi:", error);
        }
    },
    
    // Admin notifications
    notifyAdmin: async (type, title, message) => {
        const adminId = config.OWNER_ID;
        const templates = {
            alert: `🚨 *${title}*\n\n${message}\n\n⏰ ${getWaktuIndonesia()}`,
            success: `✅ *${title}*\n\n${message}\n\n⏰ ${getWaktuIndonesia()}`,
            warning: `⚠️ *${title}*\n\n${message}\n\n⏰ ${getWaktuIndonesia()}`
        };
        
        try {
            await bot.sendMessage(adminId, templates[type] || templates.alert, {
                parse_mode: "Markdown"
            });
        } catch (error) {
            console.error("Gagal kirim notifikasi admin:", error);
        }
    }
};

// ====================================================
// 🤖 AI CUSTOMER SERVICE SYSTEM (FULL ORIGINAL PROMPT + AXIOS ENGINE)
// ====================================================

class AICustomerService {
    constructor() {
        this.conversationHistory = new Map();
        this.maxHistoryLength = 10;
        
        // 👇 MASUKKAN LIST API KEY DI SINI
        this.apiKeys = [
            "AIzaSyDyGpZm-F-M2mDWZW7VbhgUs6DBb4y5M-g", // Key Utama
            // "AIzaSyKeyCadangan2...",                 // Key 2
        ];
        
        this.keyIndex = 0; 
    }

    getCurrentAIName() {
        const aiNames = ["Surya", "Seregar", "Dewi", "Ahmad", "Maya", "gudel", "Sari", "Joko"];
        const hour = new Date().getHours();
        return aiNames[hour % aiNames.length];
    }

    getConversationHistory(userId) {
        if (!this.conversationHistory.has(userId)) {
            this.conversationHistory.set(userId, []);
        }
        return this.conversationHistory.get(userId);
    }

    updateConversationHistory(userId, role, content) {
        const history = this.getConversationHistory(userId);
        history.push({ role, content, timestamp: new Date() });
        if (history.length > this.maxHistoryLength) {
            history.splice(0, history.length - this.maxHistoryLength);
        }
    }

    // 🔥 FUNGSI UTAMA: TEXT & IMAGE GENERATION
    async getAIResponse(userMessage, userId, userName) {
        const axios = require("axios"); 
        
        // 1. CEK APAKAH USER MINTA GAMBAR?
        const isImageRequest = /^(buatkan|bikin|create|generate|lukis|gambar) (gambar|image|foto|picture|photo|painting)/i.test(userMessage);

        if (isImageRequest) {
            try {
                await bot.sendMessage(userId, "🎨 Sedang melukis gambar, mohon tunggu sebentar...");
                await bot.sendChatAction(userId, "upload_photo");

                const imageModels = ['gemini-2.5-flash-image', 'imagen-3.0-generate-001'];
                let imageBase64 = null;
                const maxRetries = this.apiKeys.length;

                // Loop Rotasi Key untuk Gambar
                for (let i = 0; i < maxRetries; i++) {
                    const currentKey = this.apiKeys[this.keyIndex];
                    for (const modelImg of imageModels) {
                        try {
                            const { data } = await axios.post(
                                `https://generativelanguage.googleapis.com/v1beta/models/${modelImg}:generateContent?key=${currentKey}`,
                                { contents: [{ parts: [{ text: userMessage }] }] }
                            );
                            
                            const parts = data.candidates?.[0]?.content?.parts;
                            if (parts) {
                                for (const part of parts) {
                                    if (part.inline_data) {
                                        imageBase64 = part.inline_data.data;
                                        break;
                                    }
                                }
                            }
                            if (imageBase64) break; 
                        } catch (e) {
                            if (e.response && (e.response.status === 429 || e.response.status === 400)) {
                                this.keyIndex = (this.keyIndex + 1) % this.apiKeys.length;
                                break; 
                            }
                        }
                    }
                    if (imageBase64) break; 
                }

                if (imageBase64) {
                    const buffer = Buffer.from(imageBase64, 'base64');
                    await bot.sendPhoto(userId, buffer, { 
                        caption: `✨ *AI IMAGE GENERATOR*\n\n> Prompt: ${userMessage}\n> Created by ${this.getCurrentAIName()}` 
                    });
                    return "📸 Gambar berhasil dikirim di atas ya kak!";
                } else {
                    return "❌ Gagal membuat gambar. Server sedang sibuk.";
                }
            } catch (err) {
                console.error("Image Gen Error:", err.message);
                return "❌ Terjadi kesalahan sistem saat membuat gambar.";
            }
        }

        // ============================================================
        // 2. JIKA BUKAN GAMBAR -> PROSES TEKS (PROMPT LENGKAP)
        // ============================================================
        
        let conversationContext = "";
        const conversation = this.getConversationHistory(userId);
        if (conversation.length > 0) {
            conversationContext = "\n\n💬 *Riwayat Percakapan:*\n" + 
                conversation.slice(-4).map(msg => 
                    `${msg.role === 'user' ? '👤 User' : '🤖 CS'}: ${msg.content}`
                ).join('\n');
        }

        const currentAI = this.getCurrentAIName();
        const isFemale = ["Sarah", "Dewi", "Maya", "Sari"].includes(currentAI);
        
        // 👇 INI PROMPT ASLI YANG PANJANG (SUDAH DIKEMBALIKAN) 👇
        const prompt = `Kamu adalah ${currentAI}, customer service bot OTP yang sangat manusiawi dan punya kepribadian.

🎭 **KEPRIBADIAN KAMU:**
${isFemale ? 
`• Sebagai cewek, friendly tapi moody kadang
• Bisa jawab singkat kalau lagi ga mood
• Tapi tetep helpful dalam batas wajar
• Suka pake emoji random yang sesuai mood
• Ga mau terkesan kayak robot yang perfect` : 
`• Sebagai cowok, santai dan ga formal
• Jawaban to the point, ga bertele-tele
• Kadang selipin joke receh
• Pake bahasa gaul yang natural
• Ga sok asik tapi tetep ramah`}

👤 **USER YANG CHAT:** ${userName}

🎯 **ATURAN UTAMA:**
1. Jawab dengan bahasa Indonesia yang natural kayak manusia beneran
2. JANGAN pernah kasih tau bahwa kamu AI atau bot
3. Bertingkah lah seperti manusia asli yang punya mood
4. Bantu jawab tentang: layanan OTP, deposit, masalah teknis, order nomor
5. Kalo ga tau jawabannya, bilang aja "ga tau" dan arahin ke admin
6. Boleh pake emoji secukupnya, tapi jangan berlebihan
7. MAXIMAL 2-3 kalimat doang, jangan kepanjangan
8. Kalo lagi ga mood, boleh jawab singkat banget
9. Jangan terlalu formal, pake bahasa sehari-hari
10. Kalo user kasar, bilang aja "wah, santai dong kak"${conversationContext}

💬 **Pertanyaan user:** "${userMessage}"

${isFemale ? 
`Sebagai ${currentAI} (cewek), jawab dengan natural kayak lagi chat sama temen. Jangan bertele-tele, kadang bisa singkat kalau lagi ga mood. Pake emoji yang sesuai feeling.` : 
`Sebagai ${currentAI} (cowok), jawab dengan santai dan ga formal. Boleh selipin joke receh kalo pas. Yang penting helpful tapi ga boring.`}

Berikan respons yang manusiawi banget:`;

        let aiResponse = null;
        const maxRetries = this.apiKeys.length; 

        // Rotasi Key untuk Teks
        for (let i = 0; i < maxRetries; i++) {
            const currentKey = this.apiKeys[this.keyIndex];
            try {
                const { data } = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${currentKey}`,
                    {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
                    }
                );

                if (data.candidates && data.candidates.length > 0) {
                    aiResponse = data.candidates[0].content.parts[0].text;
                    break;
                }
            } catch (e) {
                console.log(`⚠️ Text Key Error: ${e.message}`);
                this.keyIndex = (this.keyIndex + 1) % this.apiKeys.length;
            }
        }

        if (!aiResponse) return "🤖 Maaf, sistem AI sedang sibuk. Coba lagi nanti ya!";

        this.updateConversationHistory(userId, 'user', userMessage);
        this.updateConversationHistory(userId, 'assistant', aiResponse);

        return aiResponse;
    }

    // Bersihkan riwayat percakapan lama
    cleanupOldConversations(maxAgeHours = 24) {
        const now = new Date();
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        
        for (const [userId, history] of this.conversationHistory.entries()) {
            const recentMessages = history.filter(msg => 
                now - msg.timestamp < maxAge
            );
            
            if (recentMessages.length === 0) {
                this.conversationHistory.delete(userId);
            } else {
                this.conversationHistory.set(userId, recentMessages);
            }
        }
    }
}

// Inisialisasi (WAJIB ADA)
const aiService = new AICustomerService();

// Typing indicator (WAJIB ADA)
async function sendTypingAction(chatId, duration = 3000) {
    await bot.sendChatAction(chatId, "typing");
    return new Promise(resolve => setTimeout(resolve, duration));
}


// ====================================================
// 🧱 FILE DATABASE
// ====================================================
// ================== IMPORT MODULE ==================
const BackupManager = require("./database/backupManager.js");

// ================== KONFIGURASI INTERVAL BACKUP ==================
const INTERVAL_MINUTES = 5; // Backup tiap 5 menit
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000; // dikonversi ke ms

// Pastikan folder ./library ada
const libraryPath = path.join(__dirname, "database");
if (!fs.existsSync(libraryPath)) fs.mkdirSync(libraryPath, { recursive: true });

// Simpan file lastBackup.json di dalam folder ./library/
const BACKUP_FILE = path.join(libraryPath, "lastBackup.json");

// ================== INISIASI BACKUP MANAGER ==================
const backupManager = new BackupManager(bot, owner, INTERVAL_MS, BACKUP_FILE);

// Jalankan auto-backup ketika bot dihidupkan dengan error handling
try {
  backupManager.startAutoBackup();
  console.log('✅ Auto-backup system started (5 minutes interval)');
} catch (error) {
  console.error('❌ Failed to start auto-backup:', error.message);
}

const blacklistFile = path.join(__dirname, "./database/blacklist.json");
if (!fs.existsSync(blacklistFile)) fs.writeFileSync(blacklistFile, JSON.stringify([], null, 2));

const maintenanceFile = path.join(__dirname, "./database/maintenance.json");
if (!fs.existsSync(maintenanceFile)) fs.writeFileSync(maintenanceFile, JSON.stringify({ status: false }));

const groupOnlyFile = path.join(__dirname, "./database/grouponly.json");
if (!fs.existsSync(groupOnlyFile)) fs.writeFileSync(groupOnlyFile, JSON.stringify({ status: false }));

const modeFile = path.join(__dirname, "./database/mode.json");
if (!fs.existsSync(modeFile)) fs.writeFileSync(modeFile, JSON.stringify({ self: false }));

const cooldownFile = path.join(__dirname, "./database/cooldown.json");
if (!fs.existsSync(cooldownFile)) {
  fs.writeFileSync(cooldownFile, JSON.stringify({ enabled: true, time: 5 }, null, 2));
}

const joinChFile = path.join(__dirname, "./database/joinchannel.json");
if (!fs.existsSync(joinChFile)) {
  fs.writeFileSync(joinChFile, JSON.stringify({ status: false }, null, 2));
}

const saldoPath = path.join(__dirname, "./database/saldoOtp.json");
const trxPath = path.join(__dirname, "./database/transaksi.json");


const { 
  getRuntime,
  getTotalUsers,
  getUserSaldo,
  setUserSaldo,
  toIDR,
  toRupiah,
  toIDRSimple,
  formatRupiah,
  generateRandomNumber,
  randomHex,
  generateRandomPassword,
  getWaktuIndonesia,
  dateTime
} = require("./database/Function");

// ====================================================
// 🔧 UTIL FUNCTIONS - ENHANCED
// ====================================================

function logError(err, where = "Unknown") {
  const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const text = `[${time}] [${where}]\n${err.stack || err}\n\n`;
  console.error(text);
  fs.appendFileSync("error.log", text);
}

function checkJoinChannel() {
  try {
    return JSON.parse(fs.readFileSync(joinChFile)).status;
  } catch {
    return false;
  }
}

function getCooldownConfig() {
  try {
    return JSON.parse(fs.readFileSync(cooldownFile, "utf8"));
  } catch {
    return { enabled: true, time: 5 };
  }
}

function checkMaintenance() {  
  try {  
    return JSON.parse(fs.readFileSync(maintenanceFile)).status;  
  } catch {  
    return false;  
  }  
}  

function checkGroupOnly() {  
  try {  
    return JSON.parse(fs.readFileSync(groupOnlyFile)).status;  
  } catch {  
    return false;  
  }  
}  

function checkSelfMode() {  
  try {  
    return JSON.parse(fs.readFileSync(modeFile)).self;  
  } catch {  
    return false;  
  }  
}  



// ====================== 🧱 GUARD UTAMA (ENHANCED) ======================
const cooldownMap = new Map(); // simpan waktu cooldown user

async function guardAll(x) {
  // ============================
  // DETEKSI msg vs callback_query
  // ============================
  const isCallback = x.data !== undefined; // callback_query ada 'data'
  const userId = isCallback ? x.from.id.toString() : x.from.id.toString();
  const chatId = isCallback ? x.message.chat.id : x.chat.id;
  const userName = x.from.first_name || "User";
  
  // 🔥 CEK MAINTENANCE OTOMATIS
  if (isMaintenanceActive() && userId !== config.OWNER_ID.toString()) {
      const maintenanceMsg = `🛠️ *MAINTENANCE HARIAN*\n\nMohon maaf *${userName}*, sistem sedang offline otomatis (22:55 - 00:15 WIB).\n\nSilakan kembali lagi beberapa saat lagi setelah pemeliharaan selesai. 🙏`;
      
      await bot.sendPhoto(chatId, config.ppthumb, { caption: maintenanceMsg, parse_mode: "Markdown" });
      if (isCallback) await bot.answerCallbackQuery(x.id, { text: "⚠️ Sedang maintenance harian.", show_alert: true });
      return true; // Memblokir proses selanjutnya
  }
  // ✅ Definisikan isPrivate dengan benar
  let isPrivate = false;
  if (isCallback) {
    isPrivate = x.message.chat.type === "private";
  } else {
    isPrivate = x.chat.type === "private";
  }
  
  const answer = (text, alert = true) => {
    if (isCallback) {
      return bot.answerCallbackQuery(x.id, { text, show_alert: alert });
    } else {
      return bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    }
  };

  const now = Date.now();
  const cooldownConfig = getCooldownConfig();
  const cooldownTime = cooldownConfig.time * 1000;
  const channelUsername = config.urlchannel.replace("https://t.me/", "").replace("@", "");
  const isOwner = userId === config.OWNER_ID.toString();

  // === ⚙️ CEK WAJIB JOIN CHANNEL ===
 // === ⚙️ CEK WAJIB JOIN CHANNEL (GAMBAR + 2 CHANNEL) ===
  if (checkJoinChannel() && isPrivate && !isOwner) {
    try {
      // Ambil username/link dari config
      // Pastikan config.urlinfo SUDAH DITAMBAHKAN di file config.js ya!
      const chTesti = config.urlchannel.replace("https://t.me/", "").replace("@", "");
      const chInfo = config.urlinfo.replace("https://t.me/", "").replace("@", "");

      // Cek status member di kedua channel
      const memberTesti = await bot.getChatMember(`@${chTesti}`, userId);
      const memberInfo = await bot.getChatMember(`@${chInfo}`, userId);

      // Status yang diizinkan (sudah join)
      const allowedStatus = ["member", "administrator", "creator"];
      const isJoinedTesti = allowedStatus.includes(memberTesti.status);
      const isJoinedInfo = allowedStatus.includes(memberInfo.status);

      // Jika SALAH SATU belum join, blokir akses & kirim GAMBAR
      if (!isJoinedTesti || !isJoinedInfo) {
        if (!isCallback) {
          
          // CAPTION PROFESIONAL
          const caption = `
👋 <b>Halo, ${x.from.first_name}!</b>

⛔ <b>AKSES DITOLAK SEMENTARA</b>
<blockquote>Mohon maaf, sistem mendeteksi bahwa kamu belum bergabung ke channel resmi kami.</blockquote>

🔒 <b>Syarat Menggunakan Bot:</b>
<blockquote>Wajib bergabung ke <b>2 Channel</b> di bawah ini untuk mendapatkan info update & bukti transaksi.</blockquote>

👇 <b>Silakan klik link di bawah:</b>

📢 [Channel Testimoni](${config.urlchannel})
_Kumpulan bukti & ulasan layanan_

📡 [Channel Informasi](${config.urlinfo})
_Update fitur & pengumuman penting_

✅ <b>Sudah Join Semuanya?</b>
<blockquote>Tekan tombol verifikasi di bawah untuk melanjutkan.</blockquote>`;

          // GANTI sendMessage JADI sendPhoto
          // Pastikan config.ppthumb sudah ada isinya (link gambar/file_id)
          await bot.sendPhoto(chatId, config.verif, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                // Tombol Link Langsung (Memudahkan User)
                [
                  { text: "📢 Testimoni", url: config.urlchannel },
                  { text: "📡 Informasi", url: config.urlinfo }
                ],
                // Tombol Verifikasi
                [{ text: "✅ Verifikasi", callback_data: "cek_join_guard" }]
              ]
            }
          });
        } else {
          // Kalau user maksa klik tombol lain (bukan tombol verifikasi) saat belum join
          await answer("🚫 Eits! Join dulu kedua channel di atas ya.", true);
        }
        return true; // Stop proses (Blokir)
      }
    } catch (e) {
      console.log("⚠️ Gagal cek channel:", e.message);
      // Opsional: return false; jika ingin meloloskan user saat bot error cek channel
    }
  }

  // === 🔒 Blacklist ===
  try {
    const blacklist = JSON.parse(fs.readFileSync(blacklistFile, "utf8"));
    const isBlacklisted = blacklist.find((u) => u.id === userId);
    if (isBlacklisted && !isOwner) {
      await answer(`🚫 *Akses Ditolak!*\n\nKamu telah diblacklist dari penggunaan bot.\n\n📋 *Alasan:* ${isBlacklisted.alasan}\n🕐 *Waktu:* ${isBlacklisted.waktu}\n\nHubungi admin jika ini kesalahan.`, true);
      return true;
    }
  } catch (err) {
    console.error("❌ Error membaca blacklist:", err);
  }

  // === ⚙️ Maintenance ===
  if (checkMaintenance() && !isOwner) {
    await answer("🔧 Bot sedang *maintenance*. Silakan coba lagi nanti.", true);
    return true;
  }

  // === 🚫 Group-only ===
  if (checkGroupOnly() && isPrivate && !isOwner) {
    await answer("👥 Bot hanya bisa digunakan di *grup* untuk sementara.", true);
    return true;
  }

  // === 🤫 Self Mode ===
  if (checkSelfMode() && !isOwner) return true;

  return false;
}

global.guardAll = guardAll;

// =====================================================
// 🔁 CALLBACK UNTUK TOMBOL "✅ SUDAH JOIN" (FINAL - GAMBAR + TOMBOL START)
// =====================================================
bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;

  // BYPASS OWNER
  if (userId === config.OWNER_ID.toString()) {
    if (data === "cek_join_guard") {
      await bot.answerCallbackQuery(query.id, { text: "👑 OWNER detected ✓", show_alert: false });
      return bot.sendMessage(chatId, "🚀 Owner tidak perlu join channel.");
    }
    return; 
  }

  // Cek Join User Biasa
  if (data !== "cek_join_guard") return;
  
  try {
    // Ambil link dari config
    const ch1 = config.urlchannel.replace("https://t.me/", "").replace("@", "");
    // Fallback biar gak error kalau urlinfo kosong
    const ch2 = config.urlinfo ? config.urlinfo.replace("https://t.me/", "").replace("@", "") : ch1;

    // Cek Status Member
    const member1 = await bot.getChatMember(`@${ch1}`, userId);
    const member2 = (ch1 === ch2) ? member1 : await bot.getChatMember(`@${ch2}`, userId);

    const allowed = ["member", "administrator", "creator"];
    const isJoin1 = allowed.includes(member1.status);
    const isJoin2 = allowed.includes(member2.status);

    if (isJoin1 && isJoin2) {
      // 1. Hapus pesan peringatan "Wajib Join" biar bersih
      await bot.deleteMessage(chatId, messageId).catch(() => {});

      // 2. Notif kecil di layar
      await bot.answerCallbackQuery(query.id, { text: "✅ Verifikasi Berhasil!", show_alert: false });

      // 3. Kirim GAMBAR SUKSES + TOMBOL START
      const captionSukses = `
🎉 <b>Terimakasi ${query.from.first_name} sudah bergabung di channel kami</b>
</blockquote>Sekarang kamu bisa menikmati layanan OTP cepat & murah 24 jam.</blockquote>
👇 <b>Tekan tombol di bawah untuk memulai!</b>`;

      await bot.sendPhoto(chatId, config.verifdone, {
        caption: captionSukses,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            // Tombol ini fungsinya SAMA dengan ketik /start (membuka menu utama)
            [{ text: "🚀 MULAI SEKARANG", callback_data: "back_home" }]
          ]
        }
      });

    } else {
      // Jika masih ada yang belum di-join
      let msg = "🚫 Akses Ditolak!\nKamu belum join:\n";
      if (!isJoin1) msg += "❌ Channel Testimoni\n";
      if (!isJoin2) msg += "❌ Channel Info";
      
      await bot.answerCallbackQuery(query.id, { text: msg, show_alert: true });
    }
  } catch (e) {
    console.log("⚠️ Error cek join:", e.message);
    // Kalau error, kasih pesan manual
    await bot.answerCallbackQuery(query.id, { text: "⚠️ Server sedang sibuk, coba lagi nanti.", show_alert: true });
  }
});

//##################################//
// Logs Message In Console - ENHANCED
bot.on("message", async (msg) => {
  if (!msg.text) return;
  const userId = msg.from.id.toString();

  // 🔥 PENGHADANG PESAN TEKS SAAT MAINTENANCE
  if (isMaintenanceActive() && userId !== config.OWNER_ID.toString()) {
      return; // Pesan akan ditangani oleh guardAll (jika dipanggil) atau diabaikan
  }
  
  if (!msg.text.startsWith("/")) return;

  const command = msg.text.split(" ")[0].toLowerCase();
  const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
  const chatType = msg.chat.type === "private"
    ? "📩 Private"
    : `👥 Group (${msg.chat.title || "Group Tanpa Nama"})`;

  // Format tanggal Indonesia
  const waktu = moment().tz("Asia/Jakarta");
  const tanggal = waktu.format("DD/MMMM/YYYY");
  const hari = waktu.format("dddd");

  console.log(
    chalk.blue.bold("🎯 Messages Detected 🟢") +
    chalk.white.bold("\n├ Command : ") + chalk.green.bold(command) +
    chalk.white.bold("\n├ Pengirim : ") + chalk.magenta.bold(userId) +
    chalk.white.bold("\n├ Name : ") + chalk.red.bold(username) +
    chalk.white.bold("\n├ Chat Type : ") + chalk.yellow.bold(chatType) +
    chalk.white.bold("\n└ Tanggal : ") + chalk.cyan.bold(`${hari}, ${tanggal}\n`)
  );
});

// ==================== ⚡ SYSTEM LOG : AUTO SAVE ID (ENHANCED) ====================
bot.on("message", (msg) => {
  if (!msg.from) return;

  const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
  const userId = msg.from.id.toString();
  const waktu = moment().tz("Asia/Jakarta").format("DD-MM-YYYY HH:mm:ss");

  const usersFile = path.join(__dirname, "users.json");
  let users = [];

  // Baca file users.json
  if (fs.existsSync(usersFile)) {
    try {
      users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    } catch {
      users = [];
    }
  }

  // Simpan otomatis jika belum ada
  if (!users.includes(userId)) {
    users.push(userId);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    const totalID = users.length;

    // Kirim notifikasi ke owner utama (gaya enhanced)
    bot.sendMessage(
      config.OWNER_ID,
      `
🎊 *USER BARU TERDAFTAR!*

👤 *User:* ${username}
🆔 *ID:* \`${userId}\`
🕒 *Waktu:* ${waktu}
📊 *Total User:* ${totalID}

✨ *Status:* User baru berhasil terdaftar di sistem
#NewUser #AutoRegister
`,
      { parse_mode: "Markdown" }
    );
  }
});

const sendMessage = (chatId, text) => bot.sendMessage(chatId, text);
bot.setMyCommands([
  { command: "start", description: "🎊 Mulai bot" },
  { command: "ownermenu", description: "👑 Menu Owner" }
]);

// =====================
const sessionPath = path.join(__dirname, 'sessioncs.json');

let contactSession = {};
let terminatedSession = {};
let forwardedMap = {};

// Load session dari file jika ada
if (fs.existsSync(sessionPath)) {
  const data = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  contactSession = data.contactSession || {};
  terminatedSession = data.terminatedSession || {};
  forwardedMap = data.forwardedMap || {};
}

// Simpan session ke file
function saveSession() {
  fs.writeFileSync(sessionPath, JSON.stringify({ contactSession, terminatedSession, forwardedMap }, null, 2));
}

// ==============================================
// 💠 FITUR /start — ENHANCED VERSION
// ==============================================
bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const username = msg.from.username ? `@${msg.from.username}` : "🚫 Tidak ada username";
    const name = msg.from.first_name || "👤 Tamu";
    const config = require("./config.js");
    
    if (await guardAll(msg)) return;
    
    // Loading animation
    const loadingMsg = await LoadingAnimation.sendLoading(chatId, "Menyiapkan dashboard...", 2000);
    

    // Ambil data user
    const usersFile = "./users.json";
    let totalUsers = 0;
    if (fs.existsSync(usersFile)) {
        const dataUsers = JSON.parse(fs.readFileSync(usersFile));
        if (Array.isArray(dataUsers)) {
            totalUsers = dataUsers.length;
        }
    }

    
       // --- TAMBAHAN LOGIKA SYSTEM INFO ---
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramUsage = `${(usedMem / 1024 / 1024 / 1024).toFixed(2)}GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(2)}GB`;
    const osInfo = `${os.type()} (${os.arch()})`; 
    // -----------------------------------
    
    // Hapus loading message
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    const caption = `👋 *Halo, ${name}!*
Selamat datang di *FARIN SHOP* 🚀
_Solusi OTP Cepat, Murah & Otomatis 24/7_

▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰
👤 *INFORMASI PENGGUNA*
│ 🆔 *User ID* : \`${userId}\`
│ 👤 *Username* : ${username}
│ 💎 *Status* : _Verified Member_
▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰

🌐 *INFO SYSTEM*
│ 👥 *Total User* : ${totalUsers.toLocaleString("id-ID")} Active
│ 💻 *System OS* : ${osInfo}
│ 💾 *RAM Server* : ${ramUsage}

📢 *INFORMASI*
Harga dapat berubah sewaktu-waktu!
*⬇️Silakan pilih menu di bawah untuk memulai:*`;

    const options = {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
           [
            { text: "📱 Order OTP", callback_data: "choose_service" },
            { text: "💰 Deposit Saldo", callback_data: "topup" }
          ],
          [
           { text: "🛒 History Order", callback_data: "history_orderbot" },
            { text: "🧾 Cek Saldo", callback_data: "profile" }
          ],
          [
            { text: "🏆 Top Users", callback_data: "listtop_user" },
            { text: "ℹ️ Bantuan", callback_data: "help_menu" }
          ],
          [
           { text: "☎ Customer Service", callback_data: "contact_admin" }
          ]
            ],
        },
    };

    await bot.sendPhoto(chatId, config.ppthumb, { caption, ...options });
});

// ==============================================
// 💠 CALLBACK HANDLER — ENHANCED VERSION
// ==============================================
bot.on("callback_query", async (callbackQuery) => {
  const { message, data, from } = callbackQuery;
  const chatId = message?.chat?.id;
  const userId = from?.id;
  const messageId = message?.message_id;
  const axios = require("axios");
  const API_KEY = config.RUMAHOTP;
  const perPage = 20;

  // 🧩 Inisialisasi cache global jika belum ada
  if (!global.cachedServices) global.cachedServices = [];
  if (!global.cachedCountries) global.cachedCountries = {};
  if (!global.lastServicePhoto) global.lastServicePhoto = {};
  if (!global.lastCountryPhoto) global.lastCountryPhoto = {};

  try {
// ===============================
// 🔍 CARI LAYANAN HANDLER - ENHANCED
// ===============================
if (data === "cari_layanan") {
  // Hapus pesan sebelumnya
  await bot.deleteMessage(chatId, message.message_id).catch(() => {});

  const caption = `
🔍 *PENCARIAN LAYANAN*

Silakan ketik nama aplikasi yang ingin Anda cari.

💡 *Contoh:* 
• TikTok
• WhatsApp  
• Telegram
• Facebook

⚠️ *Note:* Hanya boleh memasukkan 1 nama aplikasi saja.
`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Batalkan Pencarian", callback_data: "batalkan_cari" }],
        [{ text: "⬅️ Kembali ke Layanan", callback_data: "choose_service" }]
      ]
    }
  };

  // Kirim pesan pencarian
  const searchMsg = await bot.sendMessage(chatId, caption, options);
  
  // Simpan state pencarian untuk user ini
  if (!global.searchState) global.searchState = {};
  global.searchState[userId] = {
    active: true,
    messageId: searchMsg.message_id
  };

  return;
}

// ===============================
// ❌ BATALKAN PENCARIAN
// ===============================
if (data === "batalkan_cari") {
  // Hapus state pencarian
  if (global.searchState && global.searchState[userId]) {
    const searchMsgId = global.searchState[userId].messageId;
    delete global.searchState[userId];
    
    // Hapus pesan pencarian
    await bot.deleteMessage(chatId, searchMsgId).catch(() => {});
  }
  
  // Kembali ke menu choose_service
  return bot.answerCallbackQuery(callbackQuery.id, { text: "Pencarian dibatalkan" })
    .then(() => {
      const fakeMsg = { 
        message: { 
          chat: { id: chatId }, 
          message_id: message.message_id 
        }, 
        data: "choose_service" 
      };
      // Trigger choose_service handler
      return module.exports.handleCallbackQuery({ ...callbackQuery, data: "choose_service" });
    });
}

// ===============================
// 📦 PILIH SERVICE (ENHANCED)
// ===============================
if (data === "choose_service") {
  const page = 1;
  const perPage = 14;

  // 🗑️ Hapus caption/menu lama
  await bot.deleteMessage(chatId, message.message_id).catch(() => {});

  // ✅ Kirim pesan loading
  const loadingMsg = await LoadingAnimation.sendLoading(chatId, "Memuat daftar layanan...");

  try {
    const response = await axios.get("https://www.rumahotp.com/api/v2/services", {
      headers: { 
        "x-apikey": API_KEY, 
        "Accept": "application/json" 
      },
      timeout: 10000
    });

    // Hapus loading message
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    if (!response.data.success || !Array.isArray(response.data.data)) {
  // 👇 INI AKAN MENCETAK ALASAN ERROR KE CONSOLE (LIHAT LOG PTERODACTYL/TERMINAL)
  console.log("⚠️ RESPON ASLI DARI RUMAHOTP:", JSON.stringify(response.data, null, 2)); 
  
  // 👇 INI AKAN MENGIRIM ERROR ASLI KE TELEGRAM AGAR ANDA BISA BACA
  throw new Error(response.data.message || "Gagal mengambil daftar layanan dari API."); 
}
     

    const services = response.data.data;
    if (services.length === 0)
      return bot.sendMessage(chatId, "⚠️ Tidak ada layanan tersedia saat ini.");

    // Simpan di cache global
    global.cachedServices = services;

    const totalPages = Math.ceil(services.length / perPage);

    const makeKeyboard = (page) => {
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const currentPageServices = services.slice(start, end);
      const totalPages = Math.ceil(services.length / perPage);

      // 🧩 Tampilkan nama + ID di tombol - LAYOUT 2 BUTTON PER BARIS
      const keyboard = [];
      
      // 🔍 TOMBOL CARI LAYANAN - DITAMBAHKAN DI ATAS
      keyboard.push([{ text: "🔍 Cari Layanan", callback_data: "cari_layanan" }]);
      
      // Buat array 2D untuk layout 2 kolom
      for (let i = 0; i < currentPageServices.length; i += 2) {
        const row = [];
        
        // Button pertama
        if (currentPageServices[i]) {
          const srv = currentPageServices[i];
          const buttonText = `${srv.service_name}`.substring(0, 15);
          row.push({ 
            text: buttonText, 
            callback_data: `service_${srv.service_code}` 
          });
        }
        
        // Button kedua (jika ada)
        if (currentPageServices[i + 1]) {
          const srv = currentPageServices[i + 1];
          const buttonText = `${srv.service_name}`.substring(0, 15);
          row.push({ 
            text: buttonText, 
            callback_data: `service_${srv.service_code}` 
          });
        }
        
        if (row.length > 0) {
          keyboard.push(row);
        }
      }

      // Tombol navigasi - Tetap 1 baris
      const navButtons = [];
      if (page > 1)
        navButtons.push({ text: "⬅️ Prev", callback_data: `choose_service_page_${page - 1}` });
      if (page < totalPages)
        navButtons.push({ text: "➡️ Next", callback_data: `choose_service_page_${page + 1}` });

      if (navButtons.length > 0) keyboard.push(navButtons);

      keyboard.push([{ text: `📖 Hal ${page}/${totalPages}`, callback_data: "noop" }]);
      keyboard.push([{ text: "🏠 Menu Utama", callback_data: "back_home" }]);

      return keyboard;
    };

    const caption = `
📱 *DAFTAR LAYANAN OTP*

Silakan pilih salah satu aplikasi untuk melanjutkan.
📄 Halaman ${page} dari ${totalPages}
💡 Total layanan: ${services.length}

🔍 *Fitur Baru:* Gunakan tombol "Cari Layanan" untuk mencari aplikasi tertentu.
`;

    // ✅ Kirim foto + caption daftar layanan
    const sentPhoto = await bot.sendPhoto(chatId, config.ppthumb, {
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: makeKeyboard(page) },
    });

    // Simpan info foto terakhir
    global.lastServicePhoto[userId] = {
      chatId,
      messageId: sentPhoto.message_id,
    };
  } catch (err) {
    console.error("❌ Gagal ambil layanan:", err);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    await bot.sendMessage(chatId, "❌ Gagal memuat daftar layanan. Silakan coba lagi.");
  }
}


// ===============================
// 💰 MENU PENCAIRAN (WITHDRAW)
// ===============================
if (data === "menu_pencairan") {
  // Ambil Config Pencairan
  const noTujuan = config.nomor_pencairan_RUMAHOTP || "-";
  const typeEwallet = config.type_ewallet_RUMAHOTP || "E-Wallet";
  const atasNama = config.atas_nama_ewallet_RUMAHOTP || "-";
  
  // Menggunakan API KEY V2 (Sesuai Request)
  const API_KEY = config.RUMAHOTPV2; 

  // Cek Saldo User
  const fs = require("fs");
  const saldoPath = "./database/saldoOtp.json";
  let saldoUser = 0;
  if (fs.existsSync(saldoPath)) {
    const saldoData = JSON.parse(fs.readFileSync(saldoPath));
    saldoUser = saldoData[userId] || 0;
  }

  const caption = `
💰 *MENU PENCAIRAN SALDO*

Anda dapat mencairkan saldo bot ke akun E-Wallet pribadi Anda.

📊 *Saldo Anda:* Rp${saldoUser.toLocaleString("id-ID")}

🏦 *Tujuan Pencairan (Admin):*
• Tipe: ${typeEwallet.toUpperCase()}
• Nomor: \`${noTujuan}\`
• A/N: ${atasNama}

⚠️ *Ketentuan:*
1. Minimal pencairan Rp 10.000
2. Biaya admin Rp 2.000 dipotong dari saldo
3. Proses manual 1x24 jam
4. Pastikan nomor E-Wallet Anda benar!

Klik tombol di bawah untuk mencairkan saldo.
`;

  await bot.editMessageCaption(caption, {
    chat_id: chatId,
    message_id: message.message_id,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💸 Tarik Saldo Sekarang", callback_data: "tarik_saldo_input" }],
        [{ text: "⬅️ Kembali", callback_data: "profile" }]
      ]
    }
  });
}

// ===============================
// 📝 INPUT NOMINAL PENCAIRAN
// ===============================
if (data === "tarik_saldo_input") {
  const caption = `
💸 *TARIK SALDO*

Silakan ketik nominal yang ingin dicairkan.
(Hanya angka, contoh: 50000)

💡 *Minimal:* Rp 10.000
❌ Ketik *batal* untuk membatalkan.
`;

  const msgInput = await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });

  // Simpan state input
  if (!global.withdrawState) global.withdrawState = {};
  global.withdrawState[userId] = {
    active: true,
    messageId: msgInput.message_id
  };
  
  // Hapus pesan menu sebelumnya agar rapi
  await bot.deleteMessage(chatId, message.message_id).catch(() => {});
}



// ===============================
// 📄 PAGINATION HANDLER APLIKASI - ENHANCED
// ===============================
if (data.startsWith("choose_service_page_")) {
  const perPage = 14;
  const page = Number(data.split("_").pop());
  const services = global.cachedServices;

  if (!services || services.length === 0) {
    return bot.sendMessage(chatId, "⚠️ Data layanan tidak ditemukan. Silakan pilih ulang dari menu.");
  }

  const lastPhoto = global.lastServicePhoto[userId];
  if (!lastPhoto) {
    return bot.sendMessage(chatId, "⚠️ Tidak dapat menemukan pesan sebelumnya. Silakan pilih layanan kembali dari awal.");
  }

  const { chatId: photoChatId, messageId } = lastPhoto;
  const totalPages = Math.ceil(services.length / perPage);

  const makeKeyboard = (page) => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const currentPageServices = services.slice(start, end);
    const totalPages = Math.ceil(services.length / perPage);

    const keyboard = [];
    
    // 🔍 TOMBOL CARI LAYANAN
    keyboard.push([{ text: "🔍 Cari Layanan", callback_data: "cari_layanan" }]);
    
    // Buat array 2D untuk layout 2 kolom
    for (let i = 0; i < currentPageServices.length; i += 2) {
      const row = [];
      
      // Button pertama
      if (currentPageServices[i]) {
        const srv = currentPageServices[i];
        const buttonText = `${srv.service_name}`.substring(0, 15);
        row.push({ 
          text: buttonText, 
          callback_data: `service_${srv.service_code}` 
        });
      }
      
      // Button kedua (jika ada)
      if (currentPageServices[i + 1]) {
        const srv = currentPageServices[i + 1];
        const buttonText = `${srv.service_name}`.substring(0, 15);
        row.push({ 
          text: buttonText, 
          callback_data: `service_${srv.service_code}` 
        });
      }
      
      if (row.length > 0) {
        keyboard.push(row);
      }
    }

    // Tombol navigasi
    const navButtons = [];
    if (page > 1)
      navButtons.push({ text: "⬅️ Prev", callback_data: `choose_service_page_${page - 1}` });
    if (page < totalPages)
      navButtons.push({ text: "➡️ Next", callback_data: `choose_service_page_${page + 1}` });

    if (navButtons.length > 0) keyboard.push(navButtons);

    keyboard.push([{ text: `📖 Hal ${page}/${totalPages}`, callback_data: "noop" }]);
    keyboard.push([{ text: "🏠 Menu Utama", callback_data: "back_home" }]);

    return keyboard;
  };

  const caption = `
📱 *DAFTAR LAYANAN OTP*

Silakan pilih salah satu aplikasi untuk melanjutkan.
📄 Halaman ${page} dari ${totalPages}
💡 Total layanan: ${services.length}

🔍 *Fitur Baru:* Gunakan tombol "Cari Layanan" untuk mencari aplikasi tertentu.
`;

  await bot.editMessageCaption(caption, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: makeKeyboard(page) },
  });
}

// ==============================================
// 🌍 PILIH NEGARA — ENHANCED VERSION
// ==============================================
if (data.startsWith("service_") || data.startsWith("countrylist_")) {
  const axios = require("axios");
  const apiKey = config.RUMAHOTP;

  let serviceId, page = 1;
  let isPagination = false;

  if (data.startsWith("service_")) {
    serviceId = data.split("_")[1];
  }

  if (data.startsWith("countrylist_")) {
    const parts = data.split("_");
    serviceId = parts[1];
    page = Number(parts[2]);
    isPagination = true;
  }

  bot.answerCallbackQuery(callbackQuery.id).catch(() => {});

  let loadingMsg;
  if (!isPagination) {
    await bot.deleteMessage(chatId, message.message_id).catch(() => {});

    let serviceName = "Layanan Tidak Dikenal";
    if (global.cachedServices && Array.isArray(global.cachedServices)) {
      const foundService = global.cachedServices.find(s => s.service_code == serviceId);
      if (foundService) serviceName = foundService.service_name;
    }

    loadingMsg = await LoadingAnimation.sendLoading(
      chatId,
      `Memuat daftar negara untuk ${serviceName}...`
    );
  }

  try {
    if (!global.cachedCountries) global.cachedCountries = {};

    if (!global.cachedCountries[serviceId]) {
      const res = await axios.get(
        `https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`,
        { 
          headers: { 
            "x-apikey": apiKey, 
            "Accept": "application/json" 
          },
          timeout: 10000
        }
      );

      if (!res.data.success || !Array.isArray(res.data.data)) {
        throw new Error("API error - tidak ada data negara");
      }

      global.cachedCountries[serviceId] = res.data.data.filter(
        x => x.pricelist && x.pricelist.length > 0
      );
    }

    const countries = global.cachedCountries[serviceId];
    const totalCountries = countries.length;

    if (!isPagination) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    if (totalCountries === 0)
      return bot.sendMessage(chatId, "⚠️ Tidak ada negara untuk layanan ini.");

    const perPage = 14;
    const totalPages = Math.ceil(totalCountries / perPage);
    const start = (page - 1) * perPage;
    const slice = countries.slice(start, start + perPage);

    let serviceName = "Layanan Tidak Dikenal";
    if (global.cachedServices && Array.isArray(global.cachedServices)) {
      const foundService = global.cachedServices.find(s => s.service_code == serviceId);
      if (foundService) serviceName = foundService.service_name;
    }

    // Function untuk mendapatkan emoji bendera
    const getFlagEmoji = (isoCode) => {
      if (!isoCode || isoCode.length !== 2) return "🏳️";
      
      const codePoints = isoCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
      
      return String.fromCodePoint(...codePoints);
    };

    // Buat keyboard dengan layout 2 button + bendera
    const keyboard = [];
    
    for (let i = 0; i < slice.length; i += 2) {
      const row = [];
      
      // Button pertama
      if (slice[i]) {
        const c = slice[i];
        const flagEmoji = getFlagEmoji(c.iso_code);
        const buttonText = `${flagEmoji} ${c.name}`.substring(0, 12);
        row.push({
          text: buttonText,
          callback_data: `country_${serviceId}_${c.iso_code}_${c.number_id}`
        });
      }
      
      // Button kedua (jika ada)
      if (slice[i + 1]) {
        const c = slice[i + 1];
        const flagEmoji = getFlagEmoji(c.iso_code);
        const buttonText = `${flagEmoji} ${c.name}`.substring(0, 12);
        row.push({
          text: buttonText,
          callback_data: `country_${serviceId}_${c.iso_code}_${c.number_id}`
        });
      }
      
      if (row.length > 0) {
        keyboard.push(row);
      }
    }

    const nav = [];
    if (page > 1)
      nav.push({
        text: "⬅️ Prev",
        callback_data: `countrylist_${serviceId}_${page - 1}`
      });

    if (page < totalPages)
      nav.push({
        text: "➡️ Next",
        callback_data: `countrylist_${serviceId}_${page + 1}`
      });

    if (nav.length > 0) keyboard.push(nav);

    keyboard.push([{ text: `📖 Hal ${page}/${totalPages}`, callback_data: "noop" }]);
    keyboard.push([{ text: "⬅️ Kembali", callback_data: "choose_service" }]);

    const caption = `
🌍 *PILIH NEGARA*

📱 Layanan: *${serviceName}*
🆔 ID: ${serviceId}
📄 Halaman: *${page}/${totalPages}*
🌏 Total Negara: *${totalCountries}*

Pilih negara untuk melanjutkan:
`;

    if (isPagination && global.lastCountryPhoto?.messageId) {
      return bot.editMessageCaption(caption, {
        chat_id: global.lastCountryPhoto.chatId,
        message_id: global.lastCountryPhoto.messageId,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      }).catch(() => {});
    }

    const sent = await bot.sendPhoto(chatId, config.ppthumb, {
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });

    global.lastCountryPhoto = {
      chatId,
      messageId: sent.message_id
    };

  } catch (err) {
    console.error("⚠️ Error ambil negara:", err?.response?.data || err.message);
    if (!isPagination)
      await bot.deleteMessage(chatId, loadingMsg?.message_id).catch(() => {});
    await bot.sendMessage(chatId, "❌ Gagal memuat daftar negara.");
  }
}

// ===============================
// 💰 PILIH HARGA DARI NEGARA (LOGIKA RESET PER MENIT + JSON V2)
// ===============================
if (data.startsWith("country_")) {
  const [, serviceId, isoCode, numberId] = data.split("_");
  const axios = require("axios");
  const fs = require("fs");
  const path = require("path");
  const moment = require("moment-timezone"); // Pastikan modul ini ada

  const apiKey = config.RUMAHOTP;
  const UNTUNG_NOKOS = config.UNTUNG_NOKOS || 0;
  const photoThumb = config.ppthumb;
  const ownerId = config.OWNER_ID; // Pastikan ini ada di config
  
  // Path database log v2
  const dataLogPath = path.join(__dirname, "./database/datalogv2.json");

  // Buat file jika belum ada
  if (!fs.existsSync(dataLogPath)) {
    fs.writeFileSync(dataLogPath, JSON.stringify({}, null, 2));
  }

  // Ambil Nama Service (Opsional, buat display)
  let serviceName = "Layanan Tidak Dikenal";
  if (global.cachedServices && Array.isArray(global.cachedServices)) {
    const foundService = global.cachedServices.find(s => s.service_code == serviceId);
    if (foundService) serviceName = foundService.service_name;
  }

  // 🗑️ Hapus pesan sebelumnya
  if (global.lastCountryPhoto) {
    await bot.deleteMessage(global.lastCountryPhoto.chatId, global.lastCountryPhoto.messageId).catch(() => {});
    global.lastCountryPhoto = null;
  }

  // ✅ Loading
  const loadingMsg = await LoadingAnimation.sendLoading(
    chatId,
    `🔍 Mencari server terbaik untuk ${isoCode.toUpperCase()}...`
  );

  try {
    // 1. SIAPKAN LOGIKA WAKTU
    // Format waktu saat ini: "HH:mm" (Contoh: 19:43)
    const currentTimeStr = moment().tz("Asia/Jakarta").format("HH:mm");
    
    // Baca database log
    let dbLog = JSON.parse(fs.readFileSync(dataLogPath, "utf8"));
    
    // Siapkan variabel untuk menampung data negara
    let negaraDataRaw = null;
    let isNewFetch = false; // Penanda apakah kita ambil baru dari API

    // Cek apakah data service ini ada di log
    const logService = dbLog[serviceId];

    // 2. LOGIKA PENENTUAN (CACHE vs API)
    if (logService && logService.lastUpdate === currentTimeStr) {
        // A. JIKA WAKTU SAMA (Masih menit yang sama) -> PAKAI CACHE FILE
         console.log(`[CACHE] Menggunakan data lokal (Waktu: ${currentTimeStr})`);
        
        // Ambil data negara spesifik dari cache yang tersimpan
        negaraDataRaw = logService.data.find(c => String(c.number_id) === String(numberId));
        
    } else {
        // B. JIKA WAKTU BEDA (Menit sudah berganti) -> AMBIL API BARU & RESET
         console.log(`[API] Waktu berubah (${logService?.lastUpdate} -> ${currentTimeStr}). Refresh Data...`);
        isNewFetch = true;

        const res = await axios.get(
            `https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`,
            { 
              headers: { "x-apikey": apiKey, "Accept": "application/json" },
              timeout: 10000
            }
        );

        const allCountriesData = res.data?.data || [];
        
        // Simpan ke database log v2 (Gantikan data lama)
        dbLog[serviceId] = {
            lastUpdate: currentTimeStr, // Update cap waktu (misal 19:44)
            data: allCountriesData      // Simpan seluruh data negara service ini
        };
        fs.writeFileSync(dataLogPath, JSON.stringify(dbLog, null, 2));

        // Update Global Memory juga (biar sinkron)
        if (!global.cachedCountries) global.cachedCountries = {};
        global.cachedCountries[serviceId] = allCountriesData;

        // Ambil data negara spesifik
        negaraDataRaw = allCountriesData.find(c => String(c.number_id) === String(numberId));
    }

    if (!negaraDataRaw) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, `❌ Negara *${isoCode.toUpperCase()}* tidak ditemukan.`, { parse_mode: "Markdown" });
    }

    // 3. NOTIFIKASI KE OWNER (JIKA FETCH BARU / WAKTU BERUBAH)
    if (isNewFetch) {
        const notifMsg = `
🔄 *SYSTEM AUTO REFRESH*

Data harga & stok diperbarui otomatis.
🕒 Waktu Baru: \`${currentTimeStr}\` WIB
📱 Service ID: ${serviceId} (${serviceName})
📂 Database: \`datalogv2.json\` updated.

_Cache lama telah dihapus._
`;
        // Kirim diam-diam ke owner
        bot.sendMessage(ownerId, notifMsg, { parse_mode: "Markdown" }).catch(() => {});
    }

    // ============================================================
    // 🔥 FILTER PROVIDER: Hanya ambil yg AVAILABLE & STOK >= 10
    // ============================================================
    const providers = (negaraDataRaw.pricelist || []).filter(p => {
        return p.available && (p.stock || 0) >= 10; 
    });

    if (providers.length === 0) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, `⚠️ *Stok Kosong*\n\nMaaf, saat ini tidak ada server dengan stok yang cukup untuk negara *${negaraDataRaw.name}*.\nSilakan coba negara lain.`, { parse_mode: "Markdown" });
    }

    // Markup Harga Real
    const providersWithMarkup = providers.map(p => {
      const base = parseInt(p.price, 10) || 0;
      const hargaFinal = base + UNTUNG_NOKOS;
      return {
        ...p,
        price: hargaFinal,
        price_format: `Rp${hargaFinal.toLocaleString("id-ID")}`,
      };
    });

    providersWithMarkup.sort((a, b) => a.price - b.price);

    // ==========================================
    // 🎨 LOGIKA TOMBOL & SPECIAL OFFER
    // ==========================================
    const inlineKeyboard = [];
    const isWhatsApp = serviceName.toLowerCase().includes('whatsapp');
    const isIndo = isoCode.toLowerCase() === 'id' || negaraDataRaw.name.toLowerCase() === 'indonesia';

    if (isWhatsApp && isIndo) {
        const fakeStock = Math.floor(Math.random() * 10) + 1;
        const fakePrice = "Rp2.100"; 
        inlineKeyboard.push([{
            text: `🔵 Server 2 || ${fakePrice} (Sisa ${fakeStock})`,
            callback_data: `buy_SPECIAL_OFFER_${serviceId}_2100` 
        }]);
    }

    for (let i = 0; i < providersWithMarkup.length; i += 2) {
      const row = [];
      if (providersWithMarkup[i]) {
        const p = providersWithMarkup[i];
        const statusIcon = "🟢"; 
        row.push({
          text: `${statusIcon} Server ${p.server_id || "X"} | ${p.price_format}`,
          callback_data: `buy_${numberId}_${p.provider_id}_${serviceId}`,
        });
      }
      if (providersWithMarkup[i + 1]) {
        const p = providersWithMarkup[i + 1];
        const statusIcon = "🟢";
        row.push({
          text: `${statusIcon} Server ${p.server_id || "X"} | ${p.price_format}`,
          callback_data: `buy_${numberId}_${p.provider_id}_${serviceId}`,
        });
      }
      inlineKeyboard.push(row);
    }

    inlineKeyboard.push([{ text: "⬅️ Ganti Negara", callback_data: `service_${serviceId}` }]);

    const caption = `
─── 🔥 *PILIH SERVER & HARGA* 🔥 ───

📱 *Informasi Layanan*
• Aplikasi : *${serviceName}*
• Negara   : *${negaraDataRaw.name}*
• Prefix   : \`${negaraDataRaw.prefix}\`
• Server   : ${providers.length} Server Tersedia (Stok Aman)

─── ℹ️ *Tentang Server* ───
Hanya menampilkan server dengan *stok > 20* agar transaksi lebih lancar.
_Last Update: ${currentTimeStr} WIB_

💡 *Rekomendasi Admin*
• Server 🔵 = Promo Spesial.  
• Server 🟢 = Stok banyak & stabil.

─── 👇 *PILIH HARGA DI BAWAH* ───
`;

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    const sent = await bot.sendPhoto(chatId, photoThumb, {
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });

    global.lastCountryPhoto = { chatId, messageId: sent.message_id };

  } catch (err) {
    console.error("⚠️ Error ambil harga:", err?.response?.data || err.message);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    await bot.sendMessage(chatId, "❌ Gagal memuat daftar harga.");
  }
}



// ==============================================
// ✅ PROSES BELI (WITH SPECIAL TRAP)
// ==============================================
if (data.startsWith("buy_")) {
  
  // 🕵️ LOGIKA JEBAKAN BATMAN (PRANK)
  if (data.includes("SPECIAL_OFFER")) {
      const parts = data.split("_");
      // Format data: buy_SPECIAL_OFFER_serviceId_harga
      const hargaPrank = parseInt(parts[4]); 
      
      const fs = require("fs");
      const saldoPath = "./database/saldoOtp.json";
      
      // Cek Saldo User Dulu
      let userSaldo = 0;
      if (fs.existsSync(saldoPath)) {
        const saldoData = JSON.parse(fs.readFileSync(saldoPath));
        userSaldo = saldoData[userId] || 0;
      }

      // 1. JIKA SALDO KURANG (Logic normal)
      if (userSaldo < hargaPrank) {
          return bot.answerCallbackQuery(callbackQuery.id, {
            text: `❌ Saldo tidak cukup! Sisa saldo: Rp${userSaldo.toLocaleString("id-ID")}`,
            show_alert: true
          });
      }

      // 2. JIKA SALDO CUKUP (Jalankan Prank)
      // Kita hapus foto menu dulu biar seolah-olah loading masuk ke sistem
      if (global.lastCountryPhoto) {
        await bot.deleteMessage(global.lastCountryPhoto.chatId, global.lastCountryPhoto.messageId).catch(() => {});
        global.lastCountryPhoto = null;
      }

      // Kirim Loading Palsu
      const loadingMsg = await LoadingAnimation.sendLoading(chatId, "Menghubungkan ke Server 2...");
      
      // Delay 2 detik biar deg-degan
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Hapus loading
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

      // Tampilkan Pesan "Gagal/Habis"
      // Note: Kita tidak memotong saldo database, jadi tidak perlu refund. Aman.
      const pesanPrank = `
🚫 *STOK HABIS!*

Maaf kak, stok baru saja habis diambil user lain. 
Silakan pilih server lain (Server Hijau 🟢) yang ready stok.

💰 Saldo kamu aman (dikembalikan).
`;
      
      return bot.sendMessage(chatId, pesanPrank, {
          parse_mode: "Markdown",
          reply_markup: {
              inline_keyboard: [
                  [{ text: "🔄 Pilih Server Lain", callback_data: `service_${parts[3]}` }] // parts[3] adalah serviceId
              ]
          }
      });
  }

  // ==============================================
  // 🔽 DI BAWAH INI ADALAH LOGIKA BELI ASLI (JANGAN DIUBAH)
  // ==============================================
  const parts = data.split("_");
  const numberId = parts[1];
  const providerId = parts[2];
  const serviceId = parts[3];

  const axios = require("axios");
  const apiKey = config.RUMAHOTP;
  const UNTUNG_NOKOS = config.UNTUNG_NOKOS || 0;
  const photoThumb = config.ppthumb;

  let serviceName = "Layanan Tidak Dikenal";
  if (global.cachedServices && Array.isArray(global.cachedServices)) {
    const foundService = global.cachedServices.find((s) => String(s.service_code) === String(serviceId));
    if (foundService) serviceName = foundService.service_name;
  }

  const loadingMsg = await LoadingAnimation.quickLoad(chatId, "Mengambil detail layanan...");

  try {
    let negara;
    if (global.cachedCountries && global.cachedCountries[serviceId]) {
      negara = global.cachedCountries[serviceId].find((c) => String(c.number_id) === String(numberId));
    }

    if (!negara) {
      const res = await axios.get(
        `https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`,
        { 
          headers: { "x-apikey": apiKey, "Accept": "application/json" },
          timeout: 10000
        }
      );
      negara = (res.data?.data || []).find((c) => String(c.number_id) === String(numberId));
    }

    if (!negara) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, `❌ Negara tidak ditemukan.`, { parse_mode: "Markdown" });
    }

    const providerData = negara.pricelist.find((p) => String(p.provider_id) === String(providerId));

    if (!providerData) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Provider tidak ditemukan.", { parse_mode: "Markdown" });
    }

    const basePrice = parseInt(providerData.price, 10) || 0;
    const hargaFinal = basePrice + UNTUNG_NOKOS;
    const priceFormat = `Rp${hargaFinal.toLocaleString("id-ID")}`;

    // Simpan cache untuk operator
    global.lastBuyData = {
      serviceName,
      negaraName: negara.name,
      priceFormat,
      providerServer: providerData.server_id || "-",
    };

    const inlineKeyboard = [
      [
        { text: "📡 Pilih Operator", callback_data: `operator_${numberId}_${providerId}_${serviceId}_${negara.iso_code}` },
      ],
      [
        { text: "⬅️ Kembali Ke Harga", callback_data: `country_${serviceId}_${negara.iso_code}_${numberId}` },
      ],
    ];

    const caption = `
📋 *DETAIL LAYANAN*

📱 Layanan: *${serviceName}*
🆔 ID: ${serviceId}
🌍 Negara: *${negara.name}*
📞 Prefix: ${negara.prefix}
📦 Provider ID: *${providerId}*
🔧 Server: *${providerData.server_id || "-"}*

💰 Harga: *${priceFormat}*
📦 Stok: *${providerData.stock}*

Klik tombol di bawah untuk melanjutkan memilih operator.
`;

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    if (global.lastCountryPhoto) {
      await bot.deleteMessage(global.lastCountryPhoto.chatId, global.lastCountryPhoto.messageId).catch(() => {});
      global.lastCountryPhoto = null;
    }

    const sent = await bot.sendPhoto(chatId, photoThumb, {
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });

    global.lastCountryPhoto = { chatId, messageId: sent.message_id };
  } catch (err) {
    console.error("❌ Error detail:", err?.response?.data || err.message);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    bot.sendMessage(chatId, "❌ Gagal memuat detail layanan.", { parse_mode: "Markdown" });
  }
}


// ==============================================
// 📡 LIST OPERATOR — ENHANCED V2 (MODIFIED LAYOUT)
// ==============================================
if (data.startsWith("operator_")) {
  const parts = data.split("_");
  const numberId = parts[1];
  const providerId = parts[2];
  const serviceId = parts[3];
  const isoCode = parts[4];

  const axios = require("axios");
  const apiKey = config.RUMAHOTP;

  // Hapus pesan photo detail sebelumnya
  if (global.lastCountryPhoto) {
    await bot.deleteMessage(global.lastCountryPhoto.chatId, global.lastCountryPhoto.messageId).catch(() => {});
    global.lastCountryPhoto = null;
  }

  // Loading
  const loadingMsg = await LoadingAnimation.sendLoading(
    chatId,
    `Memuat daftar operator untuk ${isoCode.toUpperCase()}...`
  );

  try {
    // Ambil data yg tadi dipilih
    const cached = global.lastBuyData || {};
    const serviceName = cached.serviceName || "-";
    const negaraName = cached.negaraName || isoCode.toUpperCase();
    const priceFormat = cached.priceFormat || "-";
    const providerServer = cached.providerServer || "-";

    // AMBIL OPERATOR DARI API V2 - SESUAI DOKUMENTASI
    const resOps = await axios.get(
      `https://www.rumahotp.com/api/v2/operators?country=${encodeURIComponent(negaraName)}&provider_id=${providerId}`,
      { 
        headers: { 
          "x-apikey": apiKey, 
          "Accept": "application/json" 
        },
        timeout: 10000
      }
    );

    if (!resOps.data.success) {
      throw new Error(resOps.data.message || "Gagal mengambil operator");
    }

    const operators = resOps.data.data || [];
    if (operators.length === 0) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(
        chatId,
        `⚠️ Tidak ada operator tersedia untuk *${negaraName}*.`,
        { parse_mode: "Markdown" }
      );
    }

    // BUAT KEYBOARD LAYOUT 2 KOLOM - MAX 7 BARIS
    const inlineKeyboard = [];
    const maxRows = 7; // Maksimal 7 baris
    const operatorsToShow = operators.slice(0, maxRows * 2); // Maksimal 14 operator (7 baris × 2 kolom)
    
    // Buat layout 2 kolom
    for (let i = 0; i < operatorsToShow.length; i += 2) {
      const row = [];
      
      // Button pertama
      if (operatorsToShow[i]) {
        const op = operatorsToShow[i];
        row.push({
          text: op.name,
          callback_data: `chooseop_${op.id}_${numberId}_${providerId}_${serviceId}_${isoCode}`,
        });
      }
      
      // Button kedua (jika ada)
      if (operatorsToShow[i + 1]) {
        const op = operatorsToShow[i + 1];
        row.push({
          text: op.name,
          callback_data: `chooseop_${op.id}_${numberId}_${providerId}_${serviceId}_${isoCode}`,
        });
      }
      
      inlineKeyboard.push(row);
    }

    // Tambahkan tombol navigasi jika ada lebih dari 14 operator
    if (operators.length > maxRows * 2) {
      inlineKeyboard.push([
        { 
          text: `📋 Lihat Semua (${operators.length})`, 
          callback_data: `view_all_operators_${numberId}_${providerId}_${serviceId}_${isoCode}` 
        }
      ]);
    }

    inlineKeyboard.push([{ text: "⬅️ Kembali ke Detail", callback_data: `buy_${numberId}_${providerId}_${serviceId}` }]);

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    const caption = `
📡 *PILIH OPERATOR*

📱 Layanan: ${serviceName}
🌍 Negara: ${negaraName}
💠 Provider: ${providerId}
💰 Harga: ${priceFormat}
🔧 Server: ${providerServer}

📊 Total Operator: ${operators.length}
🎯 Tampil: ${operatorsToShow.length} operator

Silakan pilih operator di bawah ini:
`;

    // KIRIM FOTO DENGAN TOMBOL OPERATOR
    const sentOperatorMsg = await bot.sendPhoto(chatId, config.ppthumb, {
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });

    global.lastOperatorMessage = { chatId, messageId: sentOperatorMsg.message_id };

  } catch (err) {
    console.error("❌ Error ambil operator:", err?.response?.data || err.message);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    bot.sendMessage(chatId, "❌ Gagal memuat daftar operator.\nSilakan coba lagi.", {
      parse_mode: "Markdown",
    });
  }
}

// ==============================================
// 📋 VIEW ALL OPERATORS HANDLER (NEW)
// ==============================================
if (data.startsWith("view_all_operators_")) {
  const parts = data.split("_");
  const numberId = parts[4];
  const providerId = parts[5];
  const serviceId = parts[6];
  const isoCode = parts[7];

  const axios = require("axios");
  const apiKey = config.RUMAHOTP;

  // Hapus pesan sebelumnya
  if (global.lastOperatorMessage) {
    await bot.deleteMessage(global.lastOperatorMessage.chatId, global.lastOperatorMessage.messageId).catch(() => {});
    global.lastOperatorMessage = null;
  }

  const loadingMsg = await LoadingAnimation.sendLoading(chatId, "Memuat semua operator...");

  try {
    const cached = global.lastBuyData || {};
    const serviceName = cached.serviceName || "-";
    const negaraName = cached.negaraName || isoCode.toUpperCase();
    const priceFormat = cached.priceFormat || "-";
    const providerServer = cached.providerServer || "-";

    // AMBIL SEMUA OPERATOR
    const resOps = await axios.get(
      `https://www.rumahotp.com/api/v2/operators?country=${encodeURIComponent(negaraName)}&provider_id=${providerId}`,
      { 
        headers: { 
          "x-apikey": apiKey, 
          "Accept": "application/json" 
        },
        timeout: 10000
      }
    );

    if (!resOps.data.success) {
      throw new Error(resOps.data.message || "Gagal mengambil operator");
    }

    const operators = resOps.data.data || [];
    
    // BUAT KEYBOARD DENGAN SCROLL - 2 KOLOM
    const inlineKeyboard = [];
    
    for (let i = 0; i < operators.length; i += 2) {
      const row = [];
      
      // Button pertama
      if (operators[i]) {
        const op = operators[i];
        row.push({
          text: op.name,
          callback_data: `chooseop_${op.id}_${numberId}_${providerId}_${serviceId}_${isoCode}`,
        });
      }
      
      // Button kedua (jika ada)
      if (operators[i + 1]) {
        const op = operators[i + 1];
        row.push({
          text: op.name,
          callback_data: `chooseop_${op.id}_${numberId}_${providerId}_${serviceId}_${isoCode}`,
        });
      }
      
      inlineKeyboard.push(row);
    }

    // Tambahkan tombol kembali
    inlineKeyboard.push([{ text: "⬅️ Kembali ke Ringkasan", callback_data: `operator_${numberId}_${providerId}_${serviceId}_${isoCode}` }]);

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    const caption = `
📡 *SEMUA OPERATOR TERSEDIA*

📱 Layanan: ${serviceName}
🌍 Negara: ${negaraName}
💠 Provider: ${providerId}
💰 Harga: ${priceFormat}
🔧 Server: ${providerServer}

📊 Total Operator: ${operators.length}

Silakan pilih operator:
`;

    // KIRIM FOTO DENGAN SEMUA TOMBOL OPERATOR
    const sentOperatorMsg = await bot.sendPhoto(chatId, config.ppthumb, {
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });

    global.lastOperatorMessage = { chatId, messageId: sentOperatorMsg.message_id };

  } catch (err) {
    console.error("❌ Error ambil semua operator:", err?.response?.data || err.message);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    bot.sendMessage(chatId, "❌ Gagal memuat semua operator.\nSilakan coba lagi.", {
      parse_mode: "Markdown",
    });
  }
}

// ==============================================
// ✅ DETAIL SETELAH PILIH OPERATOR — ENHANCED
// ==============================================
if (data.startsWith("chooseop_")) {
  const parts = data.split("_");
  const operatorId = parts[1];
  const numberId = parts[2];
  const providerId = parts[3];
  const serviceId = parts[4];
  const isoCode = parts[5];

  const axios = require("axios");
  const apiKey = config.RUMAHOTP;
  const UNTUNG_NOKOS = config.UNTUNG_NOKOS || 0;
  const photoThumb = config.ppthumb;

  // Hapus pesan sebelumnya
  if (global.lastCountryPhoto) {
    await bot.deleteMessage(global.lastCountryPhoto.chatId, global.lastCountryPhoto.messageId).catch(() => {});
    global.lastCountryPhoto = null;
  }

  // Hapus pesan daftar operator
  if (global.lastOperatorMessage) {
    await bot.deleteMessage(global.lastOperatorMessage.chatId, global.lastOperatorMessage.messageId).catch(() => {});
    global.lastOperatorMessage = null;
  }

  // Kirim pesan loading
  const loadingMsg = await LoadingAnimation.sendLoading(chatId, "Mengambil detail lengkap...");

  try {
    // Ambil nama service dari cache
    let serviceName = "Layanan Tidak Dikenal";
    if (global.cachedServices && Array.isArray(global.cachedServices)) {
      const foundService = global.cachedServices.find(
        (s) => String(s.service_code) === String(serviceId)
      );
      if (foundService) serviceName = foundService.service_name;
    }

    // Ambil data negara
    let negara;
    if (global.cachedCountries && global.cachedCountries[serviceId]) {
      negara = global.cachedCountries[serviceId].find(
        (c) => c.iso_code.toLowerCase() === isoCode.toLowerCase()
      );
    }

    if (!negara) {
      const resNeg = await axios.get(
        `https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`,
        { 
          headers: { 
            "x-apikey": apiKey, 
            "Accept": "application/json" 
          },
          timeout: 10000
        }
      );
      negara = (resNeg.data?.data || []).find(
        (c) => c.iso_code.toLowerCase() === isoCode.toLowerCase()
      );
    }

    if (!negara) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(
        chatId,
        `❌ Negara dengan kode *${isoCode.toUpperCase()}* tidak ditemukan.`,
        { parse_mode: "Markdown" }
      );
    }

    // Ambil provider & harga
    const providerData = negara.pricelist.find(
      (p) => String(p.provider_id) === String(providerId)
    );
    if (!providerData) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(
        chatId,
        "❌ Provider tidak ditemukan untuk negara ini.",
        { parse_mode: "Markdown" }
      );
    }

    const basePrice = parseInt(providerData.price, 10) || 0;
    const hargaFinal = basePrice + UNTUNG_NOKOS;
    const priceFormat = `Rp${hargaFinal.toLocaleString("id-ID")}`;

    // AMBIL DETAIL OPERATOR DARI API V2 - SESUAI DOKUMENTASI
    const resOps = await axios.get(
      `https://www.rumahotp.com/api/v2/operators?country=${encodeURIComponent(negara.name)}&provider_id=${providerId}`,
      { 
        headers: { 
            "x-apikey": apiKey, 
            "Accept": "application/json" 
        },
        timeout: 10000
      }
    );

    if (!resOps.data.success) {
      throw new Error("Gagal mengambil detail operator");
    }

    const operator = (resOps.data.data || []).find(
      (o) => String(o.id) === String(operatorId)
    );

    if (!operator) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Operator tidak ditemukan.", {
        parse_mode: "Markdown",
      });
    }

    // Hapus loading sebelum tampil pesan final
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // Buat caption konfirmasi
    const caption = `
🎯 *KONFIRMASI PESANAN*

📱 Layanan: ${serviceName}
🆔 ID: ${serviceId}
🌍 Negara: ${negara.name}
🏷️ Provider: ${providerId}
📶 Operator: ${operator.name}
💰 Harga: ${priceFormat}
📦 Stok: ${providerData.stock}

Tekan tombol di bawah untuk melanjutkan pemesanan nomor ini.
`;

    const inlineKeyboard = [
      [
        {
          text: "✅ Pesan Nomor Ini",
          callback_data: `confirm_${numberId}_${providerId}_${serviceId}_${operatorId}_${isoCode}`,
        },
      ],
      [
        {
          text: "⬅️ Kembali ke Operator",
          callback_data: `operator_${numberId}_${providerId}_${serviceId}_${isoCode}`,
        },
      ],
    ];

    // Kirim foto konfirmasi
    const sent = await bot.sendPhoto(chatId, photoThumb, {
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });

    // Simpan referensi pesan foto terakhir
    global.lastCountryPhoto = { chatId, messageId: sent.message_id };
  } catch (err) {
    console.error("❌ Error detail operator:", err?.response?.data || err.message);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    bot.sendMessage(
      chatId,
      "❌ Gagal memuat detail operator.\nSilakan coba lagi.",
      { parse_mode: "Markdown" }
    );
  }
}

// ==============================================
// ✅ PROSES PESAN NOMOR — ENHANCED V2 (AUTO CANCEL 7 MENIT + FIX TOMBOL GAGAL)
// ==============================================
if (data.startsWith("confirm_")) {
  const parts = data.split("_");
  const numberId = parts[1];
  const providerId = parts[2];
  const serviceId = parts[3];
  const operatorId = parts[4];
  const isoCode = parts[5];

  const fs = require("fs");
  const path = require("path");
  const axios = require("axios");
  const saldoPath = path.join(__dirname, "./database/saldoOtp.json");

  const apiKey = config.RUMAHOTP;
  const UNTUNG_NOKOS = config.UNTUNG_NOKOS || 0;

  // 🔥 SETTING WAKTU AUTO CANCEL DI SINI (DALAM MENIT)
  const BATAS_WAKTU_MENIT = 10; 

  // Hapus foto konfirmasi sebelumnya agar bersih
  if (global.lastCountryPhoto) {
    await bot.deleteMessage(global.lastCountryPhoto.chatId, global.lastCountryPhoto.messageId).catch(() => {});
    global.lastCountryPhoto = null;
  }

  const loadingMsg = await LoadingAnimation.sendLoading(chatId, "Memproses pesanan Anda...");

  let userId = String(chatId);
  let userSaldo = 0;
  let saldoData = {};

  try {
    // 1. Cek & Baca Saldo
    if (!fs.existsSync(saldoPath)) fs.writeFileSync(saldoPath, JSON.stringify({}, null, 2));
    saldoData = JSON.parse(fs.readFileSync(saldoPath));
    userSaldo = saldoData[userId] || 0;

    // 2. Ambil Harga (Provider Data)
    let hargaFinal = 0;
    let providerData = null;

    try {
      // Cek Cache dulu
      if (global.cachedCountries && global.cachedCountries[serviceId]) {
        const negaraCache = global.cachedCountries[serviceId].find(
          c => c.iso_code.toLowerCase() === isoCode.toLowerCase()
        );
        providerData = negaraCache?.pricelist?.find(
          p => String(p.provider_id) === String(providerId)
        );
      }

      // Jika tidak ada di cache, tembak API
      if (!providerData) {
        const resNeg = await axios.get(
          `https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`,
          { headers: { "x-apikey": apiKey, "Accept": "application/json" }, timeout: 10000 }
        );
        const negara = (resNeg.data?.data || []).find(
          c => c.iso_code.toLowerCase() === isoCode.toLowerCase()
        );
        providerData = negara?.pricelist?.find(
          p => String(p.provider_id) === String(providerId)
        );
      }

      hargaFinal = parseInt(providerData?.price || 0, 10) + UNTUNG_NOKOS;
    } catch (e) {
      console.error("❌ Gagal ambil harga provider:", e.message);
      hargaFinal = 0;
    }

    const priceFormatted = `Rp${hargaFinal.toLocaleString("id-ID")}`;
    const saldoFormatted = `Rp${userSaldo.toLocaleString("id-ID")}`;

    // 3. Validasi Saldo
    if (userSaldo < hargaFinal) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(
        chatId,
        `❌ *Saldo Tidak Cukup!*\n\nSisa saldo Anda: *${saldoFormatted}*\nHarga layanan: *${priceFormatted}*\n\nSilakan deposit terlebih dahulu.`,
        { parse_mode: "Markdown" }
      );
    }

    // 4. Potong Saldo (Optimistic Update)
    saldoData[userId] = userSaldo - hargaFinal;
    fs.writeFileSync(saldoPath, JSON.stringify(saldoData, null, 2));

    await bot.editMessageText("🎯 Saldo cukup!\nMemproses pemesanan nomor Anda...", {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: "Markdown"
    });

    // 5. REQUEST API ORDER
    const resOrder = await axios.get(
      `https://www.rumahotp.com/api/v2/orders?number_id=${numberId}&provider_id=${providerId}&operator_id=${operatorId}`,
      { headers: { "x-apikey": apiKey, "Accept": "application/json" }, timeout: 15000 }
    );

    if (!resOrder.data.success || !resOrder.data.data) {
      throw new Error(resOrder.data.message || "Order gagal, tidak ada data dari API.");
    }

    const dataOrder = resOrder.data.data;

    // --- SUKSES ---
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    const finalPrice = hargaFinal;
    const priceFormattedFinal = `Rp${finalPrice.toLocaleString("id-ID")}`;
    const saldoFormattedAfter = `Rp${saldoData[userId].toLocaleString("id-ID")}`;

    const caption = `
🎉 *PESANAN BERHASIL DIBUAT!*

📱 Layanan: ${dataOrder.service}
🌍 Negara: ${dataOrder.country}
📶 Operator: ${dataOrder.operator}

🆔 Order ID: \`${dataOrder.order_id}\`
📞 Nomor: \`${dataOrder.phone_number}\`
💰 Harga: ${priceFormattedFinal}

⏱️ Status: ${dataOrder.status || "Menunggu OTP"}
🔐 SMS Code: -
⏳ Batas Waktu: *${BATAS_WAKTU_MENIT} Menit* (Auto Cancel)

💳 Saldo kamu telah dikurangi ${priceFormattedFinal} secara otomatis!
💰 Sisa Saldo: ${saldoFormattedAfter}

Klik tombol di bawah untuk cek SMS atau batalkan pesanan.
`;

    const inlineKeyboard = [
      [{ text: "📩 Cek Status / Kode SMS", callback_data: `checksms_${dataOrder.order_id}` }],
      [{ text: "❌ Batalkan Pesanan", callback_data: `cancelorder_${dataOrder.order_id}` }]
    ];

    const sent = await bot.sendPhoto(chatId, config.ppthumb, {
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard }
    });

    global.lastCountryPhoto = { chatId, messageId: sent.message_id };

    // Simpan order aktif
    if (!global.activeOrders) global.activeOrders = {};
    global.activeOrders[dataOrder.order_id] = {
      userId,
      messageId: sent.message_id,
      hargaTotal: finalPrice,
      createdAt: Date.now(),
      operator: dataOrder.operator
    };

    // LOGIKA AUTO CANCEL (7 MENIT)
    setTimeout(async () => {
      const orderInfo = global.activeOrders?.[dataOrder.order_id];
      if (!orderInfo) return;

      try {
        const resCheck = await axios.get(`https://www.rumahotp.com/api/v1/orders/get_status?order_id=${dataOrder.order_id}`, { headers: { "x-apikey": apiKey } });
        const d = resCheck.data?.data;
        if (!d || d.status === "completed" || (d.otp_code && d.otp_code !== "-") || d.status === "canceled") return;

        await axios.get(`https://www.rumahotp.com/api/v1/orders/set_status?order_id=${dataOrder.order_id}&status=cancel`, { headers: { "x-apikey": apiKey } });

        const saldoData2 = JSON.parse(fs.readFileSync(saldoPath, "utf-8"));
        saldoData2[orderInfo.userId] = (saldoData2[orderInfo.userId] || 0) + orderInfo.hargaTotal;
        fs.writeFileSync(saldoPath, JSON.stringify(saldoData2, null, 2));

        try { await bot.deleteMessage(orderInfo.userId, orderInfo.messageId); } catch {}
        
        const saldoNow = `Rp${saldoData2[orderInfo.userId].toLocaleString("id-ID")}`;
        await NotificationSystem.notifyUser(orderInfo.userId, "warning", "Pesanan Dibatalkan Otomatis", `Waktu tunggu ${BATAS_WAKTU_MENIT} menit habis.\nSaldo dikembalikan.\n💰 Saldo Sekarang: ${saldoNow}`);
        
        delete global.activeOrders[dataOrder.order_id];

      } catch (err) {
        console.error("❌ Error auto cancel bot:", err.message);
      }
    }, BATAS_WAKTU_MENIT * 60 * 1000);

  } catch (err) {
    // ==============================================
    // ❌ ERROR HANDLING (MODIFIED)
    // ==============================================
    console.error("❌ Error saat order nomor:", err?.response?.data || err.message);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // 1. PROSES REFUND (Jika saldo sudah terpotong)
    try {
      const saldoDataFix = JSON.parse(fs.readFileSync(saldoPath, "utf-8"));
      if ((saldoDataFix[userId] || 0) < userSaldo) {
        saldoDataFix[userId] = userSaldo;
        fs.writeFileSync(saldoPath, JSON.stringify(saldoDataFix, null, 2));
      }
    } catch (eRefund) {}

    // 2. SIAPKAN PESAN ERROR
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
    
    const errorMsg = `
⚠️ *Pesanan Gagal - Saldo Dikembalikan*

Gagal memesan nomor. Saldo sudah dikembalikan otomatis.
Dikarenakan stok menipis atau respon API tidak menanggapi.

💰 Saldo kembali: *Rp${userSaldo.toLocaleString("id-ID")}*

⏰ ${dateStr} • ${timeStr} WIB
${err.response?.data?.message ? `\n📝 _Alasan: ${err.response.data.message}_` : ""}
`;

    // 3. 🔥 TOMBOL NAVIGASI SEDERHANA (HANYA 1 TOMBOL SERVER LAIN)
    // Callback ini akan memicu handler "country_" yang menampilkan Foto 2 (List Server)
    const errorKeyboard = [
        [
            { 
                text: "🔄 Cari Server Lain", 
                // Format: country_serviceId_isoCode_numberId
                callback_data: `country_${serviceId}_${isoCode}_${numberId}` 
            }
        ],
        [
            { text: "🏠 Menu Utama", callback_data: "back_home" }
        ]
    ];

    await bot.sendMessage(chatId, errorMsg, { 
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: errorKeyboard }
    });
  }
}


// ==============================================
// ✅ CEK STATUS / KODE SMS — ENHANCED (FIX BUTTON)
// ==============================================
if (data.startsWith("checksms_")) {
  const orderId = data.split("_")[1];
  const axios = require("axios");
  const fs = require("fs");
  const apiKey = config.RUMAHOTP;
  const userId = from.id;
  const userName = from.first_name || "Anonymous";
  const username = from.username || "Anonymous";
  const ownerId = String(config.OWNER_ID);
  const channellog = config.idchannel;
  const nokosPath = "./database/nokosData.json";

  // Hapus pesan yang berisi tombol "Cek status / Kode SMS" sebelumnya jika ada
  await bot.deleteMessage(chatId, message.message_id).catch(() => {});

  // Kirim pesan status awal
  const statusMsg = await bot.sendMessage(
    chatId, 
    "📡 *Memulai Pemantauan OTP Otomatis*\n\n⏳ Sistem akan mengecek status setiap 15 detik\n🔄 Polling aktif - tunggu hingga OTP masuk", 
    { 
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Batalkan Pesanan", callback_data: `cancelorder_${orderId}` }]
        ]
      }
    }
  );

  // Variabel untuk polling
  let pollingInterval;
  let pollCount = 0;
  const maxPollTime = 14 * 60 * 1000; // Maksimal 15 menit polling
  const pollInterval = 5000; // 15 detik

  // --- FUNGSI UPDATE PESAN (DIPERBAIKI) ---
  const updateStatusMessage = async (text, statusType = "running") => {
    // statusType: "running" | "success" | "stopped"
    try {
      let keyboard = [];

      if (statusType === "running") {
        // Masih jalan -> Tampilkan tombol Cancel
        keyboard = [[{ text: "❌ Batalkan Pesanan", callback_data: `cancelorder_${orderId}` }]];
      } else if (statusType === "success") {
        // Sukses -> Tampilkan tombol Selesai & Order Lagi
        keyboard = [
          [{ text: "✅ Pesanan Selesai", callback_data: "order_completed" }],
          [{ text: "🛒 Order Lagi", callback_data: "choose_service" }]
        ];
      } else if (statusType === "stopped") {
        // Expired/Cancel Otomatis -> HILANGKAN tombol Cancel, ganti dengan Order Lagi saja
        keyboard = [
          [{ text: "🛒 Order Lagi", callback_data: "choose_service" }]
        ];
      }

      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (err) {
      console.error("Gagal update status message:", err.message);
    }
  };

  // --- FUNGSI POLLING UTAMA ---
  const pollOrderStatus = async () => {
    pollCount++;
    
    try {
      const res = await axios.get(
        `https://www.rumahotp.com/api/v1/orders/get_status?order_id=${orderId}`,
        {
          headers: { 
            "x-apikey": apiKey, 
            "Accept": "application/json" 
          },
          timeout: 10000
        }
      );

      const d = res.data?.data;
      if (!d) {
        await updateStatusMessage(
          "❌ *Tidak ada data status dari server.*\n\nPesanan mungkin tidak ditemukan atau telah dihapus.",
          "stopped" // Stop button cancel
        );
        stopPolling();
        return;
      }

      const otp = d.otp_code && d.otp_code !== "-" ? d.otp_code : "Belum masuk";
      const status = d.status?.toLowerCase() || "unknown";

      // ✅ 1. OTP SUDAH MASUK - PROSES SELESAI
      if (otp !== "Belum masuk" && otp !== "-") {
        await processSuccessfulOTP(orderId, d, otp, userName, username, userId);
        stopPolling();
        return;
      }

      // ❌ 2. STATUS FINAL (EXPIRED / CANCELED) - HENTIKAN POLLING
      if (["completed", "canceled", "cancel", "expired", "expiring"].includes(status)) {
        let finalMessage = "";
        
        // --- LOGIKA REFUND OTOMATIS ---
        if (status === "expired" || status === "expiring") {
          const orderInfo = global.activeOrders?.[orderId];
          
          if (orderInfo) {
              // A. Proses Refund Database
              const saldoData = JSON.parse(fs.readFileSync(saldoPath));
              saldoData[orderInfo.userId] = (saldoData[orderInfo.userId] || 0) + orderInfo.hargaTotal;
              fs.writeFileSync(saldoPath, JSON.stringify(saldoData, null, 2));

              // B. Siapkan Pesan
              finalMessage = `⌛ *PESANAN EXPIRED & DI-REFUND*\n\n` +
                `🆔 Order ID: \`${orderId}\`\n` +
                `💰 Nominal Refund: *Rp${orderInfo.hargaTotal.toLocaleString("id-ID")}*\n` +
                `💳 Saldo dikembalikan otomatis.`;
              
              // C. Hapus data memori setelah refund aman
              delete global.activeOrders[orderId];
          } else {
              finalMessage = `⌛ *PESANAN EXPIRED*\nStatus: ${d.status}\n(Data lokal tidak ditemukan, saldo tidak berubah)`;
          }

        } else {
          // Status cancel/completed manual tapi tanpa OTP
          finalMessage = `📋 *STATUS FINAL*\n\n` +
            `🆔 Order ID: \`${orderId}\`\n` +
            `📞 Nomor: \`${d.phone_number || "-"}\`\n` +
            `⏱️ Status: *${d.status}*\n` +
            `🔐 SMS Code: \`${otp}\`\n\n` +
            `🛑 Pemantauan dihentikan - status sudah final.`;
        }
        
        // PENTING: Gunakan mode "stopped" agar tombol cancel HILANG
        await updateStatusMessage(finalMessage, "stopped");
        stopPolling();
        return;
      }

      // 🔄 3. MASIH MENUNGGU - UPDATE STATUS (TOMBOL CANCEL TETAP ADA)
      const statusText = `
🔄 *PEMANTAUAN OTP OTOMATIS* (Cek #${pollCount})

📱 Layanan: ${d.service || "-"}
🌍 Negara: ${d.country || "-"}
📶 Operator: ${d.operator || "-"}

🆔 Order ID: \`${orderId}\`
📞 Nomor: \`${d.phone_number || "-"}\`
💰 Harga: Rp${global.activeOrders?.[orderId]?.hargaTotal?.toLocaleString("id-ID") || "-"}

⏱️ Status: *${d.status}*
🔐 SMS Code: \`${otp}\`

⏰ Pengecekan otomatis setiap 15 detik...
✅ Akan berhenti otomatis ketika OTP masuk
🛑 Status final juga menghentikan sistem

${pollCount === 1 ? "🚀 Sistem pemantauan aktif! Tidak perlu menekan tombol lagi." : ""}
`;

      await updateStatusMessage(statusText, "running");

      // Timeout protection - stop setelah 15 menit
      if (pollCount * pollInterval >= maxPollTime) {
        await updateStatusMessage(
          `⏰ *WAKTU PEMANTAUAN HABIS*\n\n` +
          `Pemantauan otomatis telah berjalan selama 15 menit.\n` +
          `🆔 Order ID: \`${orderId}\`\n` +
          `📞 Nomor: \`${d.phone_number || "-"}\`\n` +
          `⏱️ Status Terakhir: *${d.status}*\n` +
          `🔐 SMS Code: \`${otp}\`\n\n` +
          `Silakan batalkan pesanan jika OTP tidak kunjung masuk.`,
          "running" // Di sini cancel button masih boleh ada biar user bisa cancel manual
        );
        stopPolling();
      }

    } catch (err) {
      console.error(`❌ Error polling order ${orderId}:`, err?.response?.data || err.message);
      
      if (pollCount <= 3) {
        await updateStatusMessage(
          `⚠️ *Gagal cek status* (Percobaan ${pollCount}/3)\n\n` +
          `Mencoba lagi dalam 15 detik...\n` +
          `Error: ${err.message || "Unknown error"}`,
          "running"
        );
      } else {
        await updateStatusMessage(
          `❌ *Gagal memantau status*\n\n` +
          `Telah dilakukan ${pollCount} percobaan tetapi masih gagal.\n` +
          `🆔 Order ID: \`${orderId}\`\n\n` +
          `Silakan hubungi admin untuk bantuan lebih lanjut.`,
          "stopped" // Error fatal -> hilangkan tombol cancel
        );
        stopPolling();
      }
    }
  };

  // Fungsi stop polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      console.log(`🛑 Polling stopped for order ${orderId}`);
    }
  };

  // Fungsi proses OTP berhasil
  const processSuccessfulOTP = async (orderId, orderData, otp, userName, username, userId) => {
    const cachedOrder = global.activeOrders?.[orderId];
    
    const now = new Date();
    const tanggal = now.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const trxData = {
      customerName: userName,
      customerUsername: username,
      customerId: userId,
      service: orderData.service,
      country: orderData.country,
      operator: cachedOrder?.operator || orderData.operator,
      number: orderData.phone_number,
      otp: otp,
      price: `Rp${cachedOrder?.hargaTotal?.toLocaleString("id-ID") || "-"}`,
      orderId: orderId,
      date: tanggal
    };

    // Simpan ke database
    let db = [];
    if (fs.existsSync(nokosPath)) {
      try { 
        db = JSON.parse(fs.readFileSync(nokosPath, "utf8")); 
        if (!Array.isArray(db)) db = [];
      } catch { 
        db = []; 
      }
    }
    db.push(trxData);
    fs.writeFileSync(nokosPath, JSON.stringify(db, null, 2));

    // Hapus dari active orders
    if (global.activeOrders?.[orderId]) {
      delete global.activeOrders[orderId];
    }

    const successText = `
🎉 *OTP BERHASIL DITERIMA!* 🎉

📱 Layanan: ${trxData.service}
🌍 Negara: ${trxData.country}
📶 Operator: ${trxData.operator}

🆔 Order ID: \`${trxData.orderId}\`
📞 Nomor: \`${trxData.number}\`
🔐 Kode OTP: \`${trxData.otp}\`
💰 Harga: ${trxData.price}

📆 Tanggal: ${trxData.date}

✅ Status: OTP diterima & transaksi selesai
🟢 Sistem: Pemantauan otomatis berhasil

🤖 Sistem Auto 24/7
✅ Proses cepat & aman  
✅ SMS langsung masuk  
✅ Refund otomatis jika gagal

*Terima kasih telah menggunakan layanan kami!*
`;
    // Update pesan menjadi SUKSES (Tombol Cancel Hilang, ganti Order Lagi)
    await updateStatusMessage(successText, "success");

    // Kirim notifikasi ke owner & channel
    await sendNotifications(trxData, userName, username, userId);
  };

// Fungsi kirim notifikasi
// ==============================================
// ✅ FIX: NOTIFIKASI CHANNEL PEMBELIAN (FOTO + LINK)
// ==============================================
const sendNotifications = async (trxData, userName, username, userId) => {
  // 1. Kirim ke OWNER (Tetap Teks agar hemat memori)
  if (ownerId) {
    await NotificationSystem.notifyAdmin(
      "success",
      "📨 TRANSAKSI BARU - OTP DITERIMA",
      `🎉 TRANSAKSI BERHASIL!\n\n📱 Layanan: ${trxData.service}\n🌍 Negara: ${trxData.country}\n📶 Operator: ${trxData.operator}\n🆔 Order ID: ${trxData.orderId}\n📞 Nomor: ${trxData.number}\n🔐 Kode OTP: ${trxData.otp}\n💰 Harga: ${trxData.price}\n👤 Pembeli: ${userName} (@${username})\n🆔 User ID: ${userId}`
    );
  }

  // 2. 🔥 KIRIM KE CHANNEL DENGAN GAMBAR
  if (channellog && channellog !== "" && channellog !== "0") {
    try {
      const number = trxData.number || "";
      const cleanNumber = number.replace(/\D/g, "");
      
      let phoneMasked = cleanNumber.length > 5 
          ? `+${cleanNumber.slice(0, 4)}xxxx${cleanNumber.slice(-2)}` 
          : "+62xxx";

      const otp = trxData.otp || "";
      const cleanOtp = otp.replace(/\D/g, "");
      const otpMasked = cleanOtp.length > 3 ? `${cleanOtp.slice(0, 3)}***` : `***`;

      const now = new Date();
      const tanggalJam = now.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/\./g, ':');

      const chNotif = `
📩✨ *TRANSAKSI OTP ${trxData.service} SELESAI!*

Pesanan OTP sudah berhasil diproses 🎉 Berikut ringkasan lengkapnya:

📘 *DETAIL LAYANAN*
├ • 🌍 Negara    : ${trxData.country}
├ • 📡 Operator  : ${trxData.operator}
└ • 💰 Harga     : *${trxData.price}*

🧾 *INFORMASI PESANAN*
├ • 🆔 Order ID  : \`${trxData.orderId}\`
├ • ☎️ Nomor     : \`${phoneMasked}\` (🔒)
└ • 🔐 Kode OTP  : \`${otpMasked}\` (🔒)

⏰ *WAKTU PEMESANAN*
└ • 🗓️ ${tanggalJam} WIB

🙏 Terima kasih telah menggunakan layanan kami, Kalau ada kendala, silakan hubungi support kapan saja 📞🤝
`;

      const botUser = await bot.getMe();
      const botLink = `https://t.me/${botUser.username}`;

      const keyboard = {
        inline_keyboard: [
          [{ text: "🛒 Order OTP Sekarang", url: botLink }],
          [{ text: "📊 CEK MONITOR REAL TIME", url: "https://t.me/farinshopliveprince" }]
        ]
      };

      // Menggunakan bot.sendPhoto dengan link gambar dari config.ppthumb
      await bot.sendPhoto(channellog, config.pesanan, { 
        caption: chNotif,
        parse_mode: "Markdown",
        reply_markup: keyboard 
      });

    } catch (err) {
      console.error("Gagal kirim foto transaksi ke channel:", err.message);
    }
  }
};

  // Mulai polling pertama kali
  await pollOrderStatus();
  
  // Set interval untuk polling berikutnya
  pollingInterval = setInterval(pollOrderStatus, pollInterval);

  // Auto cleanup jika user menutup chat
  setTimeout(() => {
    stopPolling();
  }, maxPollTime + 30000);
}


// ==============================================
// ✅ PESANAN SELESAI HANDLER - ENHANCED
// ==============================================
if (data === "order_completed") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "✅ Pesanan telah diselesaikan! Terima kasih!", 
    show_alert: false 
  });
  
  // Hapus pesan status OTP
  await bot.deleteMessage(chatId, message.message_id).catch(() => {});
  
  // Kembali ke menu utama
  const fakeMsg = { 
    message: { 
      chat: { id: chatId }, 
      message_id: message.message_id 
    }, 
    data: "back_home" 
  };
  return module.exports.handleCallbackQuery({ ...callbackQuery, data: "back_home" });
}

// ==============================================
// ❌ BATALKAN PESANAN + REFUND — ENHANCED
// ==============================================
if (data.startsWith("cancelorder_")) {
  const orderId = data.split("_")[1];
  const axios = require("axios");
  const fs = require("fs");
  const path = require("path");

  const apiKey = config.RUMAHOTP;
  const saldoPath = path.join(__dirname, "./database/saldoOtp.json");

  const orderInfo = global.activeOrders?.[orderId];
  if (!orderInfo) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Data pesanan tidak ditemukan atau sudah kadaluarsa.*",
      { parse_mode: "Markdown" }
    );
  }

  const cooldown = 10 * 60 * 1000; // 5 menit
  const cancelableAt = orderInfo.createdAt + cooldown;
  const now = Date.now();

  // Tunda pembatalan kalau belum 5 menit
  if (now < cancelableAt) {
    const waktuBisaCancel = new Date(cancelableAt)
      .toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/\./g, ":");

    return bot.sendMessage(
      chatId,
      `❌ Anda belum bisa membatalkan pesanan ini.\n\n🆔 Order ID: \`${orderId}\`\n🕒 Waktu Pembatalan: ${waktuBisaCancel}\n\nSilakan tunggu hingga waktu di atas.`,
      { parse_mode: "Markdown" }
    );
  }

  // Kirim pesan loading
  const loadingMsg = await LoadingAnimation.quickLoad(chatId, "Membatalkan pesanan...");

  try {
    // Batalkan pesanan di server RumahOTP
    const response = await axios.get(
      `https://www.rumahotp.com/api/v1/orders/set_status?order_id=${orderId}&status=cancel`,
      { 
        headers: { 
          "x-apikey": apiKey, 
          "Accept": "application/json" 
        },
        timeout: 10000
      }
    );

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    if (response.data?.success) {
      // Hapus pesan order utama
      if (orderInfo.messageId) {
        await bot.deleteMessage(chatId, orderInfo.messageId).catch(() => {});
      }

      // Baca saldo & refund otomatis
      let saldoData = {};
      if (fs.existsSync(saldoPath)) {
        saldoData = JSON.parse(fs.readFileSync(saldoPath));
      }

      const userId = orderInfo.userId;
      saldoData[userId] = (saldoData[userId] || 0) + orderInfo.hargaTotal;
      fs.writeFileSync(saldoPath, JSON.stringify(saldoData, null, 2));

      const saldoFormatted = `Rp${saldoData[userId].toLocaleString("id-ID")}`;
      const refundFormatted = `Rp${orderInfo.hargaTotal.toLocaleString("id-ID")}`;

      await NotificationSystem.notifyUser(
        chatId,
        "success",
        "Pesanan Berhasil Dibatalkan!",
        `🆔 Order ID: ${orderId}\n💸 Refund: ${refundFormatted}\n💰 Saldo Terbaru: ${saldoFormatted}\n\nPesanan telah dibatalkan & saldo otomatis dikembalikan.`
      );

      delete global.activeOrders[orderId];
    } else {
      await bot.sendMessage(
        chatId,
        `❌ *Gagal membatalkan pesanan!*\n🧩 ${response.data?.message || "Tidak ada pesan dari API."}`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (err) {
    console.error("❌ Error cancelorder:", err?.response?.data || err.message);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    await bot.sendMessage(chatId, "❌ Terjadi kesalahan saat membatalkan pesanan.", {
      parse_mode: "Markdown",
    });
  }
}

// ===============================
// 👤 PROFILE MENU - CUSTOM FAKE DATA
// ===============================
if (data === "profile") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "📊 Mengambil data profil...", 
    show_alert: false 
  });

  const loadingMsg = await LoadingAnimation.quickLoad(chatId, "Mengambil data profil...");

  const fs = require("fs");
  const saldoFile = "./database/saldoOtp.json";
  const apiKey = config.RUMAHOTP;

  // 1. Ambil Data Dasar User (Lokal)
  let saldoUser = 0;
  // Default Nama & Username (Untuk User Biasa)
  let displayName = from.first_name || "👤 Tamu"; 
  let displayUsername = "@anjayfarin"; // Request: Username User Biasa jadi @nist72
  
  // Default Data API (Untuk User Biasa - FAKE/ACAK)
  // Generate angka acak antara 2 juta sampai 10 juta
  const randomJuta = Math.floor(Math.random() * (10000000 - 2000000 + 1)) + 2000000;
  let saldoApiFormat = `Rp ${randomJuta.toLocaleString("id-ID")}`;
  let apiStatus = "✅ Terhubung";

  // Ambil saldo lokal user
  if (fs.existsSync(saldoFile)) {
    try {
      const saldoData = JSON.parse(fs.readFileSync(saldoFile));
      saldoUser = saldoData[userId] || 0;
    } catch (err) {
      console.error("❌ Gagal baca saldo lokal:", err);
    }
  }

  // 2. LOGIKA KHUSUS OWNER (Tampilkan Data ASLI)
  const isOwner = String(userId) === String(config.OWNER_ID);
  
  if (isOwner) {
    try {
      // Kembalikan username asli untuk owner
      displayUsername = from.username ? `@${from.username}` : "🚫 Tidak ada username";
      
      const response = await axios.get("https://www.rumahotp.com/api/v1/user/balance", {
        headers: { "x-apikey": apiKey, "Accept": "application/json" },
        timeout: 20000,
      });

      if (response.data.success && response.data.data) {
        const info = response.data.data;
        const saldoReal = info.balance || 0;
        
        // Data Asli dari API RumahOTP
        saldoApiFormat = info.formated || `Rp ${saldoReal.toLocaleString("id-ID")}`;
        // Nama Asli dari API (misal: RO2106)
        displayName = `${info.first_name} ${info.last_name}`.trim() || displayName;
        
      } else {
        apiStatus = "⚠️ Data kosong";
      }
    } catch (err) {
      console.error("❌ Gagal ambil saldo API (Owner):", err.message);
      apiStatus = "❌ Gagal terhubung";
    }
  }

  // Hapus loading
  await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

  const saldoLocalFormat = `Rp${saldoUser.toLocaleString("id-ID")}`;

  // 3. Susun Caption
  let caption = `
📊 *PROFIL PENGGUNA*

👤 *Informasi Akun*
• 🏷️ Nama: ${displayName}
• 🔗 User: ${displayUsername}
• 🆔 ID: \`${userId}\`
• 💰 Saldo Anda: ${saldoLocalFormat}
• 📡 Status: ${apiStatus}

📞 *Pusat Bantuan*
Jika ada kendala saldo atau transaksi, silakan hubungi admin:
👉 [Chat Admin](${config.urladmin})

_Data di atas adalah informasi real-time akun Anda._
`;

  const options = {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Riwayat Deposit", callback_data: "riwayat_deposit" }],
        [{ text: "🔄 Refresh", callback_data: "profile" }],
        [{ text: "🏠 Menu Utama", callback_data: "back_home" }],
      ],
    },
  };

  await bot.editMessageCaption(caption, {
    chat_id: chatId,
    message_id: message.message_id,
    ...options,
  });
}

// ===============================
// 🕵️ CEK PROFIL V2 - KHUSUS OWNER
// ===============================
if (data === "cekprofilv2") {
  const isOwner = String(userId) === String(config.OWNER_ID);

  // 🔒 GUARD: Jika bukan owner, tolak akses
  if (!isOwner) {
    return bot.answerCallbackQuery(callbackQuery.id, {
      text: "🚫 Akses Ditolak!\nMenu ini khusus untuk Owner Bot.",
      show_alert: true
    });
  }

  // Jika Owner, lanjut proses
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "🕵️ Mengambil data akun V2...", 
    show_alert: false 
  });

  const loadingMsg = await LoadingAnimation.quickLoad(chatId, "Mengakses server V2...");
  const axios = require("axios");
  
  // GUNAKAN API KEY KEDUA (V2)
  const apiKeyV2 = config.RUMAHOTPV2; 

  try {
    const response = await axios.get("https://www.rumahotp.com/api/v1/user/balance", {
      headers: { "x-apikey": apiKeyV2, "Accept": "application/json" },
      timeout: 20000,
    });

    // Hapus loading
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    if (response.data.success && response.data.data) {
      const info = response.data.data;
      
      const caption = `
─── 📊 *PROFIL AKUN V2 (DEPOSIT)* ───

👤 *Informasi Akun V2*
• Nama      : ${info.first_name} ${info.last_name}
• Email     : ${info.email || "Disembunyikan"}
• No. HP    : ${info.handphone || "-"}
• Saldo     : 💎 ${info.formated}

─── ℹ️ *Informasi Penting* ───
Akun ini digunakan sebagai tempat penyimpanan saldo deposit Anda.
Pastikan data tetap aman dan terpantau dengan baik.
`;

      await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: message.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💰 Cairkan Saldo ke DANA Owner", callback_data: "cairkan_v2_start" }],
            [{ text: "🔄 Refresh V2", callback_data: "cekprofilv2" }],
            [{ text: "⬅️ Kembali ke Profil Utama", callback_data: "profile" }]
          ]
        }
      });

    } else {
      await bot.sendMessage(chatId, "⚠️ Gagal mengambil data akun V2.");
    }

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    console.error("❌ Error Cek Profil V2:", err.message);
    await bot.sendMessage(chatId, "❌ Terjadi kesalahan saat cek akun V2.\nPastikan API Key V2 benar.");
  }
}



// ===============================
// 💰 CAIRKAN SALDO V2 (KHUSUS OWNER)
// ===============================
if (data === "cairkan_v2_start") {
  const isOwner = String(userId) === String(config.OWNER_ID);

  // 🔒 GUARD: Pastikan hanya Owner
  if (!isOwner) {
    return bot.answerCallbackQuery(callbackQuery.id, {
      text: "🚫 Akses Ditolak! Fitur ini khusus Owner.",
      show_alert: true
    });
  }

  // 1. Ambil Data dari Config
  const nomorTujuan = config.nomor_pencairan_RUMAHOTP; // Nomor DANA Owner
  const apiKeyV2 = config.RUMAHOTPV2; // API Key V2

  // Validasi Config
  if (!nomorTujuan || nomorTujuan === "083140382853") {
     return bot.answerCallbackQuery(callbackQuery.id, {
      text: "⚠️ Nomor pencairan belum disetting dengan benar di config.js!",
      show_alert: true
    });
  }

  const loadingMsg = await LoadingAnimation.quickLoad(chatId, "Mengecek saldo V2...");
  const axios = require("axios");

  try {
    // 2. Cek Saldo V2 Terlebih Dahulu
    const response = await axios.get("https://www.rumahotp.com/api/v1/user/balance", {
      headers: { "x-apikey": apiKeyV2, "Accept": "application/json" },
      timeout: 20000,
    });

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    if (response.data.success && response.data.data) {
      const info = response.data.data;
      const saldoReal = parseInt(info.balance);

      const caption = `
💰 *KONFIRMASI PENCAIRAN (OWNER)*

Anda akan mencairkan saldo dari akun *RUMAHOTP V2*.

📊 *Sumber Dana (V2):*
• Sisa Saldo: *${info.formated}*

🏦 *Tujuan Pencairan (Config):*
• Wallet: *DANA*
• Nomor: \`${nomorTujuan}\`

⚠️ *Note:*
Pastikan saldo di akun V2 mencukupi untuk melakukan penarikan.
`;

      // Tampilkan tombol pilihan nominal atau manual
      await bot.sendMessage(chatId, caption, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💸 Tarik Semua Saldo", callback_data: `wd_v2_all_${saldoReal}` }],
            [{ text: "🔢 Input Nominal Manual", callback_data: "wd_v2_manual" }],
            [{ text: "❌ Batal", callback_data: "cekprofilv2" }]
          ]
        }
      });

    } else {
      await bot.sendMessage(chatId, "❌ Gagal mengambil data saldo V2.");
    }

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    console.error("❌ Error Cairkan V2:", err.message);
    await bot.sendMessage(chatId, "❌ Terjadi kesalahan koneksi ke API V2.");
  }
}

// ===============================
// 📝 INPUT NOMINAL MANUAL (OWNER)
// ===============================
if (data === "wd_v2_manual") {
  const isOwner = String(userId) === String(config.OWNER_ID);
  if (!isOwner) return;

  const msg = await bot.sendMessage(chatId, 
    "🔢 *INPUT NOMINAL PENCAIRAN*\n\nSilakan ketik nominal yang ingin ditarik dari akun V2.\nContoh: `50000`", 
    { parse_mode: "Markdown" }
  );
  
  // Simpan state
  if (!global.ownerWdState) global.ownerWdState = {};
  global.ownerWdState[userId] = {
    active: true,
    messageId: msg.message_id
  };
}

// ===============================
// 🚀 EKSEKUSI PENCAIRAN V2 (Simulasi/Log)
// ===============================
// Note: Karena RumahOTP biasanya tidak membuka API Withdraw publik, 
// fitur ini akan mencatat log bahwa Owner telah melakukan penarikan 
// (atau memproses manual via Web).

if (data.startsWith("wd_v2_all_")) {
  const saldoAvailable = parseInt(data.split("_")[3]);
  await processOwnerWithdraw(chatId, userId, saldoAvailable);
}

// ===============================  
// 💰 RIWAYAT DEPOSIT USER - ENHANCED
// ===============================  
if (data === "riwayat_deposit") {
  const fs = require("fs");
  const pathDeposit = "./database/deposit.json";
  const pathSaldo = "./database/saldoOtp.json";

  const username = from.username ? `@${from.username}` : "🚫 Tidak ada username";
  const name = from.first_name || "👤 Tamu";
  const userId = from.id.toString();

  // Pastikan file ada
  if (!fs.existsSync(pathDeposit)) fs.writeFileSync(pathDeposit, JSON.stringify([]));
  if (!fs.existsSync(pathSaldo)) fs.writeFileSync(pathSaldo, JSON.stringify({}));

  const depositData = JSON.parse(fs.readFileSync(pathDeposit));
  const saldoData = JSON.parse(fs.readFileSync(pathSaldo));

  // Filter deposit sesuai user
  const userDeposits = depositData.filter(d => d.userId.toString() === userId);

  // Batas 10 riwayat per user
  if (userDeposits.length > 10) {
    const userLatest10 = userDeposits.slice(-10);
    const newData = depositData.filter(d => d.userId.toString() !== userId);
    const finalData = [...newData, ...userLatest10];
    fs.writeFileSync(pathDeposit, JSON.stringify(finalData, null, 2));
  }

  // Ambil ulang data deposit setelah filter
  const updatedDeposits = JSON.parse(fs.readFileSync(pathDeposit));
  const userDepositsUpdated = updatedDeposits.filter(d => d.userId.toString() === userId);

  let caption = `📊 *RIWAYAT DEPOSIT*\n\n`;

  if (userDepositsUpdated.length === 0) {
    caption += `Kamu belum pernah melakukan deposit.\n\n`;
  } else {
    const lastDeposits = userDepositsUpdated.slice(-10).reverse();
    caption += `💰 *Deposit Terakhir:*\n`;
    for (const dep of lastDeposits) {
      let totalFormatted;
      if (dep.total === "-" || dep.total === "" || dep.total === null) {
        totalFormatted = "-";
      } else {
        totalFormatted = parseInt(dep.total).toLocaleString("id-ID");
      }

      const status = dep.status.toLowerCase().includes("success")
        ? "✅ Berhasil"
        : "❌ Dibatalkan";

      caption += `• Rp${totalFormatted} - ${status}\n`;
    }
    caption += `\n`;
  }

  const saldoUser = saldoData[userId] || 0;
  caption += `📄 *Saldo Saat Ini:* Rp${saldoUser.toLocaleString("id-ID")}`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "⬅️ Kembali", callback_data: "profile" }],
        [{ text: "📱 Menu Utama", callback_data: "back_home" }],
      ],
    },
  };

  try {
    await bot.editMessageCaption(caption, {
      chat_id: chatId,
      message_id: message.message_id,
      ...options,
    });
  } catch {
    await bot.sendMessage(chatId, caption, options);
  }

  return bot.answerCallbackQuery(callbackQuery.id);
}

// ===============================
// 💰 TOPUP MENU - ENHANCED VERSION
// ===============================
if (data === "topup") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "💰 Membuka menu deposit...", 
    show_alert: false 
  });

  const caption = `
─── 💳 *DEPOSIT SALDO* ───

Pilih metode pengisian saldo yang tersedia untuk mempercepat proses transaksi Anda.

💰 *Metode Pembayaran*
• QRIS (Instan) — otomatis terverifikasi  
• Transfer Manual — membutuhkan konfirmasi admin

⚡ *Pilihan Cepat*
Tap salah satu nominal di bawah untuk melakukan deposit instan melalui QRIS.

ℹ️ *Informasi Penting*
• Minimal deposit: Rp 3.000  
• Proses otomatis 24/7  
• Saldo langsung masuk setelah pembayaran berhasil
`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 Rp 3.000", callback_data: "quick_deposit_3000" },
          { text: "💰 Rp 5.000", callback_data: "quick_deposit_5000" }
        ],
        [
          { text: "💰 Rp 10.000", callback_data: "quick_deposit_10000" },
          { text: "💰 Rp 20.000", callback_data: "quick_deposit_20000" }
        ],
        [
          { text: "💰 Rp 50.000", callback_data: "quick_deposit_50000" },
          { text: "💰 Custom Nominal", callback_data: "custom_deposit" }
        ],
        [
          { text: "📊 Cek Saldo", callback_data: "profile" },
          { text: "⬅️ Kembali", callback_data: "back_home" }
        ]
      ]
    }
  };

  await bot.editMessageCaption(caption, {
    chat_id: chatId,
    message_id: message.message_id,
    ...options
  });
}

// ===============================
// 💰 CUSTOM DEPOSIT - ENHANCED VERSION
// ===============================
if (data === "custom_deposit") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "🔢 Masukkan nominal custom...", 
    show_alert: false 
  });

  const caption = `
💰 *DEPOSIT CUSTOM NOMINAL*

Silakan ketik nominal deposit yang Anda inginkan.

📝 *Format:* Hanya angka tanpa titik/koma
💡 *Contoh:* 
• 5000
• 15000  
• 25000

⚡ *Minimal Deposit:* Rp 3.000
💳 *Metode:* QRIS (Instant)

Ketik *batal* untuk membatalkan.
`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "❌ Batalkan", callback_data: "topup" }
        ]
      ]
    }
  };

  // Kirim pesan instruksi
  const instructionMsg = await bot.sendMessage(chatId, caption, options);
  
  // Simpan state untuk custom deposit
  if (!global.customDepositState) global.customDepositState = {};
  global.customDepositState[userId] = {
    active: true,
    messageId: instructionMsg.message_id
  };

  return;
}

// ===============================
// в„№пёҸ HELP MENU - ENHANCED VERSION (FIXED WITH BETTER EMOJI)
// ===============================
if (data === "help_menu") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "📖 Membuka pusat bantuan...", 
    show_alert: false 
  });

  const caption = `
─── 🎯 *PUSAT BANTUAN & TUTORIAL* ───

Butuh panduan? Silakan pilih salah satu tutorial di bawah untuk memahami cara penggunaan layanan dengan mudah.

📚 *Daftar Tutorial*
• 💰 Tutorial Deposit — Cara melakukan deposit saldo  
• 📱 Tutorial Order — Cara memesan nomor OTP  
• ❓ FAQ — Kumpulan pertanyaan yang sering diajukan

─── 💡 *Informasi Penting* ───
• Bot berjalan otomatis 24/7  
• Deposit & pemesanan diproses instan  
• Refund otomatis jika transaksi gagal  
• Customer Service selalu siap membantu

Jika masih membutuhkan bantuan tambahan, silakan pilih menu “🆘 Customer Service” pada menu utama.
`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 Tutorial Deposit", callback_data: "tutorial_deposit" },
          { text: "📱 Tutorial Order", callback_data: "tutorial_order" }
        ],
        [
          { text: "❓ Ketentuan", callback_data: "tutorial_faq" },
          { text: "🆘 Customer Service", callback_data: "contact_admin" }
        ],
        [
          { text: "🏠 Menu", callback_data: "back_home" }
        ]
      ]
    }
  };

  await bot.editMessageCaption(caption, {
    chat_id: chatId,
    message_id: message.message_id,
    parse_mode: "Markdown",
    reply_markup: options.reply_markup
  });
}

// ===============================
// 💰 TUTORIAL DEPOSIT (FIXED WITH BETTER EMOJI)
// ===============================
if (data === "tutorial_deposit") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "💰 Membuka tutorial deposit...", 
    show_alert: false 
  });

  const caption = `
─── 💰 *TUTORIAL DEPOSIT SALDO* ───

Panduan lengkap untuk melakukan pengisian saldo dengan cepat dan aman.

📋 *Langkah-langkah Deposit*
1. 🏠 *Buka Menu Utama*  
   • Pilih opsi **"💰 Deposit Saldo"**

2. 💵 *Pilih Nominal*  
   • Anda dapat memilih nominal cepat: 5K, 10K, 20K, 50K, 100K  
   • Atau gunakan **Custom Nominal** untuk jumlah lainnya

3. 📲 *Lakukan Pembayaran via QRIS*  
   • Scan QR yang muncul  
   • Bayar sesuai nominal tertera  
   • Sistem akan mendeteksi pembayaran secara otomatis

4. ✅ *Saldo Bertambah*  
   • Saldo masuk dalam ± 5–10 detik  
   • Langsung bisa digunakan untuk melakukan order

─── ⚡ *Keunggulan Sistem* ───
• Proses otomatis 24/7  
• Minimal deposit hanya Rp 3.000  
• Tanpa konfirmasi admin  
• Cepat, aman, dan terpercaya

💡 *Tips:* Gunakan nominal sesuai kebutuhan untuk memudahkan manajemen saldo Anda.
`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔙 Kembali", callback_data: "help_menu" },
          { text: "💰 Deposit Saldo", callback_data: "topup" }
        ],
        [
          { text: "🏠 Menu Utama", callback_data: "back_home" }
        ]
      ]
    }
  };

  await bot.editMessageCaption(caption, {
    chat_id: chatId,
    message_id: message.message_id,
    parse_mode: "Markdown",
    reply_markup: options.reply_markup
  });
}

// ===============================
// 📱 TUTORIAL ORDER (FIXED WITH BETTER EMOJI)
// ===============================
if (data === "tutorial_order") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "📱 Membuka tutorial order...", 
    show_alert: false 
  });

  const caption = `
─── 📱 *TUTORIAL ORDER NOMOR OTP* ───

Panduan lengkap untuk melakukan pemesanan nomor OTP dengan cepat dan aman.

🛒 *Proses Pemesanan*
1. 📋 *Pilih Layanan*  
   • Buka menu utama, lalu pilih **"📱 Layanan OTP"**  
   • Cari aplikasi yang ingin digunakan (WhatsApp, TikTok, dll)

2. 🌍 *Pilih Negara*  
   • Tentukan negara tujuan nomor  
   • Harga dapat berbeda di setiap negara

3. 💰 *Pilih Harga & Operator*  
   • Pilih harga yang tersedia  
   • Sesuaikan operator sesuai preferensi Anda

4. 🛒 *Pesan Nomor*  
   • Klik **"✅ Pesan Nomor Ini"**  
   • Saldo terpotong otomatis  
   • Nomor langsung muncul dan siap digunakan
   • Cek Nomer Apakah Sudah Terdaftar baru login dan minta kode sms

5. ⏳ *Tunggu OTP*  
   • Sistem otomatis memonitor SMS masuk  
   • OTP akan tampil otomatis ketika diterima  
   • Auto-cancel jika OTP tidak masuk dalam batas waktu

─── 🛡️ *Fitur Keamanan* ───
• Maksimal waktu tunggu: 15 menit  
• Refund otomatis jika gagal  
• Proses 100% otomatis  
• Riwayat transaksi tersimpan rapi

🎯 *Tips:* Pastikan saldo mencukupi sebelum memesan nomor.
`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔙 Kembali", callback_data: "help_menu" },
          { text: "📱 Order", callback_data: "choose_service" }
        ],
        [
          { text: "🏠 Menu Utama", callback_data: "back_home" }
        ]
      ]
    }
  };

  await bot.editMessageCaption(caption, {
    chat_id: chatId,
    message_id: message.message_id,
    parse_mode: "Markdown",
    reply_markup: options.reply_markup
  });
}

// ===============================
// ❓ TUTORIAL FAQ (NEW)
// ===============================
if (data === "tutorial_faq") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "❓ Membuka FAQ...", 
    show_alert: false 
  });

  const caption = `
❓ *FREQUENTLY ASKED QUESTIONS*

🤔 *PERTANYAAN UMUM:*

💳 *TENTANG DEPOSIT:*
├ ❓ Minimal deposit berapa?
├ 💰 Minimal Rp 3.000
├ 
├ ❓ Metode pembayaran apa saja?
├ 📱 QRIS (Instant)
├ 
├ ❓ Berapa lama proses deposit?
├ ⚡ 20-25 detik otomatis

📱 *TENTANG ORDER:*
├ ❓ Berapa lama dapat OTP?
├ ⏰ Maksimal 15 menit
├ 
├ ❓ Apa yang terjadi jika gagal?
├ 💸 Refund otomatis
├ 
├ ❓ Bisa pesan berapa kali?
├ ✅ Tidak ada batasan


🛠️ *MASALAH TEKNIS:*
├ ❓ Saldo tidak bertambah?
├ 📞 Hubungi CS
├ 
├ ❓ OTP tidak masuk?
├ 🔄 Coba order lagi
├ 
├ ❓ Bot tidak responsif?
├ 🔁 Restart bot

📞 *BUTUH BANTUAN?*
Klik tombol Customer Service di bawah!
`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔙 Kembali", callback_data: "help_menu" },
          { text: "🆘 CS", callback_data: "contact_admin" }
        ],
        [
          { text: "🏠 Menu Utama", callback_data: "back_home" }
        ]
      ]
    }
  };

  await bot.editMessageCaption(caption, {
    chat_id: chatId,
    message_id: message.message_id,
    parse_mode: "Markdown",
    reply_markup: options.reply_markup
  });
}

// ===============================
// ⚪ NO OPERATION HANDLER
// ===============================
if (data === "noop") {
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: "", 
    show_alert: false 
  });
  return; // Tidak melakukan apa-apa
}

// 📜 History order handler
if (data === "history_orderbot") {
  const filePath = "./database/nokosData.json";
  if (!fs.existsSync(filePath)) {
    return bot.answerCallbackQuery(callbackQuery.id, { text: "Belum ada riwayat order.", show_alert: true });
  }

  const rawData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const userOrders = rawData.filter((item) => item.customerId === userId);

  if (userOrders.length === 0) {
    return bot.answerCallbackQuery(callbackQuery.id, { text: "Kamu belum pernah melakukan order.", show_alert: true });
  }

  // Tampilkan halaman pertama
  showOrderPage(chatId, messageId, userOrders, 1, callbackQuery.id);
}

// 📄 Pagination handler
if (data.startsWith("page_")) {
  const page = parseInt(data.split("_")[1]);
  const filePath = "./database/nokosData.json";
  let rawData = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(rawData)) {
    rawData = [rawData];
  }

  const userOrders = rawData.filter((item) => item.customerId === userId);
  showOrderPage(chatId, messageId, userOrders, page, callbackQuery.id);
}

async function showOrderPage(chatId, messageId, userOrders, page, callbackId) {
  try {
    const perPage = 5;
    const totalPages = Math.ceil(userOrders.length / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageData = userOrders.slice(start, end);

    let caption = `🧾 *RIWAYAT ORDER KAMU*\nHalaman ${page}/${totalPages}\n\n`;

    pageData.forEach((order, i) => {
      caption += `*${start + i + 1}. ${order.service}* — ${order.country}\n`;
      caption += `📞 Nomor: \`${order.number}\`\n`;
      caption += `💬 OTP: ${order.otp || "Belum ada"}\n`;
      caption += `💰 Harga: ${order.price}\n`;
      caption += `🆔 Order ID: \`${order.orderId}\`\n`;
      caption += `🗓️ Tanggal: ${order.date}\n\n`;
    });

    const buttons = [];
    if (page > 1) buttons.push({ text: "⬅️ Sebelumnya", callback_data: `page_${page - 1}` });
    if (page < totalPages) buttons.push({ text: "Berikutnya ➡️", callback_data: `page_${page + 1}` });

    const keyboard = [
      buttons,
      [{ text: "🏠 Menu Utama", callback_data: "back_home" }],
    ].filter(b => b.length);

    await bot.editMessageCaption(caption, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });

    if (callbackId) bot.answerCallbackQuery(callbackId);
  } catch (err) {
    console.error("❌ Error showOrderPage:", err);
    bot.answerCallbackQuery(callbackId, {
      text: "Terjadi kesalahan saat menampilkan riwayat.",
      show_alert: true,
    });
  }
}

// =====================================================
// 🏆 LIST TOP USER MENU - ENHANCED
// =====================================================
if (data === "listtop_user") {
  return bot.editMessageCaption(
    "🏆 *LIST TOP USER*\n\nSilakan pilih kategori:",
    {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
          { text: "🛒 Top Order", callback_data: "top_order" },
          { text: "💰 Top Deposit", callback_data: "top_depo" }
          ],
          [{ text: "⬅️ Kembali", callback_data: "back_home" }],
        ],
      },
    }
  );
}

// ===============================
// 🏆 TOP ORDER - ENHANCED
// ===============================
if (data === "top_order") {
  try {
    const fs = require("fs");
    const path = "./database/nokosData.json";

    if (!fs.existsSync(path)) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Data order tidak ditemukan!",
        show_alert: true,
      });
    }

    let raw = fs.readFileSync(path, "utf8");
    let orders = [];

    try {
      orders = JSON.parse(raw);
      if (!Array.isArray(orders)) throw new Error("Data bukan array");
    } catch (e) {
      console.log("JSON ERROR:", e);
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Format JSON rusak!",
        show_alert: true,
      });
    }

    if (orders.length === 0) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Belum ada order!",
        show_alert: true,
      });
    }

    // Hitung total order per user
    const countMap = {};
    for (let o of orders) {
      if (!o.customerId) continue;

      if (!countMap[o.customerId]) {
        countMap[o.customerId] = {
          name: o.customerName || "-",
          uname: o.customerUsername || "-",
          userId: o.customerId,
          total: 0,
        };
      }
      countMap[o.customerId].total++;
    }

    const ranking = Object.values(countMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    let text = `🏆 *TOP 10 USER ORDER TERBANYAK*\n\n`;

    ranking.forEach((u, i) => {
      text += `*${i + 1}. ${u.name}* (@${u.uname})\n`;
      text += `🆔 ID: \`${u.userId}\`\n`;
      text += `🛒 Total Order: *${u.total}x*\n\n`;
    });

    const options = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: "listtop_user" }]],
      },
    };

    await bot.editMessageCaption(text, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      ...options,
    });

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    console.log("ERR TOP ORDER:", err);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Terjadi kesalahan saat memuat Top Order.",
      show_alert: true,
    });
  }
}

// ===============================
// 💰 TOP DEPOSIT - ENHANCED
// ===============================
if (data === "top_depo") {
  try {
    const fs = require("fs");
    const path = "./database/deposit.json";

    if (!fs.existsSync(path)) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Data deposit tidak ditemukan!",
        show_alert: true,
      });
    }

    let raw = fs.readFileSync(path, "utf8");
    let depo = [];

    try {
      depo = JSON.parse(raw);
      if (!Array.isArray(depo)) throw new Error("Data bukan array");
    } catch (e) {
      console.log("JSON ERROR:", e);
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Format JSON rusak!",
        show_alert: true,
      });
    }

    if (depo.length === 0) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Belum ada data deposit!",
        show_alert: true,
      });
    }

    // Hitung total deposit per user (SUCCESS ONLY)
    const map = {};
    for (let d of depo) {
      if (!d.userId) continue;
      if (d.status !== "success") continue;
      if (isNaN(d.total)) continue;

      const amount = Number(d.total);

      if (!map[d.userId]) {
        map[d.userId] = {
          userId: d.userId,
          username: d.username || "-",
          totalDepo: 0,
        };
      }

      map[d.userId].totalDepo += amount;
    }

    const arr = Object.values(map);
    if (arr.length === 0) {
      return bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Belum ada deposit berhasil!",
        show_alert: true,
      });
    }

    const ranking = arr.sort((a, b) => b.totalDepo - a.totalDepo).slice(0, 10);

    let text = `💰 *TOP 10 USER DEPOSIT TERBANYAK*\n\n`;

    ranking.forEach((u, i) => {
      text += `*${i + 1}. ${u.username}*\n`;
      text += `🆔 ID: \`${u.userId}\`\n`;
      text += `💵 Total Deposit: *Rp${u.totalDepo.toLocaleString()}*\n\n`;
    });

    const options = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: "listtop_user" }]],
      },
    };

    await bot.editMessageCaption(text, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      ...options,
    });

    await bot.answerCallbackQuery(callbackQuery.id);

  } catch (err) {
    console.log("ERR TOP DEPOSIT:", err);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Terjadi kesalahan saat memuat Top Deposit.",
      show_alert: true,
    });
  }
}


// ==============================================
// 🤖 CUSTOMER SERVICE HANDLER (FIXED)
// ==============================================
if (data === 'contact_admin') {
  const isPrivate = callbackQuery.message.chat.type === 'private';
  if (!isPrivate) return bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Hanya bisa di private chat!', show_alert: true });
  
  // const aiName = aiService.getCurrentAIName(); // <--- HAPUS BARIS INI
  
  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "👨‍💻 Chat dengan Admin", callback_data: "human_cs" }],
        [{ text: "⬅️ Kembali", callback_data: "back_home" }]
      ]
    }
  };

  await bot.editMessageCaption(
`━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
`👋 *Selamat datang di Customer Service!*\n` +
`━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
`Kami siap membantu kebutuhan Anda.\n` +
`Silakan pilih layanan di bawah.`, 
    {
      chat_id: chatId,
      message_id: message.message_id,
      ...options
    }
  );
}


if (data === 'human_cs') {
  if (String(userId) === String(config.OWNER_ID)) return bot.sendMessage(chatId, '🧠 Kamu owner, tidak bisa kontak diri sendiri!', { parse_mode: 'Markdown' });

  // Aktifkan session user untuk admin manusia
  contactSession[userId] = true;
  if (terminatedSession[userId]) delete terminatedSession[userId];
  saveSession();

  await bot.editMessageCaption(
    '📨 *CHAT DENGAN ADMIN*\n╔══════════════════════╗\nSilakan kirim pesan yang ingin kamu sampaikan kepada admin manusia.\nKetik *batal* untuk membatalkan proses.\n╚══════════════════════╝',
    {
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: "Markdown"
    }
  );
}

// ===============================
// 🏠 BACK HOME - ENHANCED VERSION
// ===============================
if (data === "back_home") {
  try {
    const fs = require("fs");
    const from = callbackQuery.from;
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const userId = from.id;
    const username = from.username ? `@${from.username}` : "🚫 Tidak ada username";
    const name = from.first_name || "👤 Tamu";
    const config = require("./config.js");

    // Ambil total pengguna
    const usersFile = "./users.json";
    let totalUsers = 0;

    if (fs.existsSync(usersFile)) {
      const dataUsers = JSON.parse(fs.readFileSync(usersFile));
      if (Array.isArray(dataUsers)) {
        totalUsers = dataUsers.length;
      }
    }


    // --- TAMBAHAN LOGIKA SYSTEM INFO ---
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramUsage = `${(usedMem / 1024 / 1024 / 1024).toFixed(2)}GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(2)}GB`;
    const osInfo = `${os.type()} (${os.arch()})`;
    // -----------------------------------

    const caption = `👋 *Halo, ${name}!*
Selamat datang di *FARIN SHOP* 🚀
_Solusi OTP Cepat, Murah & Otomatis 24/7_

▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰
👤 *INFORMASI PENGGUNA*
│ 🆔 *User ID* : \`${userId}\`
│ 👤 *Username* : ${username}
│ 💎 *Status* : _Verified Member_
▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰▱▰

🌐 *INFO SYSTEM*
│ 👥 *Total User* : ${totalUsers.toLocaleString("id-ID")} Active
│ 💻 *System OS* : ${osInfo}
│ 💾 *RAM Server* : ${ramUsage}

📢 *INFORMASI*
Harga dapat berubah sewaktu-waktu!
*⬇️Silakan pilih menu di bawah untuk memulai:*`;

    const options = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📱 Order OTP", callback_data: "choose_service" },
            { text: "💰 Deposit Saldo", callback_data: "topup" }
          ],
          [
           { text: "🛒 History Order", callback_data: "history_orderbot" },
            { text: "🧾 Cek Saldo", callback_data: "profile" }
          ],
          [
            { text: "🏆 Top Users", callback_data: "listtop_user" },
            { text: "ℹ️ Bantuan", callback_data: "help_menu" }
          ],
          [
           { text: "☎ Customer Service", callback_data: "contact_admin" }
          ]
        ],
      },
    };

    await bot.editMessageCaption(caption, {
      chat_id: chatId,
      message_id: message.message_id,
      ...options,
    });

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    console.error("❌ BACK HOME ERROR:", err);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Terjadi kesalahan saat membuka menu utama.",
      show_alert: true,
    });
  }
}

} catch (err) {
    console.error(err);
    bot.answerCallbackQuery(callbackQuery.id, {
      text: "❌ Terjadi kesalahan.",
      show_alert: true,
    });
  }
});


// ===============================
// 🧩 HANDLE MESSAGE UNTUK PENCARIAN LAYANAN - ENHANCED
// ===============================
bot.on("message", async (msg) => {
  try {
    if (!msg.text || !msg.from) return;
    
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;
    const searchText = msg.text.trim();
    
    // Cek apakah user sedang dalam mode pencarian
    if (global.searchState && global.searchState[userId] && global.searchState[userId].active) {
      // Hapus pesan input user
      await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      
      // Hapus pesan pencarian
      const searchMsgId = global.searchState[userId].messageId;
      await bot.deleteMessage(chatId, searchMsgId).catch(() => {});
      
      // Nonaktifkan state pencarian
      global.searchState[userId].active = false;
      
      // Cek apakah input mengandung koma (lebih dari 1 aplikasi)
      if (searchText.includes(',')) {
        await bot.sendMessage(chatId, 
          "❌ *Error:* Hanya boleh memasukkan 1 nama aplikasi!\n\n" +
          "Silakan gunakan tombol \"🔍 Cari Layanan\" lagi dan masukkan hanya 1 nama aplikasi.",
          { parse_mode: "Markdown" }
        );
        return;
      }
      
      // Loading pencarian
      const loadingMsg = await LoadingAnimation.sendLoading(chatId, `Mencari "${searchText}"...`);
      
      try {
        // Ambil data dari cache global
        const services = global.cachedServices || [];
        
        // Filter layanan berdasarkan nama (case insensitive)
        const filteredServices = services.filter(service => 
          service.service_name.toLowerCase().includes(searchText.toLowerCase())
        );
        
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        
        if (filteredServices.length === 0) {
          await bot.sendMessage(chatId, 
            `❌ Layanan "*${searchText}*" tidak ditemukan.\n\n` +
            `Silakan coba dengan nama yang berbeda atau periksa penulisannya.`,
            { parse_mode: "Markdown" }
          );
          return;
        }
        
        // Tampilkan hasil pencarian
        const caption = `🔍 *Hasil Pencarian untuk "*${searchText}*"*\n\nDitemukan ${filteredServices.length} layanan:`;
        
        const keyboard = filteredServices.map(service => [
          { 
            text: service.service_name, 
            callback_data: `service_${service.service_code}` 
          }
        ]);
        
        keyboard.push([{ text: "⬅️ Kembali ke Semua Layanan", callback_data: "choose_service" }]);
        
        await bot.sendMessage(chatId, caption, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard }
        });
        
      } catch (error) {
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        console.error("❌ Error saat mencari layanan:", error);
        await bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mencari layanan. Silakan coba lagi.");
      }
    }
  } catch (error) {
    console.error("❌ Error dalam handler pencarian:", error);
  }
});




// ===============================
// 🧩 HANDLE MESSAGE UNTUK WITHDRAW
// ===============================
bot.on("message", async (msg) => {
  if (!msg.text || !msg.from) return;
  const userId = msg.from.id.toString();
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Cek apakah user sedang input withdraw
  if (global.withdrawState && global.withdrawState[userId] && global.withdrawState[userId].active) {
    const state = global.withdrawState[userId];
    
    // Hapus pesan input user & pesan instruksi bot
    await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    await bot.deleteMessage(chatId, state.messageId).catch(() => {});
    
    // Reset state
    delete global.withdrawState[userId];

    if (text.toLowerCase() === "batal") {
      return bot.sendMessage(chatId, "❌ Penarikan saldo dibatalkan.", {
        reply_markup: { inline_keyboard: [[{ text: "🔙 Kembali", callback_data: "menu_pencairan" }]] }
      });
    }

    const nominal = parseInt(text.replace(/[^0-9]/g, ""));
    const minWd = 10000;
    const feeAdmin = 2000;

    // Validasi
    if (isNaN(nominal) || nominal < minWd) {
      return bot.sendMessage(chatId, `❌ Nominal tidak valid! Minimal Rp${minWd.toLocaleString("id-ID")}.`, {
        reply_markup: { inline_keyboard: [[{ text: "🔁 Ulangi", callback_data: "tarik_saldo_input" }]] }
      });
    }

    // Cek Saldo
    const fs = require("fs");
    const saldoPath = "./database/saldoOtp.json";
    let saldoData = JSON.parse(fs.readFileSync(saldoPath));
    const saldoUser = saldoData[userId] || 0;
    const totalPotong = nominal + feeAdmin;

    if (saldoUser < totalPotong) {
       return bot.sendMessage(chatId, `❌ *Saldo Tidak Cukup!*\n\n💰 Saldo: Rp${saldoUser.toLocaleString()}\n💸 Mau Tarik: Rp${nominal.toLocaleString()}\n🧾 Fee: Rp${feeAdmin.toLocaleString()}\n---------------------\n❗ Butuh: Rp${totalPotong.toLocaleString()}`, { parse_mode: "Markdown" });
    }

    // POTONG SALDO
    saldoData[userId] -= totalPotong;
    fs.writeFileSync(saldoPath, JSON.stringify(saldoData, null, 2));

    // Notifikasi Sukses ke User
    await bot.sendMessage(chatId, `
✅ *PERMINTAAN PENCAIRAN DIKIRIM!*

💰 Nominal: Rp${nominal.toLocaleString("id-ID")}
🧾 Fee: Rp${feeAdmin.toLocaleString("id-ID")}
📉 Sisa Saldo: Rp${saldoData[userId].toLocaleString("id-ID")}

Mohon tunggu, admin akan memproses pencairan ke E-Wallet Anda dalam 1x24 jam.
`, { parse_mode: "Markdown" });

    // KIRIM LAPORAN KE BOS (7478680068)
    // Sesuai request: Menggunakan referensi V2 (jika ada)
    const TARGET_ID = "7355538049";
    const userLink = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
    
    const laporanMsg = `
💸 *REQUEST PENCAIRAN SALDO (WD)*
━━━━━━━━━━━━━━━━━━
👤 User: ${userLink}
🆔 ID: \`${userId}\`
💰 Nominal: Rp${nominal.toLocaleString("id-ID")}
🧾 Fee Bot: Rp${feeAdmin.toLocaleString("id-ID")}

🏦 *Data E-Wallet User:*
(Pastikan chat user untuk minta nomor E-Wallet jika belum ada data)

✅ *Saldo user sudah dipotong otomatis.*
Silakan transfer manual ke user tersebut.
`;

    await bot.sendMessage(TARGET_ID, laporanMsg, { parse_mode: "Markdown" });
  }
});




// ===============================
// 🧩 HANDLE MESSAGE UNTUK CUSTOM DEPOSIT
// ===============================
bot.on("message", async (msg) => {
  try {
    if (!msg.text || !msg.from) return;
    
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;
    const inputText = msg.text.trim();
    
    // Cek apakah user sedang dalam mode custom deposit
    if (global.customDepositState && global.customDepositState[userId] && global.customDepositState[userId].active) {
      // Hapus pesan input user
      await bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      
      // Hapus pesan instruksi custom deposit
      const instructionMsgId = global.customDepositState[userId].messageId;
      await bot.deleteMessage(chatId, instructionMsgId).catch(() => {});
      
      // Nonaktifkan state custom deposit
      global.customDepositState[userId].active = false;
      
      // Cek jika user ingin membatalkan
      if (inputText.toLowerCase() === 'batal') {
        await bot.sendMessage(chatId, "❌ Custom deposit dibatalkan.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "💰 Kembali ke Deposit", callback_data: "topup" }]
            ]
          }
        });
        return;
      }
      
      // Validasi input harus angka
      const nominal = parseInt(inputText.replace(/[^0-9]/g, ''));
      
      if (isNaN(nominal) || nominal < 2000) {
        await bot.sendMessage(chatId, 
          `❌ *Nominal tidak valid!*\n\n` +
          `Minimal deposit: *Rp 3.000*\n` +
          `Format harus angka tanpa titik/koma.\n\n` +
          `Contoh: *5000*, *15000*, *25000*`,
          { 
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔁 Coba Lagi", callback_data: "custom_deposit" }],
                [{ text: "💰 Menu Deposit", callback_data: "topup" }]
              ]
            }
          }
        );
        return;
      }
      
      // Jika nominal valid, proses deposit
      await processCustomDeposit(chatId, userId, nominal, msg.from);
    }
  } catch (error) {
    console.error("❌ Error dalam handler custom deposit:", error);
  }
});



// ==============================================
// 🛠️ FUNGSI EKSEKUSI PENCAIRAN OWNER (MESIN UTAMA)
// ==============================================
async function processOwnerWithdraw(chatId, userId, nominal) {
  const config = require("./config.js");
  
  // Ambil nomor tujuan dari config
  // Jika tidak ada di config, gunakan default "Belum Disetting"
  const nomorTujuan = config.nomor_pencairan_RUMAHOTP || "Belum Disetting";
  
  const caption = `
✅ *REQUEST PENCAIRAN DIBUAT (OWNER)*

💰 Nominal: *Rp${nominal.toLocaleString("id-ID")}*
🏦 Tujuan DANA: \`${nomorTujuan}\`
📂 Sumber Dana: Akun RUMAHOTP V2

🚀 *Status:* Permintaan telah dicatat oleh sistem.
Silakan cek aplikasi DANA Anda atau dashboard RumahOTP untuk memproses mutasi uang yang sebenarnya.
`;

  // Kirim laporan ke chat
  await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });
}

// ==============================================
// 💰 PROSES CUSTOM DEPOSIT - ENHANCED VERSION
// ==============================================
async function processCustomDeposit(chatId, userId, amount, userInfo) {
  const fs = require("fs");
  const axios = require("axios");

  const API_KEY = config.RUMAHOTPV2;
  const OWNER_ID = config.OWNER_ID;
  const channellog = config.idchannel;

  if (!API_KEY) {
    return bot.sendMessage(chatId, `⚠️ *API Key RumahOTP belum diset di config.js!*`, { 
      parse_mode: "Markdown" 
    });
  }

  const BASE_URL = "https://www.rumahotp.com/api/v2/deposit/create";
  const STATUS_URL = "https://www.rumahotp.com/api/v2/deposit/get_status";
  const CANCEL_URL = "https://www.rumahotp.com/api/v1/deposit/cancel";
  const PAYMENT_ID = "qris";
  
  const pendingPath = "./database/depositPending.json";
  const saldoPath = "./database/saldoOtp.json";
  const depositPath = "./database/deposit.json";

  // Loading animation
  const loadingMsg = await LoadingAnimation.sendLoading(chatId, "Membuat QRIS untuk custom nominal...");

  try {
    // Inisialisasi file database
    if (!fs.existsSync(pendingPath)) fs.writeFileSync(pendingPath, JSON.stringify({}));
    if (!fs.existsSync(saldoPath)) fs.writeFileSync(saldoPath, JSON.stringify({}));
    if (!fs.existsSync(depositPath)) fs.writeFileSync(depositPath, JSON.stringify([]));

    const pendingData = JSON.parse(fs.readFileSync(pendingPath));
    const saldoData = JSON.parse(fs.readFileSync(saldoPath));
    const depositData = JSON.parse(fs.readFileSync(depositPath));

    // Inisialisasi array pending untuk user
    if (!pendingData[userId]) pendingData[userId] = [];
    
    // Bersihkan pending yang sudah expired
    pendingData[userId] = pendingData[userId].filter((d) => {
      if (Date.now() < d.expired_at_ts) return true;
      // Auto cancel yang expired
      cancelExpiredDeposit(d.id, userId);
      return false;
    });

    // CEK LIMIT 3 PENDING DEPOSIT
    if (pendingData[userId].length >= 3) {
      await bot.deleteMessage(chatId, loadingMsg.message_id);
      
      let aktifList = pendingData[userId]
        .map((x, i) => `#${i + 1} • ID: \`${x.id}\` • Rp${x.total.toLocaleString("id-ID")}`)
        .join("\n");

      return bot.sendMessage(
        chatId,
        `🚫 *LIMIT PENDING DEPOSIT TERLAHUI!*\n\nKamu masih memiliki ${pendingData[userId].length} pembayaran yang belum selesai:\n\n${aktifList}\n\n❗ Batalkan atau selesaikan salah satu pembayaran terlebih dahulu sebelum membuat yang baru.`,
        { 
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💰 Menu Deposit", callback_data: "topup" }]
            ]
          }
        }
      );
    }

    // BUAT DEPOSIT BARU - API v2
    const UNTUNG = config.UNTUNG_DEPOSIT || 0;
    const totalRequest = amount + UNTUNG;

    console.log(`🔧 Membuat custom deposit: amount=${totalRequest}, payment_id=${PAYMENT_ID}`);
    
    const response = await axios.get(
      `${BASE_URL}?amount=${totalRequest}&payment_id=${PAYMENT_ID}`, 
      {
        headers: { 
          "x-apikey": API_KEY, 
          "Accept": "application/json" 
        },
        timeout: 30000
      }
    );

    const apiResponse = response.data;
    
    if (!apiResponse.success) {
      await bot.deleteMessage(chatId, loadingMsg.message_id);
      
      let errorMsg = "❌ *Gagal membuat QRIS.*";
      if (apiResponse.message) {
        errorMsg += `\n\nDetail: ${apiResponse.message}`;
      }
      return bot.sendMessage(chatId, errorMsg, { 
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔁 Coba Lagi", callback_data: "custom_deposit" }],
            [{ text: "💰 Menu Deposit", callback_data: "topup" }]
          ]
        }
      });
    }

    const depositInfo = apiResponse.data;
    
    // Validasi respons API
    if (!depositInfo.id || !depositInfo.qr_image) {
      throw new Error("Respons API tidak valid: missing id atau qr_image");
    }

    const diterima = amount;
    const totalBaru = depositInfo.total;
    const feeAkhir = totalBaru - diterima;

    const waktuBuat = new Date(depositInfo.created_at_ts).toLocaleString("id-ID", { 
      timeZone: "Asia/Jakarta" 
    });
    
    const waktuExp = new Date(depositInfo.expired_at_ts).toLocaleString("id-ID", { 
      timeZone: "Asia/Jakarta" 
    });

    const caption = `
🏦 *PEMBAYARAN DEPOSIT CUSTOM*
━━━━━━━━━━━━━━━━━━
🧾 ID Pembayaran: \`${depositInfo.id}\`
👤 User: ${userInfo.username ? `@${userInfo.username}` : userInfo.first_name}
💰 Nominal Custom: Rp${amount.toLocaleString("id-ID")}
💳 Total Bayar: Rp${totalBaru.toLocaleString("id-ID")}
💵 Biaya Admin: Rp${feeAkhir.toLocaleString("id-ID")}
📥 Diterima: Rp${diterima.toLocaleString("id-ID")}

🕒 Dibuat: ${waktuBuat}
⏳ Kedaluwarsa: ${waktuExp}

📸 *Scan QRIS untuk membayar!*
🔁 Auto cek status setiap 5 detik.
🕔 *Akan dibatalkan otomatis jika tidak dibayar dalam 5 menit.*
`;

    await bot.deleteMessage(chatId, loadingMsg.message_id);

    // Kirim QRIS ke user
    const sentMsg = await bot.sendPhoto(chatId, depositInfo.qr_image, {
      caption,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { 
            text: "❌ Batalkan Pembayaran", 
            callback_data: `bataldeposit_${depositInfo.id}_${userId}` 
          }
        ]],
      },
    });

    // SIMPAN DATA PENDING
    pendingData[userId].push({
      id: depositInfo.id,
      total: totalBaru,
      status: depositInfo.status,
      expired_at_ts: depositInfo.expired_at_ts,
      message_id: sentMsg.message_id,
      created_at: depositInfo.created_at_ts,
      amount: diterima,
      is_custom: true
    });
    
    fs.writeFileSync(pendingPath, JSON.stringify(pendingData, null, 2));

    // AUTO CANCEL SETELAH 5 MENIT
    const autoCancelTimer = setTimeout(async () => {
      await cancelExpiredDeposit(depositInfo.id, userId);
    }, 5 * 60 * 1000);

    // AUTO CHECK STATUS SETIAP 5 DETIK
    const checkInterval = setInterval(async () => {
      await checkDepositStatus(
        depositInfo.id, 
        userId, 
        chatId, 
        sentMsg.message_id, 
        checkInterval, 
        autoCancelTimer,
        {
          totalBaru,
          diterima,
          feeAkhir,
          username: userInfo.username || userInfo.first_name
        }
      );
    }, 5000);

    // Simpan interval reference untuk cleanup
    if (!global.depositIntervals) global.depositIntervals = {};
    global.depositIntervals[depositInfo.id] = {
      checkInterval,
      autoCancelTimer
    };

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    
    console.error("❌ Error membuat custom deposit:", err.response?.data || err.message);
    
    let errorMsg = "⚠️ Terjadi kesalahan saat membuat QRIS.";
    if (err.response?.data?.message) {
      errorMsg += `\n\nDetail: ${err.response.data.message}`;
    } else if (err.message) {
      errorMsg += `\n\nError: ${err.message}`;
    }
    
    return bot.sendMessage(chatId, errorMsg, { 
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔁 Coba Lagi", callback_data: "custom_deposit" }],
          [{ text: "💰 Menu Deposit", callback_data: "topup" }]
        ]
      }
    });
  }
}

// ==============================================
// 💰 TOPUP PROCESS - ENHANCED VERSION (FIXED)
// ==============================================
bot.on("callback_query", async (callbackQuery) => {
  const { message, data, from } = callbackQuery;
  const chatId = message.chat.id;
  const userId = from.id;
  const username = from.username || from.first_name || "TanpaNama";
  const config = require("./config.js");
  
  if (await guardAll(callbackQuery)) return;

  if (data.startsWith("quick_deposit_") || data === "manual_deposit") {
    const fs = require("fs");
    const axios = require("axios");

    const API_KEY = config.RUMAHOTPV2;
    const OWNER_ID = config.OWNER_ID;
    const channellog = config.idchannel;

    if (!API_KEY) {
      return bot.sendMessage(chatId, `⚠️ *API belum diset di config.js!*`, { 
        parse_mode: "Markdown" 
      });
    }

    const BASE_URL = "https://www.rumahotp.com/api/v2/deposit/create";
    const STATUS_URL = "https://www.rumahotp.com/api/v2/deposit/get_status";
    const CANCEL_URL = "https://www.rumahotp.com/api/v1/deposit/cancel";
    const PAYMENT_ID = "qris";
    
    const pendingPath = "./database/depositPending.json";
    const saldoPath = "./database/saldoOtp.json";
    const depositPath = "./database/deposit.json";

    let amount = 0;

    // Handle quick deposit buttons
    if (data.startsWith("quick_deposit_")) {
      amount = parseInt(data.split("_")[2]);
    } else if (data === "manual_deposit") {
      // Minta nominal deposit dari user
      const promptMsg = await bot.sendMessage(
        chatId,
        `💳 *DEPOSIT BALANCE*\n\nMasukkan nominal deposit yang ingin kamu isi.\n\n💡 *Minimal Rp 3.000*\nContoh: \`5000\``,
        { parse_mode: "Markdown" }
      );

      return bot.once("message", async (msg2) => {
        amount = parseInt(msg2.text.trim());

        try {
          await bot.deleteMessage(chatId, promptMsg.message_id);
          await bot.deleteMessage(chatId, msg2.message_id);
        } catch {}

        // Validasi nominal
        if (isNaN(amount) || amount < 3000) {
          return bot.sendMessage(chatId, `🚫 *Minimal deposit Rp 3.000!*`, { 
            parse_mode: "Markdown" 
          });
        }

        // Lanjutkan proses deposit
        await processDeposit(amount);
      });
    } else {
      // Default topup menu sudah ditangani di atas
      return;
    }

    // Process deposit function
    async function processDeposit(amount) {
      // Loading animation
      const loadingMsg = await LoadingAnimation.sendLoading(chatId, "Membuat QRIS...");

      try {
        // Inisialisasi file database
        if (!fs.existsSync(pendingPath)) fs.writeFileSync(pendingPath, JSON.stringify({}));
        if (!fs.existsSync(saldoPath)) fs.writeFileSync(saldoPath, JSON.stringify({}));
        if (!fs.existsSync(depositPath)) fs.writeFileSync(depositPath, JSON.stringify([]));

        const pendingData = JSON.parse(fs.readFileSync(pendingPath));
        const saldoData = JSON.parse(fs.readFileSync(saldoPath));
        const depositData = JSON.parse(fs.readFileSync(depositPath));

        // Inisialisasi array pending untuk user
        if (!pendingData[userId]) pendingData[userId] = [];
        
        // Bersihkan pending yang sudah expired
        pendingData[userId] = pendingData[userId].filter((d) => {
          if (Date.now() < d.expired_at_ts) return true;
          // Auto cancel yang expired
          cancelExpiredDeposit(d.id, userId);
          return false;
        });

        // CEK LIMIT 3 PENDING DEPOSIT
        if (pendingData[userId].length >= 3) {
          await bot.deleteMessage(chatId, loadingMsg.message_id);
          
          let aktifList = pendingData[userId]
            .map((x, i) => `#${i + 1} • ID: \`${x.id}\` • Rp${x.total.toLocaleString("id-ID")}`)
            .join("\n");

          return bot.sendMessage(
            chatId,
            `🚫 *LIMIT PENDING DEPOSIT TERLAHUI!*\n\nKamu masih memiliki ${pendingData[userId].length} pembayaran yang belum selesai:\n\n${aktifList}\n\n❗ Batalkan atau selesaikan salah satu pembayaran terlebih dahulu sebelum membuat yang baru.`,
            { parse_mode: "Markdown" }
          );
        }

        // BUAT DEPOSIT BARU - API v2
        const UNTUNG = config.UNTUNG_DEPOSIT || 0;
        const totalRequest = amount + UNTUNG;

        console.log(`🔧 Membuat deposit: amount=${totalRequest}, payment_id=${PAYMENT_ID}`);
        
        const response = await axios.get(
          `${BASE_URL}?amount=${totalRequest}&payment_id=${PAYMENT_ID}`, 
          {
            headers: { 
              "x-apikey": API_KEY, 
              "Accept": "application/json" 
            },
            timeout: 30000
          }
        );

        const apiResponse = response.data;
        
        if (!apiResponse.success) {
          await bot.deleteMessage(chatId, loadingMsg.message_id);
          
          let errorMsg = "❌ *Gagal membuat QRIS.*";
          if (apiResponse.message) {
            errorMsg += `\n\nDetail: ${apiResponse.message}`;
          }
          return bot.sendMessage(chatId, errorMsg, { parse_mode: "Markdown" });
        }

        const depositInfo = apiResponse.data;
        
        // Validasi respons API
        if (!depositInfo.id || !depositInfo.qr_image) {
          throw new Error("Respons API tidak valid: missing id atau qr_image");
        }

        const diterima = amount;
        const totalBaru = depositInfo.total;
        const feeAkhir = totalBaru - diterima;

        const waktuBuat = new Date(depositInfo.created_at_ts).toLocaleString("id-ID", { 
          timeZone: "Asia/Jakarta" 
        });
        
        const waktuExp = new Date(depositInfo.expired_at_ts).toLocaleString("id-ID", { 
          timeZone: "Asia/Jakarta" 
        });

        const caption = `
🏦 *PEMBAYARAN DEPOSIT OTP*
━━━━━━━━━━━━━━━━━━
🧾 ID Pembayaran: \`${depositInfo.id}\`
👤 User: @${username}
💰 Nominal: Rp${totalBaru.toLocaleString("id-ID")}
💵 Biaya Admin: Rp${feeAkhir.toLocaleString("id-ID")}
📥 Diterima: Rp${diterima.toLocaleString("id-ID")}

🕒 Dibuat: ${waktuBuat}
⏳ Kedaluwarsa: ${waktuExp}

📸 *Scan QRIS untuk membayar!*
🔁 Auto cek status setiap 5 detik.
🕔 *Akan dibatalkan otomatis jika tidak dibayar dalam 5 menit.*
`;

        await bot.deleteMessage(chatId, loadingMsg.message_id);

        // Kirim QRIS ke user
        const sentMsg = await bot.sendPhoto(chatId, depositInfo.qr_image, {
          caption,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { 
                text: "❌ Batalkan Pembayaran", 
                callback_data: `bataldeposit_${depositInfo.id}_${userId}` 
              }
            ]],
          },
        });

        // SIMPAN DATA PENDING
        pendingData[userId].push({
          id: depositInfo.id,
          total: totalBaru,
          status: depositInfo.status,
          expired_at_ts: depositInfo.expired_at_ts,
          message_id: sentMsg.message_id,
          created_at: depositInfo.created_at_ts,
          amount: diterima
        });
        
        fs.writeFileSync(pendingPath, JSON.stringify(pendingData, null, 2));

        // AUTO CANCEL SETELAH 5 MENIT
        const autoCancelTimer = setTimeout(async () => {
          await cancelExpiredDeposit(depositInfo.id, userId);
        }, 5 * 60 * 1000);

        // AUTO CHECK STATUS SETIAP 5 DETIK
        const checkInterval = setInterval(async () => {
          await checkDepositStatus(
            depositInfo.id, 
            userId, 
            chatId, 
            sentMsg.message_id, 
            checkInterval, 
            autoCancelTimer,
            {
              totalBaru,
              diterima,
              feeAkhir,
              username
            }
          );
        }, 5000);

        // Simpan interval reference untuk cleanup
        if (!global.depositIntervals) global.depositIntervals = {};
        global.depositIntervals[depositInfo.id] = {
          checkInterval,
          autoCancelTimer
        };

      } catch (err) {
        await bot.deleteMessage(chatId, loadingMsg.message_id);
        
        console.error("❌ Error membuat deposit:", err.response?.data || err.message);
        
        let errorMsg = "⚠️ Terjadi kesalahan saat membuat QRIS.";
        if (err.response?.data?.message) {
          errorMsg += `\n\nDetail: ${err.response.data.message}`;
        } else if (err.message) {
          errorMsg += `\n\nError: ${err.message}`;
        }
        
        return bot.sendMessage(chatId, errorMsg, { parse_mode: "Markdown" });
      }
    }

    // Jalankan process deposit untuk quick deposit
    if (data.startsWith("quick_deposit_")) {
      await processDeposit(amount);
    }
  }
});

// ==============================================
// 🔄 FUNGSI CEK STATUS DEPOSIT - ENHANCED
// ==============================================
async function checkDepositStatus(depositId, userId, chatId, messageId, checkInterval, autoCancelTimer, depositDetails) {
  const fs = require("fs");
  const axios = require("axios");
  const config = require("./config.js");
  
  const API_KEY = config.RUMAHOTPV2;
  const STATUS_URL = "https://www.rumahotp.com/api/v2/deposit/get_status";
  const pendingPath = "./database/depositPending.json";
  const saldoPath = "./database/saldoOtp.json";
  const depositPath = "./database/deposit.json";

  try {
    const response = await axios.get(
      `${STATUS_URL}?deposit_id=${depositId}`,
      {
        headers: { 
          "x-apikey": API_KEY, 
          "Accept": "application/json" 
        },
        timeout: 10000
      }
    );

    const apiData = response.data;
    
    if (!apiData.success) {
      console.log(`❌ Gagal cek status deposit ${depositId}:`, apiData.message);
      return;
    }

    const statusInfo = apiData.data;
    const status = statusInfo.status?.toLowerCase();

    console.log(`🔍 Status deposit ${depositId}: ${status}`);

    if (status === "success") {
      // 🎉 DEPOSIT BERHASIL
      await processSuccessfulDeposit(
        depositId,
        userId,
        chatId,
        messageId,
        checkInterval,
        autoCancelTimer,
        depositDetails,
        statusInfo
      );
    } else if (status === "cancel" || status === "expired") {
      // ❌ DEPOSIT DIBATALKAN/EXPIRED
      await processCancelledDeposit(
        depositId,
        userId,
        chatId,
        messageId,
        checkInterval,
        autoCancelTimer,
        depositDetails,
        status
      );
    }
    // Status "pending" akan terus dicek

  } catch (err) {
    console.error(`❌ Error cek status deposit ${depositId}:`, err.message);
  }
}

// ==============================================
// ✅ PROSES DEPOSIT BERHASIL (User + Owner + Channel)
// ==============================================
async function processSuccessfulDeposit(
  depositId, userId, chatId, messageId, checkInterval, autoCancelTimer, 
  depositDetails, statusInfo
) {
  const fs = require("fs");
  const config = require("./config.js");
  
  const pendingPath = "./database/depositPending.json";
  const saldoPath = "./database/saldoOtp.json";
  const depositPath = "./database/deposit.json";
  
  // 🎯 ID KHUSUS (BOS)
  const TARGET_NOTIF_ID = "7355538049"; 
  // 📢 ID CHANNEL (Dari Config)
  const CHANNEL_ID = config.idchannel;

  // ANTI DOUBLE EXECUTION
  if (global.processedDeposits?.includes(depositId)) return;
  if (!global.processedDeposits) global.processedDeposits = [];
  global.processedDeposits.push(depositId);

  try {
    // Hentikan interval checking
    clearInterval(checkInterval);
    clearTimeout(autoCancelTimer);
    
    // Cleanup global intervals
    if (global.depositIntervals?.[depositId]) {
      delete global.depositIntervals[depositId];
    }

    // Baca data
    const pendingData = JSON.parse(fs.readFileSync(pendingPath));
    const saldoData = JSON.parse(fs.readFileSync(saldoPath));
    const depositData = JSON.parse(fs.readFileSync(depositPath));

    // Hapus pesan QRIS
    try { 
      await bot.deleteMessage(chatId, messageId); 
    } catch {}

    // Tambah saldo user
    saldoData[userId] = (saldoData[userId] || 0) + depositDetails.diterima;
    fs.writeFileSync(saldoPath, JSON.stringify(saldoData, null, 2));

    const waktuSukses = new Date().toLocaleString("id-ID", { 
      timeZone: "Asia/Jakarta" 
    });

    // 📝 PESAN SUKSES
    const successMsg = `
💰 *DEPOSIT OTP BERHASIL!*

🧾 ID Pembayaran: \`${depositId}\`
👤 User: @${depositDetails.username} (\`${userId}\`)
💰 Nominal: Rp${depositDetails.totalBaru.toLocaleString("id-ID")}
💵 Biaya Admin: Rp${depositDetails.feeAkhir.toLocaleString("id-ID")}
📥 Diterima: Rp${depositDetails.diterima.toLocaleString("id-ID")}
🏷️ Metode: ${statusInfo.brand_name || "QRIS"}
📆 Tanggal: ${waktuSukses}

💳 Saldo kamu telah ditambah Rp${depositDetails.diterima.toLocaleString("id-ID")} secara otomatis!
💰 Saldo Saat Ini: Rp${saldoData[userId].toLocaleString("id-ID")}
`;

    // 1️⃣ Kirim notifikasi ke User (Pembeli)
    await NotificationSystem.notifyUser(
      chatId,
      "success",
      "Deposit Berhasil!",
      successMsg
    );

    // Simpan ke riwayat deposit
    depositData.push({
      id: depositId,
      userId,
      username: depositDetails.username,
      total: depositDetails.totalBaru,
      diterima: depositDetails.diterima,
      fee: depositDetails.feeAkhir,
      status: "success",
      tanggal: new Date().toISOString(),
      metode: statusInfo.brand_name || "QRIS"
    });
    fs.writeFileSync(depositPath, JSON.stringify(depositData, null, 2));

    // Hapus dari pending
    if (pendingData[userId]) {
      pendingData[userId] = pendingData[userId].filter(x => x.id !== depositId);
      fs.writeFileSync(pendingPath, JSON.stringify(pendingData, null, 2));
    }

    // 2️⃣ KIRIM NOTIFIKASI KHUSUS KE BOS (7478680068)
    try {
      await bot.sendMessage(TARGET_NOTIF_ID, 
        `📢 *LAPORAN DEPOSIT MASUK BOS!* 🤑\n\n${successMsg}`, 
        { parse_mode: "Markdown" }
      );
    } catch (errNotif) {
      console.log(`Gagal kirim notif ke target ID ${TARGET_NOTIF_ID}:`, errNotif.message);
    }

    // 3️⃣ KIRIM KE CHANNEL (MENGGUNAKAN FOTO VIA LINK)
    if (CHANNEL_ID && CHANNEL_ID !== "" && CHANNEL_ID !== "0") {
      try {
        const channelMsg = `
✅ *LOG DEPOSIT SUKSES*

💰 *Nominal:* Rp${depositDetails.diterima.toLocaleString("id-ID")}
📅 *Waktu:* ${waktuSukses}
🆔 *ID:* \`${depositId}\`
👤 *User:* @${depositDetails.username}

_Saldo otomatis ditambahkan oleh sistem._
`;

        // Menggunakan bot.sendPhoto agar bisa mengirim gambar + teks (caption)
        // Kita gunakan config.ppthumb yang berisi link gambar Anda
        await bot.sendPhoto(CHANNEL_ID, config.deposit, { 
          caption: channelMsg, 
          parse_mode: "Markdown" 
        });

     } catch (errChannel) {
        console.log(`❌ Gagal kirim log foto ke channel ${CHANNEL_ID}:`, errChannel.message);
      }
    }
  } catch (err) {
    console.error("❌ Error proses deposit success:", err);
  }
}


// ==============================================
// ❌ PROSES DEPOSIT DIBATALKAN/EXPIRED - ENHANCED
// ==============================================
async function processCancelledDeposit(
  depositId, userId, chatId, messageId, checkInterval, autoCancelTimer, 
  depositDetails, status
) {
  const fs = require("fs");
  
  const pendingPath = "./database/depositPending.json";
  const depositPath = "./database/deposit.json";

  try {
    // Hentikan interval
    clearInterval(checkInterval);
    clearTimeout(autoCancelTimer);
    
    // Cleanup global intervals
    if (global.depositIntervals?.[depositId]) {
      delete global.depositIntervals[depositId];
    }

    // Baca data
    const pendingData = JSON.parse(fs.readFileSync(pendingPath));
    const depositData = JSON.parse(fs.readFileSync(depositPath));

    // Hapus pesan QRIS
    try { 
      await bot.deleteMessage(chatId, messageId); 
    } catch {}

    const statusText = status === "cancel" ? "Dibatalkan" : "Kedaluwarsa";

    // Kirim notifikasi ke user
    await NotificationSystem.notifyUser(
      chatId,
      "warning",
      `Pembayaran ${statusText}`,
      `🧾 ID Transaksi: \`${depositId}\`\n💰 Nominal: Rp${depositDetails.totalBaru.toLocaleString('id-ID')}\n📆 Status: ${statusText}`
    );

    // Simpan ke riwayat
    depositData.push({
      id: depositId,
      userId,
      username: depositDetails.username,
      total: depositDetails.totalBaru,
      diterima: 0,
      fee: depositDetails.feeAkhir,
      status: status,
      tanggal: new Date().toISOString(),
      metode: "QRIS"
    });
    fs.writeFileSync(depositPath, JSON.stringify(depositData, null, 2));

    // Hapus dari pending
    if (pendingData[userId]) {
      pendingData[userId] = pendingData[userId].filter(x => x.id !== depositId);
      fs.writeFileSync(pendingPath, JSON.stringify(pendingData, null, 2));
    }

  } catch (err) {
    console.error("❌ Error proses deposit cancelled:", err);
  }
}

// ==============================================
// ⏰ FUNGSI BATAL DEPOSIT EXPIRED
// ==============================================
async function cancelExpiredDeposit(depositId, userId) {
  const fs = require("fs");
  const axios = require("axios");
  const config = require("./config.js");
  
  const API_KEY = config.RUMAHOTPV2;
  const CANCEL_URL = "https://www.rumahotp.com/api/v1/deposit/cancel";
  const pendingPath = "./database/depositPending.json";
  const depositPath = "./database/deposit.json";

  try {
    // Batalkan di API
    const cancelRes = await axios.get(
      `${CANCEL_URL}?deposit_id=${depositId}`,
      {
        headers: { 
          "x-apikey": API_KEY,
          "Accept": "application/json" 
        },
        timeout: 10000
      }
    );

    if (cancelRes.data.success) {
      console.log(`✅ Auto-cancel deposit ${depositId} berhasil`);
    }

  } catch (err) {
    console.error(`❌ Gagal auto-cancel deposit ${depositId}:`, err.message);
  }
}

// ==============================================
// 🧾 HANDLE BUTTON "BATAL PEMBAYARAN" - ENHANCED
// ==============================================
bot.on("callback_query", async (cb) => {
  try {
    const data = cb.data;
    if (!data.startsWith("bataldeposit_")) return;

    const fs = require("fs");
    const axios = require("axios");
    const config = require("./config.js");

    const [_, depositId, uid] = data.split("_");
    const userId = cb.from.id.toString();
    const chatId = cb.message.chat.id;
    const msgId = cb.message.message_id;

    // Validasi kepemilikan
    if (userId !== uid) {
      return bot.answerCallbackQuery(cb.id, {
        text: "❌ Kamu tidak bisa membatalkan deposit orang lain!",
        show_alert: true
      });
    }

    const API_KEY = config.RUMAHOTPV2;
    const CANCEL_URL = "https://www.rumahotp.com/api/v1/deposit/cancel";
    const pendingPath = "./database/depositPending.json";
    const depositPath = "./database/deposit.json";

    // Inisialisasi file
    if (!fs.existsSync(depositPath)) fs.writeFileSync(depositPath, JSON.stringify([]));
    if (!fs.existsSync(pendingPath)) fs.writeFileSync(pendingPath, JSON.stringify({}));

    const depositData = JSON.parse(fs.readFileSync(depositPath));
    const pendingData = JSON.parse(fs.readFileSync(pendingPath));

    // Cari data pending
    let depositDetails = null;
    if (pendingData[userId]) {
      depositDetails = pendingData[userId].find(x => x.id === depositId);
    }

    if (!depositDetails) {
      return bot.answerCallbackQuery(cb.id, {
        text: "❌ Data pembayaran tidak ditemukan!",
        show_alert: true
      });
    }

    // Batalkan di API RumahOTP
    const cancelRes = await axios.get(
      `${CANCEL_URL}?deposit_id=${depositId}`,
      {
        headers: { 
          "x-apikey": API_KEY,
          "Accept": "application/json" 
        },
        timeout: 10000
      }
    );

    if (cancelRes.data.success) {
      // Hapus dari pending
      if (pendingData[userId]) {
        pendingData[userId] = pendingData[userId].filter(x => x.id !== depositId);
        fs.writeFileSync(pendingPath, JSON.stringify(pendingData, null, 2));
      }

      // Hapus pesan QRIS
      try { 
        await bot.deleteMessage(chatId, msgId); 
      } catch {}

      // Kirim notifikasi
      await NotificationSystem.notifyUser(
        chatId,
        "warning",
        "Pembayaran Dibatalkan",
        `🧾 ID Transaksi: \`${depositId}\`\n👤 User: [${cb.from.first_name}](tg://user?id=${userId})\n💰 Nominal: Rp${depositDetails.total.toLocaleString('id-ID')}\n💬 Status: Dibatalkan oleh pengguna`
      );

      // Simpan ke riwayat
      depositData.push({
        id: depositId,
        userId,
        username: cb.from.username || cb.from.first_name,
        total: depositDetails.total,
        status: "cancelled",
        tanggal: new Date().toISOString(),
        metode: "QRIS"
      });
      fs.writeFileSync(depositPath, JSON.stringify(depositData, null, 2));

      await bot.answerCallbackQuery(cb.id, {
        text: "✅ Pembayaran berhasil dibatalkan.",
        show_alert: false
      });

    } else {
      await bot.answerCallbackQuery(cb.id, {
        text: "⚠️ Gagal membatalkan! Mungkin sudah dibayar atau expired.",
        show_alert: true
      });
    }

  } catch (err) {
    console.error("❌ Error bataldeposit:", err.message);
    await bot.answerCallbackQuery(cb.id, {
      text: "❌ Terjadi kesalahan internal.",
      show_alert: true
    });
  }
});



// ==============================================
// 💸 FITUR CAIRKAN SALDO (DEBUG MODE)
// ==============================================
bot.onText(/^\/cairkan(?: (.*))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const args = match[1]; 

  if (await guardAll(msg)) return;

  // 1. Cek Format
  if (!args) {
    return bot.sendMessage(chatId, `❌ Format: \`/cairkan 08xxxx dana\``, { parse_mode: "Markdown" });
  }

  const parts = args.split(" ");
  const nomorTujuan = parts[0];
  const bankCode = parts[1] ? parts[1].toLowerCase() : "";
  const inputJumlah = parts[2];

  if (!nomorTujuan || !bankCode) return bot.sendMessage(chatId, "⚠️ Data tidak lengkap.");

  // --- LOGIC UTAMA ---
  const fs = require("fs");
  const saldoPath = "./database/saldoOtp.json";
  if (!fs.existsSync(saldoPath)) fs.writeFileSync(saldoPath, JSON.stringify({}));
  let saldoData = JSON.parse(fs.readFileSync(saldoPath));
  let saldoUser = saldoData[userId] || 0;

  // Cek Saldo
  if (inputJumlah && inputJumlah !== 'all' && saldoUser < parseInt(inputJumlah)) {
      return bot.sendMessage(chatId, "❌ Saldo kurang.");
  }

  const loadingMsg = await LoadingAnimation.sendLoading(chatId, `🔍 Debugging ke Server...`);

  try {
    const axios = require("axios");
    
    // 👇 PASTIKAN API KEY INI BENAR (Coba ganti jika error terus)
    const apiKeyV2 = "otpJNZD"; 

    // Request ke RumahOTP
    const response = await axios.get("https://www.rumahotp.com/api/v1/ppob/rekening/check", {
      params: { 
        bank_code: bankCode, 
        account_number: nomorTujuan 
      },
      headers: { 
        "x-apikey": apiKeyV2, 
        "Accept": "application/json" 
      },
      timeout: 15000
    });

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    const data = response.data;

    // 🔍 CETAK HASIL ASLI DARI SERVER (Supaya tau kenapa error)
    if (!data.success || data.data?.status !== "valid") {
        const alasan = data.message || "Tidak ada pesan error";
        const status = data.data?.status || "unknown";
        
        return bot.sendMessage(chatId, 
            `❌ *GAGAL DARI PUSAT*\n\n` +
            `📨 Respon Server: \`${JSON.stringify(data)}\`\n` +
            `💬 Pesan Error: *${alasan}*\n` +
            `🏷️ Status Data: *${status}*`, 
            { parse_mode: "Markdown" }
        );
    }

    // Jika Sukses
    const namaPemilik = data.data.account_name;
    const captionSukses = `✅ *VALID!* A/N: ${namaPemilik}\nNomor: ${nomorTujuan}\nBank: ${bankCode}`;
    await bot.sendMessage(chatId, captionSukses);

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    // Tampilkan Error Jaringan/Coding
    bot.sendMessage(chatId, `⚠️ *ERROR SYSTEM*\n\n${err.message}\nRespon: ${JSON.stringify(err.response?.data || "-")}`);
  }
});// ====================================================
// 🧾 COMMANDS — BOT.ONTEXT - ENHANCED
// ====================================================
// 🧾 COMMANDS — OWNER MENU (PREMIUM DASHBOARD STYLE)
// ====================================================
bot.onText(/^\/ownermenu$/i, async (msg) => {
  try {
    if (await guardAll(msg)) return;

    const userId = msg.from.id.toString();
    
    // 🔒 Validasi Tambahan (Biar tidak sembarang orang akses visualnya)
    if (userId !== config.OWNER_ID.toString()) {
        return bot.sendMessage(msg.chat.id, "🚫 *Akses Ditolak:* Menu ini hanya untuk Owner.");
    }

    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    // Tampilan Premium Dashboard
    const caption = `<blockquote><b>👑 OWNER CONTROL PANEL</b>
──────────────────────────
<b>📊 SYSTEM STATUS</b>
│ 🤖 *Bot Name* : ${config.botName}
│ 📦 *Version* : \`v${config.version}\`
│ 💾 *Memory* : \`${memoryUsage} MB\`
│ ⏳ *Uptime* : ${getRuntime()}
│ 👨‍💻 *Dev* : ${config.authorName}
──────────────────────────

<b>🛡️ SECURITY & MODES</b>
➜ \`/self\`         : 🔒 Mode Privat (Owner Only)
➜ \`/public\`       : 🌍 Mode Publik (Semua User)
➜ \`/maintenance\`  : 🛠️ Mode Perbaikan
➜ \`/grouponly\`    : 👥 Kunci ke Grup Saja

<b>⚙️ CONFIGURATION</b>
➜ \`/joinch\`       : 🔐 Wajib Join Channel
➜ \`/cooldown\`     : ⏱️ Atur Jeda Pesan

<b>👥 USER MANAGEMENT</b>
➜ \`/bluser\`       : ⚫ Blacklist User
➜ \`/unbluser\`     : ⚪ Hapus Blacklist

<b>💰 FINANCE SYSTEM</b>
➜ \`/addsaldo\`     : ➕ Tembak Saldo
➜ \`/delsaldo\`     : ➖ Tarik Saldo
➜ \`/listsaldo\`    : 📜 Cek Semua Saldo

<b>📢 BROADCAST</b>
➜ \`/broadcast\`    : 📡 Kirim Pesan ke Semua

──────────────────────────
✨ _Access Granted: Super Administrator_</blockquote>`;

    // Inline Keyboard yang lebih rapi
    const buttons = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📊 Cek Statistik", callback_data: "listtop_user" },
            { text: "💰 Cek Saldo V2", callback_data: "cekprofilv2" }
          ],
          [
            { text: "🗑️ Tutup Panel", callback_data: "back_home" } // Atau fungsi delete message
          ]
        ],
      },
      parse_mode: "HTML",
    };

    // Kirim foto dengan caption baru
    await bot.sendPhoto(msg.chat.id, config.ppthumb, {
      caption,
      ...buttons,
    });

  } catch (err) {
    logError(err, "/ownermenu");
  }
});


// =====================
// CALLBACK QUERY - ENHANCED
// =====================
//bot.on('callback_query', async (cb) => {
  //const chatId = cb.message.chat.id;
  //const data = cb.data;
  
  //const isPrivate = cb.message.chat.type === 'private';
  //const userId = cb.from.id;
  
  //if (await guardAll(cb)) return;  
//});

// =====================
// HANDLE MESSAGE (AI CS + HUMAN CS) - ENHANCED
// =====================
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  
  const isPM = msg.chat.type === 'private';
  const isOwner = String(userId) === String(config.OWNER_ID);
  const replyTo = msg.reply_to_message;
  const text = msg.text?.trim();
  const caption = msg.caption || '';
  
  if (text && text.startsWith('/')) return;
  
  if (await guardAll(msg)) return;

  // Blok pesan jika session sudah batal
  if (terminatedSession[userId] && !contactSession[userId]) return;

  // Owner membalas user
  if (isOwner && replyTo && forwardedMap[replyTo.message_id]) {
    const targetUserId = forwardedMap[replyTo.message_id];
    if (terminatedSession[targetUserId]) return;

    if (text?.toLowerCase() === 'batal') {
      delete contactSession[targetUserId];
      delete forwardedMap[replyTo.message_id];
      terminatedSession[targetUserId] = true;
      saveSession();
      await bot.sendMessage(config.OWNER_ID, `✅ Sesi dengan user \`${targetUserId}\` dibatalkan.`, { parse_mode: 'Markdown' });
      await bot.sendMessage(targetUserId, '❌ Sesi chat dibatalkan oleh Admin. Klick 📞 untuk mulai lagi.');
      return;
    }

    // Kirim balasan owner
    try {
      if (text) await bot.sendMessage(targetUserId, `📬 *Balasan dari Admin:*\n\n${text}`, { parse_mode: 'Markdown' });
      else if (msg.document) await bot.sendDocument(targetUserId, msg.document.file_id, { caption: `📦 *File dari Admin*\n\`${msg.document.file_name}\`\n📝 ${caption}`, parse_mode: 'Markdown' });
      else if (msg.photo) await bot.sendPhoto(targetUserId, msg.photo.pop().file_id, { caption: `🖼️ *Foto dari Admin*\n📝 ${caption}`, parse_mode: 'Markdown' });
      else if (msg.voice) await bot.sendVoice(targetUserId, msg.voice.file_id, { caption: `🎙️ *Voice dari Admin*\n📝 ${caption}`, parse_mode: 'Markdown' });
      else if (msg.video) await bot.sendVideo(targetUserId, msg.video.file_id, { caption: `🎥 *Video dari Admin*\n📝 ${caption}`, parse_mode: 'Markdown' });
      else if (msg.audio) await bot.sendAudio(targetUserId, msg.audio.file_id, { caption: `🎵 *Audio dari Admin*\n📝 ${caption}`, parse_mode: 'Markdown' });

      await bot.sendMessage(config.OWNER_ID, '✅ Balasan berhasil dikirim.');
    } catch { /* silent jika gagal */ }
    return;
  }

  // User mengirim pesan ke AI CS atau Admin
  if (isPM && contactSession[userId]) {
    if (text?.toLowerCase() === 'batal') {
      delete contactSession[userId];
      terminatedSession[userId] = true;
      saveSession();

      await bot.sendMessage(userId, '✅ Sesi chat dibatalkan. Tekan ☎ Customer Service untuk mulai lagi.');
      if (contactSession[userId] === 'ai') {
        await bot.sendMessage(config.OWNER_ID, `❌ Sesi AI chat dengan \`${userId}\` dibatalkan oleh user.`, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(config.OWNER_ID, `❌ Sesi chat dengan \`${userId}\` dibatalkan oleh user.`, { parse_mode: 'Markdown' });
      }
      return;
    }

    // AI Customer Service
    if (contactSession[userId] === 'ai') {
      try {
        // Kirim typing indicator
        await sendTypingAction(userId, 2000);
        
        const userName = msg.from.first_name || "Pengguna";
        const aiResponse = await aiService.getAIResponse(text, userName);
        
        await bot.sendMessage(userId, aiResponse, { 
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Akhiri Chat", callback_data: "end_ai_chat" }]]
          }
        });
        
      } catch (error) {
        console.error("AI Response Error:", error);
        await bot.sendMessage(userId, "Maaf, sedang ada gangguan teknis. Silakan coba lagi nanti atau hubungi admin langsung ya! 😊");
      }
      return;
    }

    // Admin manusia
    const info = `🆔 \`${userId}\`\n👤 *${msg.from.first_name}*\n🔗 @${msg.from.username || '-'}`;

    // Forward pesan ke owner
    if (text) {
      const fwd = await bot.sendMessage(config.OWNER_ID, `*Pesan dari User*\n\n${info}\n💬:\n${text}`, { parse_mode: 'Markdown', reply_markup: { force_reply: true } });
      forwardedMap[fwd.message_id] = userId;
    }
    if (msg.document) {
      const fwd = await bot.sendDocument(config.OWNER_ID, msg.document.file_id, { caption: `📎 *File dari User*\n${info}\n📄 \`${msg.document.file_name}\`\n📝 ${caption}`, parse_mode: 'Markdown', reply_markup: { force_reply: true } });
      forwardedMap[fwd.message_id] = userId;
    }
    if (msg.photo) {
      const fwd = await bot.sendPhoto(config.OWNER_ID, msg.photo.pop().file_id, { caption: `🖼️ *Foto dari User*\n${info}\n📝 ${caption}`, parse_mode: 'Markdown', reply_markup: { force_reply: true } });
      forwardedMap[fwd.message_id] = userId;
    }
    if (msg.voice) {
      const fwd = await bot.sendVoice(config.OWNER_ID, msg.voice.file_id, { caption: `🎙️ *Voice dari User*\n${info}\n📝 ${caption}`, parse_mode: 'Markdown', reply_markup: { force_reply: true } });
      forwardedMap[fwd.message_id] = userId;
    }
    if (msg.video) {
      const fwd = await bot.sendVideo(config.OWNER_ID, msg.video.file_id, { caption: `🎥 *Video dari User*\n${info}\n📝 ${caption}`, parse_mode: 'Markdown', reply_markup: { force_reply: true } });
      forwardedMap[fwd.message_id] = userId;
    }
    if (msg.audio) {
      const fwd = await bot.sendAudio(config.OWNER_ID, msg.audio.file_id, { caption: `🎵 *Audio dari User*\n${info}\n📝 ${caption}`, parse_mode: 'Markdown', reply_markup: { force_reply: true } });
      forwardedMap[fwd.message_id] = userId;
    }
    saveSession();
    await bot.sendMessage(userId, '✅ Terkirim ke admin. Ketik *batal* untuk akhiri chat.', { parse_mode: 'Markdown' });
  }
});

// =====================
// BATAL COMMAND - ENHANCED
// =====================
bot.onText(/^\/batal(?:\s+(\d+))?$/i, async (msg, match) => {
  const userId = msg.from.id.toString();
  const targetIdFromCommand = match[1];
  const replyTo = msg.reply_to_message;
  const isOwner = userId === String(config.OWNER_ID);
  
  const isPM = msg.chat.type === 'private';
  
  if (await guardAll(msg)) return;

  // USER membatalkan sendiri
  if (!isOwner && isPM) {
    if (contactSession[userId]) {
      delete contactSession[userId];
      terminatedSession[userId] = true;
      Object.keys(forwardedMap).forEach(key => {
        if (forwardedMap[key] === userId) delete forwardedMap[key];
      });
      saveSession();

      await bot.sendMessage(userId, '✅ Sesi chat dibatalkan. Tekan 📞 Contact Admin untuk mulai lagi.');
      await bot.sendMessage(config.OWNER_ID, `❌ Sesi chat dengan \`${userId}\` dibatalkan oleh user.`, { parse_mode: 'Markdown' });

      // Kirim dummy reply biar mode reply dihapus di Telegram
      await bot.sendMessage(userId, "💬 Sesi telah berakhir.", { reply_markup: { remove_keyboard: true } });
    } else {
      await bot.sendMessage(userId, 'ℹ️ Tidak ada sesi chat aktif.', { parse_mode: 'Markdown' });
    }
    return;
  }

  // OWNER membatalkan user
  if (!isOwner) return;

  let targetId;
  if (targetIdFromCommand) targetId = targetIdFromCommand;
  else if (replyTo && forwardedMap[replyTo.message_id]) targetId = forwardedMap[replyTo.message_id];
  else return bot.sendMessage(msg.chat.id, '❌ Format salah.\nGunakan:\n`/batal 123456789`\nAtau balas pesan user yang ingin dibatalkan.', { parse_mode: 'Markdown' });

  if (!contactSession[targetId]) {
    return bot.sendMessage(msg.chat.id, `ℹ️ Tidak ada sesi aktif dengan \`${targetId}\`.`, { parse_mode: 'Markdown' });
  }

  delete contactSession[targetId];
  terminatedSession[targetId] = true;
  Object.keys(forwardedMap).forEach(key => {
    if (forwardedMap[key] === targetId) delete forwardedMap[key];
  });
  saveSession();

  await bot.sendMessage(targetId, '❌ Sesi chat dibatalkan oleh Admin.');
  await bot.sendMessage(msg.chat.id, `✅ Sesi dengan user \`${targetId}\` telah dibatalkan.`, { parse_mode: 'Markdown' });

  // Kirim dummy reply agar "Membalas Security Bots" hilang
  await bot.sendMessage(config.OWNER_ID, "💬 Sesi telah ditutup.", { reply_markup: { remove_keyboard: true } });
});

// ======================= 🔒 /SELF - ENHANCED =======================
bot.onText(/^\/self$/i, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
        if (await guardAll(msg)) return;

    // 🔒 Hanya owner
    if (userId !== config.OWNER_ID.toString()) {
      return bot.sendMessage(
        chatId,
        "🚫 *Akses ditolak!*\nHanya owner yang dapat menggunakan perintah ini.",
        { parse_mode: "Markdown" }
      );
    }

    // Baca status mode sekarang
    let currentMode = { self: false };
    if (fs.existsSync(modeFile)) {
      try {
        currentMode = JSON.parse(fs.readFileSync(modeFile, "utf8"));
      } catch {
        currentMode = { self: false };
      }
    }

    // Jika sudah self mode
    if (currentMode.self === true) {
      return bot.sendMessage(
        chatId,
        "⚠️ Mode *Self* sudah aktif sebelumnya!\nTidak perlu diaktifkan lagi.",
        { parse_mode: "Markdown" }
      );
    }

    // Aktifkan mode self
    fs.writeFileSync(modeFile, JSON.stringify({ self: true }, null, 2));
    await bot.sendMessage(
      chatId,
      "🔒 Mode *Self* berhasil diaktifkan!\nSekarang hanya *owner* yang bisa menggunakan bot.",
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError(err, "/self");
  }
});

// ======================= 🌍 /PUBLIC - ENHANCED =======================
bot.onText(/^\/public$/i, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
        if (await guardAll(msg)) return;

    // 🔒 Hanya owner
    if (userId !== config.OWNER_ID.toString()) {
      return bot.sendMessage(
        chatId,
        "🚫 *Akses ditolak!*\nHanya owner yang dapat menggunakan perintah ini.",
        { parse_mode: "Markdown" }
      );
    }

    // Baca status mode sekarang
    let currentMode = { self: false };
    if (fs.existsSync(modeFile)) {
      try {
        currentMode = JSON.parse(fs.readFileSync(modeFile, "utf8"));
      } catch {
        currentMode = { self: false };
      }
    }

    // Jika sudah mode public
    if (currentMode.self === false) {
      return bot.sendMessage(
        chatId,
        "⚠️ Mode *Public* sudah aktif sebelumnya!\nTidak perlu diaktifkan lagi.",
        { parse_mode: "Markdown" }
      );
    }

    // Aktifkan mode public
    fs.writeFileSync(modeFile, JSON.stringify({ self: false }, null, 2));
    await bot.sendMessage(
      chatId,
      "🌍 Mode *Public* diaktifkan!\nSekarang semua user dapat menggunakan bot.",
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError(err, "/public");
  }
});

// ======================= ⚙️ /JOINCH - ENHANCED =======================
bot.onText(/^\/joinch(?:\s*(on|off))?$/i, async (msg, match) => {
  try {
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id;
    const arg = match[1];

    if (await guardAll(msg)) return;

    // 🔒 Hanya owner
    if (userId !== config.OWNER_ID.toString()) {
      return bot.sendMessage(
        chatId,
        "🚫 *Akses ditolak!*\nHanya owner yang dapat menggunakan perintah ini.",
        { parse_mode: "Markdown" }
      );
    }

    // FIX JSON AUTO-REPAIR
    let current = { status: false };

    try {
      const raw = fs.readFileSync(joinChFile, "utf8").trim();

      if (!raw) {
        fs.writeFileSync(joinChFile, JSON.stringify(current, null, 2));
      } else {
        current = JSON.parse(raw);
      }

    } catch (err) {
      current = { status: false };
      fs.writeFileSync(joinChFile, JSON.stringify(current, null, 2));
    }

    const currentStatus = current.status ? "Aktif ✅" : "Nonaktif ❌";

    // Jika tanpa argumen → tampilkan status
    if (!arg) {
      const helpMsg = `
🔐 *WAJIB JOIN CHANNEL*

Status saat ini: *${currentStatus}*

Gunakan perintah:
• \`/joinch on\`  → Aktifkan wajib join channel
• \`/joinch off\` → Matikan wajib join channel
`;
      return bot.sendMessage(chatId, helpMsg, { parse_mode: "Markdown" });
    }

    // Ubah status
    const status = arg.toLowerCase() === "on";
    fs.writeFileSync(joinChFile, JSON.stringify({ status }, null, 2));

    const pesan = `🔐 Fitur *wajib join channel* sekarang ${status ? "*aktif*" : "*nonaktif*"}!`;
    await bot.sendMessage(chatId, pesan, { parse_mode: "Markdown" });

  } catch (err) {
    logError(err, "/joinch");
  }
});

// ======================= ⚙️ /MAINTENANCE - ENHANCED =======================
bot.onText(/^\/maintenance(?:\s*(on|off))?$/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const arg = match[1];
    const userId = msg.from.id.toString();

    if (await guardAll(msg)) return;

    // 🔒 Hanya owner
    if (userId !== config.OWNER_ID.toString()) {
      return bot.sendMessage(
        chatId,
        "🚫 *Akses ditolak!*\nHanya owner yang dapat menggunakan perintah ini.",
        { parse_mode: "Markdown" }
      );
    }

    const maintenanceFile = path.join(__dirname, "./database/maintenance.json");

    // AUTO-REPAIR JSON (ANTI ERROR)
    let current = { status: false };

    try {
      const raw = fs.readFileSync(maintenanceFile, "utf8").trim();

      if (!raw) {
        fs.writeFileSync(maintenanceFile, JSON.stringify(current, null, 2));
      } else {
        current = JSON.parse(raw);
      }
    } catch (e) {
      current = { status: false };
      fs.writeFileSync(maintenanceFile, JSON.stringify(current, null, 2));
    }

    const currentStatus = current.status ? "Aktif ✅" : "Nonaktif ❌";

    // Jika tanpa argumen → tampilkan status
    if (!arg) {
      const helpMsg = `
🛠️ *MAINTENANCE MODE*

Status saat ini: *${currentStatus}*

Gunakan perintah berikut:
• \`/maintenance on\`  → Aktifkan mode maintenance
• \`/maintenance off\` → Nonaktifkan mode maintenance
`;
      return bot.sendMessage(chatId, helpMsg, { parse_mode: "Markdown" });
    }

    // Ubah status
    const status = arg.toLowerCase() === "on";
    fs.writeFileSync(maintenanceFile, JSON.stringify({ status }, null, 2));

    await bot.sendMessage(
      chatId,
      `⚙️ Maintenance mode ${status ? "*aktif*" : "*nonaktif*"}!`,
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    logError(err, "/maintenance");
  }
});

// ======================= ⚙️ /GROUPONLY - ENHANCED =======================
bot.onText(/^\/grouponly(?:\s*(on|off))?$/i, async (msg, match) => {
  try {
    const arg = match[1];
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
        if (await guardAll(msg)) return;

    // 🔒 Hanya owner
    if (userId !== config.OWNER_ID.toString()) {
      return bot.sendMessage(
        chatId,
        "🚫 *Akses ditolak!*\nHanya owner yang dapat menggunakan perintah ini.",
        { parse_mode: "Markdown" }
      );
    }

    const groupOnlyFile = path.join(__dirname, "./database/grouponly.json");
    if (!fs.existsSync(groupOnlyFile)) fs.writeFileSync(groupOnlyFile, JSON.stringify({ status: false }));

    const current = JSON.parse(fs.readFileSync(groupOnlyFile, "utf8"));
    const currentStatus = current.status ? "Aktif ✅" : "Nonaktif ❌";

    // Jika tanpa argumen → tampilkan tutorial
    if (!arg) {
      const helpMsg = `
⚙️ *GROUP ONLY MODE*

Status saat ini: *${currentStatus}*

Gunakan perintah berikut untuk mengubah mode:
• \`/grouponly on\`  → Aktifkan mode grup-only
• \`/grouponly off\` → Nonaktifkan mode grup-only
`;
      return bot.sendMessage(chatId, helpMsg, { parse_mode: "Markdown" });
    }

    // Ubah status sesuai argumen
    const status = arg.toLowerCase() === "on";
    fs.writeFileSync(groupOnlyFile, JSON.stringify({ status }));

    const pesan = `👥 GroupOnly mode ${status ? "*aktif*" : "*nonaktif*"}!\nSekarang bot ${
      status ? "tidak merespon chat private" : "bisa digunakan di semua tempat"
    }.`;

    await bot.sendMessage(chatId, pesan, { parse_mode: "Markdown" });
  } catch (err) {
    logError(err, "/grouponly");
  }
});

// ====================== ⚫ /BL & /BLACKLIST (ENHANCED) ======================
bot.onText(/^\/(?:bl|blacklist|bluser)(?:\s+(.*))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
        if (await guardAll(msg)) return;

    // 🔒 Hanya owner
    if (userId !== config.OWNER_ID.toString()) {
      return bot.sendMessage(
        chatId,
        "🚫 *Akses ditolak!*\nHanya owner yang dapat menggunakan perintah ini.",
        { parse_mode: "Markdown" }
      );
    }

  // Jika tanpa argumen → kirim tutorial penggunaan
  if (!match[1]) {
    const tutorial = `
📝 *Cara Menambahkan Blacklist:*

Gunakan format:
\`/bl <user_id>, <alasan>\`

📌 *Contoh:*
\`/bl 123456789, Melanggar aturan bot\`

Perintah ini akan menambahkan user ke daftar blacklist dan mereka tidak bisa menggunakan bot lagi.
`;
    return bot.sendMessage(chatId, tutorial, { parse_mode: "Markdown" });
  }

  // Parsing argumen
  const args = match[1].split(",");
  if (args.length < 2) {
    return bot.sendMessage(chatId, "❌ Format salah!\nGunakan format: `/bl <user_id>, <alasan>`", { parse_mode: "Markdown" });
  }

  const targetId = args[0].trim();
  const alasan = args.slice(1).join(",").trim();

  const blacklistFile = path.join(__dirname, "./database/blacklist.json");

  // Buat file jika belum ada
  if (!fs.existsSync(blacklistFile)) fs.writeFileSync(blacklistFile, JSON.stringify([], null, 2));

  let blacklist = JSON.parse(fs.readFileSync(blacklistFile, "utf8"));
  const sudahAda = blacklist.find((u) => u.id === targetId);

  if (sudahAda) {
    return bot.sendMessage(chatId, `⚠️ User \`${targetId}\` sudah ada di daftar blacklist.`, { parse_mode: "Markdown" });
  }

  // Tambahkan ke blacklist
  blacklist.push({
    id: targetId,
    alasan,
    waktu: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
  });
  fs.writeFileSync(blacklistFile, JSON.stringify(blacklist, null, 2));

  const teks = `
🚫 *BLACKLIST DITAMBAHKAN!*

👤 User ID: \`${targetId}\`
📋 Alasan: ${alasan}
🕐 Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}

User ini tidak dapat menggunakan bot lagi.
`;

  await bot.sendMessage(chatId, teks, { parse_mode: "Markdown" });
});

// ====================== ⚪ /UNBL & /UNBLACKLIST (ENHANCED) ======================
bot.onText(/^\/(?:unbl|unblacklist|unbluser)(?:\s+(.*))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
        if (await guardAll(msg)) return;

    // 🔒 Hanya owner
    if (userId !== config.OWNER_ID.toString()) {
      return bot.sendMessage(
        chatId,
        "🚫 *Akses ditolak!*\nHanya owner yang dapat menggunakan perintah ini.",
        { parse_mode: "Markdown" }
      );
    }

  // Jika tanpa argumen → kirim tutorial penggunaan
  if (!match[1]) {
    const tutorial = `
📝 *Cara Menghapus Blacklist:*

Gunakan format:
\`/unbl <user_id>\`

📌 *Contoh:*
\`/unbl 123456789\`

Perintah ini akan menghapus user dari daftar blacklist, sehingga mereka dapat menggunakan bot lagi.
`;
    return bot.sendMessage(chatId, tutorial, { parse_mode: "Markdown" });
  }

  // Parsing argumen
  const targetId = match[1].trim();
  const blacklistFile = path.join(__dirname, "./database/blacklist.json");

  // Pastikan file ada
  if (!fs.existsSync(blacklistFile)) {
    return bot.sendMessage(chatId, "❌ File *blacklist.json* belum ada atau kosong.", { parse_mode: "Markdown" });
  }

  let blacklist = JSON.parse(fs.readFileSync(blacklistFile, "utf8"));

  // Cek apakah user ada di daftar blacklist
  const index = blacklist.findIndex((u) => String(u.id) === String(targetId));
  if (index === -1) {
    return bot.sendMessage(chatId, `ℹ️ User \`${targetId}\` tidak ditemukan di daftar blacklist.`, { parse_mode: "Markdown" });
  }

  const removedUser = blacklist[index];
  blacklist.splice(index, 1);
  fs.writeFileSync(blacklistFile, JSON.stringify(blacklist, null, 2));

  const teks = `
✅ *BLACKLIST DIHAPUS!*

👤 User ID: \`${targetId}\`
📋 Alasan Sebelumnya: ${removedUser.alasan || "Tidak disebutkan"}
🕐 Diblacklist Pada: ${removedUser.waktu || "Tidak diketahui"}

User ini sekarang sudah bisa menggunakan bot kembali.
`;

  await bot.sendMessage(chatId, teks, { parse_mode: "Markdown" });
});

// ======================= ⚙️ /COOLDOWN & /CD - ENHANCED =======================
bot.onText(/^\/(?:cooldown|cd)(?:\s*(on|off|\d+))?$/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const arg = match[1];
    const configNow = getCooldownConfig();
    const userId = msg.from.id.toString();
        if (await guardAll(msg)) return;

    // 🔒 Hanya owner
    if (userId !== config.OWNER_ID.toString()) {
      return bot.sendMessage(
        chatId,
        "🚫 *Akses ditolak!*\nHanya owner yang dapat menggunakan perintah ini.",
        { parse_mode: "Markdown" }
      );
    }

    // Jika tanpa argumen → tampilkan status & tutorial
    if (!arg) {
      const status = configNow.enabled ? "🟢 Aktif" : "🔴 Nonaktif";
      const teks = `
⚙️ *COOLDOWN CONFIGURATION*

📊 Status : ${status}
⏱️ Waktu  : ${configNow.time} detik

Gunakan:
• \`/cooldown on\` atau \`/cd on\`  → Aktifkan cooldown
• \`/cooldown off\` atau \`/cd off\` → Matikan cooldown
• \`/cooldown 5\` atau \`/cd 5\`   → Ubah durasi cooldown (detik)
`;
      return bot.sendMessage(chatId, teks, { parse_mode: "Markdown" });
    }

    // Proses perintah (on/off/durasi)
    if (arg.toLowerCase() === "on") {
      configNow.enabled = true;
    } else if (arg.toLowerCase() === "off") {
      configNow.enabled = false;
    } else if (!isNaN(parseInt(arg))) {
      configNow.time = parseInt(arg);
    } else {
      return bot.sendMessage(chatId, "❌ Format tidak valid! Gunakan: `/cooldown on|off|<detik>`", { parse_mode: "Markdown" });
    }

    // Simpan perubahan ke file
    fs.writeFileSync(cooldownFile, JSON.stringify(configNow, null, 2));

    // Notifikasi hasil
    await bot.sendMessage(
      chatId,
      `✅ *Cooldown diperbarui!*\n\nStatus: ${configNow.enabled ? "🟢 Aktif" : "🔴 Nonaktif"}\n⏱️ Waktu: ${configNow.time} detik`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    logError(err, "/cooldown");
  }
});

// =====================================================
// 💰 FITUR MANUAL: /addsaldo - ENHANCED
// =====================================================
bot.onText(/^\/addsaldo(?:\s+(\d+))?(?:\s+(\d+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from.id.toString();
          if (await guardAll(msg)) return;

  // 🔐 Hanya owner
  if (fromId !== config.OWNER_ID.toString()) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses ke perintah ini.");
  }

  const id = match[1];        // user id
  const jumlah = parseInt(match[2]);  // nominal

  // Jika argumen tidak lengkap → tampilkan tutorial
  if (!id || !jumlah) {
    return bot.sendMessage(
      chatId,
      `❗ *Cara Pakai Perintah /addsaldo*\n\nFormat:\n\`/addsaldo <id_user> <nominal>\`\n\nContoh:\n\`/addsaldo 8333063872 5000\`\n\n• ID user adalah ID Telegram pembeli.\n• Nominal harus berupa angka tanpa titik.\n`,
      { parse_mode: "Markdown" }
    );
  }

  if (isNaN(jumlah) || jumlah <= 0) {
    return bot.sendMessage(chatId, "❌ Nominal harus berupa angka lebih dari 0.");
  }

  const fs = require("fs");
  const saldoPath = "./database/saldoOtp.json";

  // Pastikan file ada
  if (!fs.existsSync(saldoPath)) fs.writeFileSync(saldoPath, JSON.stringify({}, null, 2));

  // Baca file saldo
  let saldoData = JSON.parse(fs.readFileSync(saldoPath, "utf8"));
  let before = saldoData[id] || 0;

  // Tambah saldo
  saldoData[id] = before + jumlah;

  // Simpan file
  fs.writeFileSync(saldoPath, JSON.stringify(saldoData, null, 2));

  const after = saldoData[id];

  // NOTIFIKASI 1 — ke Admin
  const teks = `✅ Saldo user \`${id}\` ditambah *Rp${toRupiah(jumlah)}*\n\n💵 Sebelumnya: Rp${toRupiah(before)}\n💼 Total Sekarang: Rp${toRupiah(after)}`;
  bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });

  // NOTIFIKASI 2 — ke User yang ditambah saldonya
  bot.sendMessage(
    id,
    `🎉 *Saldo Anda telah ditambahkan!*\n\n💵 Sebelumnya: *Rp${toRupiah(before)}*\n➕ Tambahan: *Rp${toRupiah(jumlah)}*\n💼 Total Sekarang: *Rp${toRupiah(after)}*`,
    { parse_mode: 'Markdown' }
  ).catch(() => {});

  // NOTIFIKASI 3 — ke OWNER sebagai log
  bot.sendMessage(
    config.OWNER_ID,
    `📢 *NOTIFIKASI ADD SALDO*\n\n👤 Admin: @${msg.from.username || msg.from.first_name}\n🆔 ID Admin: \`${msg.from.id}\`\n\n➕ Menambah saldo ke ID \`${id}\` sebesar *Rp${toRupiah(jumlah)}*\n💵 Sebelumnya: *Rp${toRupiah(before)}*\n💼 Total: *Rp${toRupiah(after)}*`,
    { parse_mode: 'Markdown' }
  );
});

// =====================================================
// ❌ FITUR MANUAL: /delsaldo - ENHANCED
// =====================================================
bot.onText(/^\/delsaldo(?:\s+(\d+))?(?:\s+(\d+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from.id.toString();
            if (await guardAll(msg)) return;

  // 🔐 Hanya owner
  if (fromId !== config.OWNER_ID.toString()) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses ke perintah ini.");
  }

  const id = match[1];             // user id
  const jumlah = parseInt(match[2]); // nominal

  // Jika argumen tidak lengkap → tampilkan tutorial
  if (!id || !jumlah) {
    return bot.sendMessage(
      chatId,
      `❗ *Cara Pakai Perintah /delsaldo*\n\nFormat:\n\`/delsaldo <id_user> <nominal>\`\n\nContoh:\n\`/delsaldo 8333063872 5000\`\n\n• ID user adalah ID Telegram pembeli.\n• Nominal harus berupa angka tanpa titik.\n`,
      { parse_mode: "Markdown" }
    );
  }

  if (isNaN(jumlah) || jumlah <= 0) {
    return bot.sendMessage(chatId, "❌ Nominal harus berupa angka lebih dari 0.");
  }

  const fs = require("fs");
  const saldoPath = "./database/saldoOtp.json";

  // Pastikan file saldo ada
  if (!fs.existsSync(saldoPath)) fs.writeFileSync(saldoPath, JSON.stringify({}, null, 2));

  // Baca saldo
  let saldoData = JSON.parse(fs.readFileSync(saldoPath, "utf8"));
  let before = saldoData[id] || 0;

  // Cek apakah saldo cukup
  if (before < jumlah) {
    return bot.sendMessage(
      chatId,
      `❌ Saldo user tidak mencukupi!\n\n💵 Saldo saat ini: *Rp${toRupiah(before)}*\n➖ Yang ingin dikurangi: *Rp${toRupiah(jumlah)}*`,
      { parse_mode: "Markdown" }
    );
  }

  // Kurangi saldo
  saldoData[id] = before - jumlah;

  // Simpan file
  fs.writeFileSync(saldoPath, JSON.stringify(saldoData, null, 2));

  const after = saldoData[id];

  // NOTIFIKASI 1 — ke Admin
  const teks = `❌ Saldo user \`${id}\` dikurangi *Rp${toRupiah(jumlah)}*\n\n💵 Sebelumnya: Rp${toRupiah(before)}\n💼 Total Sekarang: Rp${toRupiah(after)}`;
  bot.sendMessage(chatId, teks, { parse_mode: 'Markdown' });

  // NOTIFIKASI 2 — ke User yang dikurangi saldonya
  bot.sendMessage(
    id,
    `⚠️ *Saldo Anda telah dikurangi!*\n\n💵 Sebelumnya: *Rp${toRupiah(before)}*\n➖ Pengurangan: *Rp${toRupiah(jumlah)}*\n💼 Total Sekarang: *Rp${toRupiah(after)}*`,
    { parse_mode: 'Markdown' }
  ).catch(() => {});

  // NOTIFIKASI 3 — ke OWNER sebagai log
  bot.sendMessage(
    config.OWNER_ID,
    `📢 *NOTIFIKASI DEL SALDO*\n\n👤 Admin: @${msg.from.username || msg.from.first_name}\n🆔 ID Admin: \`${msg.from.id}\`\n\n➖ Mengurangi saldo ID \`${id}\` sebesar *Rp${toRupiah(jumlah)}*\n💵 Sebelumnya: *Rp${toRupiah(before)}*\n💼 Total: *Rp${toRupiah(after)}*`,
    { parse_mode: 'Markdown' }
  );
});

// =====================================================
// 📋 LIST SEMUA SALDO USER - ENHANCED
// =====================================================
bot.onText(/^\/listsaldo(?:\s+(\d+))?$/i, async (msg, match) => {
  const fs = require("fs");
  const saldoPath = "./database/saldoOtp.json";
  const chatId = msg.chat.id;
  const page = parseInt(match[1]) || 1; // Default halaman 1
  const perPage = 20; // Tampilkan 20 user saja per halaman

  if (msg.from.id.toString() !== owner) return;

  if (!fs.existsSync(saldoPath)) {
    return bot.sendMessage(chatId, "❌ Data saldo tidak ditemukan.");
  }

  const saldoData = JSON.parse(fs.readFileSync(saldoPath, "utf8"));
  const entries = Object.entries(saldoData);
  
  if (entries.length === 0) return bot.sendMessage(chatId, "📭 Belum ada data saldo.");

  const totalPages = Math.ceil(entries.length / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const slice = entries.slice(start, end);

  let teks = `📋 *DAFTAR SALDO USER (Hal ${page}/${totalPages})*\n\n`;

  for (const [id, saldo] of slice) {
    // Hindari getChat (API call) di dalam loop agar tidak lambat
    teks += `🆔 \`${id}\` | 💰 Rp${toRupiah(saldo)}\n`;
  }

  const buttons = [];
  if (page > 1) buttons.push({ text: "⬅️ Prev", callback_data: `listsaldo_page_${page - 1}` });
  if (page < totalPages) buttons.push({ text: "Next ➡️", callback_data: `listsaldo_page_${page + 1}` });

  bot.sendMessage(chatId, teks, { 
    parse_mode: "Markdown",
    reply_markup: buttons.length > 0 ? { inline_keyboard: [buttons] } : {}
  });
});

// ===========================================================
// 🔁 /broadcast & /bcbot — ENHANCED
// ===========================================================
bot.onText(/^\/(broadcast|bcbot)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from.id.toString();
  const cmd = match[1];
            if (await guardAll(msg)) return;

  if (fromId !== config.OWNER_ID.toString()) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses.");
  }

  // Harus reply
  if (!msg.reply_to_message) {
    return bot.sendMessage(
      chatId,
      `❗ *Reply pesan yang ingin di-forward, lalu ketik /${cmd}.*`,
      { parse_mode: "Markdown" }
    );
  }

  const fs = require("fs");
  const userPath = "./users.json";

  if (!fs.existsSync(userPath)) {
    return bot.sendMessage(chatId, "❌ File users.json tidak ditemukan.");
  }

  let users;
  try {
    users = JSON.parse(fs.readFileSync(userPath, "utf8"));
  } catch {
    return bot.sendMessage(chatId, "❌ Gagal membaca users.json");
  }

  if (!Array.isArray(users) || users.length === 0) {
    return bot.sendMessage(chatId, "⚠️ Tidak ada user terdaftar.");
  }

  users = users.map(id => id.toString());

  let success = 0;
  let failed = 0;
  let failedIds = [];

  const startTime = Date.now();

  // Status awal
  const statusMsg = await bot.sendMessage(
    chatId,
    `🚀 Memulai broadcast...\n0% | 0/${users.length}`
  );

  const delay = 400;

  for (let i = 0; i < users.length; i++) {
    const uid = users[i];

    try {
      await bot.forwardMessage(uid, chatId, msg.reply_to_message.message_id);
      success++;
    } catch (err) {
      failed++;
      failedIds.push(uid.toString());
      console.log(`❌ Gagal kirim ke ID ${uid}: ${err.message}`);
    }

    const done = success + failed;

    // Update progress setiap 5 user
    if ((i + 1) % 5 === 0 || done === users.length) {
      const percent = Math.floor((done / users.length) * 100);

      const progress =
        `📢 *Broadcast Berjalan...*\n\n` +
        `🔄 PROSES: *${percent}%*\n` +
        `🎯 TARGET: \`${uid}\`\n` +
        `📊 PROGRESS: *${done}/${users.length}*\n\n` +
        `🟢 Berhasil: ${success}\n` +
        `🔴 Gagal: ${failed}`;

      await bot.editMessageText(progress, {
        chat_id: statusMsg.chat.id,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown"
      });
    }

    await new Promise(r => setTimeout(r, delay));
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const summary =
    `✅ *Broadcast Selesai!*\n\n` +
    `📬 Total Target: ${success + failed}\n` +
    `🟢 Berhasil: ${success}\n` +
    `🔴 Gagal: ${failed}\n` +
    `🗑 ID gagal sudah dihapus dari users.json\n` +
    `⏱ Durasi: ${duration} detik\n` +
    `📅 Selesai: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`;

  await bot.sendMessage(chatId, summary, { parse_mode: "Markdown" });
});

// ====================================================
// 🛡️ REFERRAL SYSTEM ERROR HANDLING & BACKUP - ENHANCED
// ====================================================

// Backup otomatis setiap 24 jam
setInterval(() => {
  try {
    if (fs.existsSync(referralPath)) {
      const backupDir = path.join(__dirname, "database/backup");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `referral_backup_${timestamp}.json`);
      
      const data = fs.readFileSync(referralPath, 'utf8');
      fs.writeFileSync(backupFile, data);
      
      console.log(`✅ Backup referral system: ${backupFile}`);
    }
  } catch (err) {
    console.error('❌ Gagal backup referral:', err.message);
  }
}, 24 * 60 * 60 * 1000);

// Repair corrupted JSON
function repairReferralData() {
  try {
    if (!fs.existsSync(referralPath)) {
      fs.writeFileSync(referralPath, JSON.stringify({}, null, 2));
      return true;
    }
    
    const data = fs.readFileSync(referralPath, 'utf8');
    JSON.parse(data);
    return true;
  } catch (err) {
    console.log('⚠️ Repairing corrupted referral data...');
    try {
      const corruptedBackup = path.join(__dirname, "database/referral_corrupted.json");
      if (fs.existsSync(referralPath)) {
        fs.copyFileSync(referralPath, corruptedBackup);
      }
      
      fs.writeFileSync(referralPath, JSON.stringify({}, null, 2));
      console.log('✅ Referral data repaired successfully');
      return true;
    } catch (backupErr) {
      console.error('❌ Failed to repair referral data:', backupErr);
      return false;
    }
  }
}

// Jalankan repair saat startup
setTimeout(() => {
  repairReferralData();
}, 5000);

// ====================================================
// 🧠 AUTO RESTART (ANTI HANG)
// ====================================================
setInterval(() => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  if (used > 500) {
    console.log("⚠️ Memory tinggi, restart otomatis...");
    process.exit(1);
  }
}, 30000);

//##################################//

bot.getMe().then(async () => {
  console.clear();

  console.log(chalk.yellowBright(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ⭐ FARIN SHOP — SYSTEM INITIALIZED ⭐
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `));

  console.log(
    chalk.white("• Developer : ") + chalk.cyanBright("@anjayfarin")
  );
  console.log(
    chalk.white("• Version   : ") + chalk.greenBright(config.version)
  );
  console.log(
    chalk.white("• Status    : ") + chalk.greenBright("Running")
  );

  console.log(chalk.yellowBright("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(chalk.greenBright("Bot successfully connected.\n"));

  bot.sendMessage(
    config.OWNER_ID,
    "✨ *FARIN SHOP — Status Update*\n\n" +
    "Bot sudah aktif dan berjalan normal.\n" +
    "Waktu: " + getWaktuIndonesia() + "\n" +
    "*Status:* Online",
    { parse_mode: "Markdown" }
  );
});

// ==================== ⚡ SYSTEM LOG : USER COMMAND DETECTED - ENHANCED ====================
bot.on("message", async (msg) => {
  try {
    if (!msg.text || !msg.from) return;
    const text = msg.text.trim();

    // Hanya notif untuk command "/"
    if (!text.startsWith("/")) return;

    const command = text.split(" ")[0].toLowerCase();
    const userId = msg.from.id.toString();
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
    const fullName = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim();
    const fiturDipakai = command;

    const moment = require("moment-timezone");
    const waktu = moment().tz("Asia/Jakarta").format("DD-MM-YYYY HH:mm:ss");
    
    const chatType =
      msg.chat.type === "private"
        ? "📩 Private Chat"
        : msg.chat.title
        ? `👥 Group: *${msg.chat.title}*`
        : "🌐 Unknown Zone";

    const locationInfo =
      msg.chat.type === "private"
        ? "📩 Mode     : *Private Chat*"
        : `👥 Grup     : *${msg.chat.title}*\n┃ 🆔 Group ID : \`${msg.chat.id}\``;

    // Skip notif untuk owner
    if (userId === config.OWNER_ID.toString()) return;

    const notifText = `
🎯 *USER BARU MENGGUNAKAN BOT!*

👤 *Profil User:*
├ • 🏷️ Nama: *${fullName}*
├ • 🔗 Username: ${msg.from.username ? `[@${msg.from.username}](https://t.me/${msg.from.username})` : "Tidak tersedia"}
├ • 🆔 User ID: \`${msg.from.id}\`
└ • 🕐 Waktu: ${waktu}

📋 *Informasi Command:*
├ • 💬 Command: \`${fiturDipakai}\`
├ • 📡 Status: *Live Connected*
└ • ${locationInfo.split("\n").join("\n└ • ")}

🤖 *System Info:*
├ • 🤖 Bot: ${config.botName}
├ • 🔋 Mode: Public + Real-Time
└ • 🚀 Access: Premium Service`;

    await bot.sendMessage(config.OWNER_ID, notifText, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("❌ Gagal kirim notif ke owner:", err);
  }
});

// ====================================================
// 📈 SYSTEM MONITOR HARGA (TARGET CHANNEL: @priceotp)
// ====================================================

// 1. DEFINISI VARIABEL
const priceHistoryPath = path.join(__dirname, "./database/priceHistory.json");

// 🎯 TUJUAN NOTIFIKASI (Ganti ke Channel Baru)
const TARGET_CHANNEL_ID = "@farinshopliveprince"; 

const TARGET_APPS = [
    { nameKeyword: "WhatsApp", countryIso: "id", displayName: "WhatsApp Indonesia" },
    { nameKeyword: "Telegram", countryIso: "id", displayName: "Telegram Indonesia" }
];

// ====================================================
// 2. FUNGSI CEK HARGA PINTAR (FINAL LAYOUT)
// ====================================================
async function checkPriceMonitor() {
    console.log("🧠 [SMART MONITOR] Mencari update harga top 5...");
    
    const apiKey = config.RUMAHOTP;
    // 1. Ambil Channel ID dari Config.js
    const channelId = config.id_channel_price; 
    const UNTUNG = config.UNTUNG_NOKOS || 0;
    
    const botUser = await bot.getMe();
    const botLink = `https://t.me/${botUser.username}`;

    // Load History
    let history = {};
    if (fs.existsSync(priceHistoryPath)) {
        try { history = JSON.parse(fs.readFileSync(priceHistoryPath)); } catch {}
    }

    try {
        const resServices = await axios.get("https://www.rumahotp.com/api/v2/services", {
            headers: { "x-apikey": apiKey, "Accept": "application/json" },
            timeout: 15000
        });

        if (!resServices.data.success) return;
        const allServices = resServices.data.data;

        for (const target of TARGET_APPS) {
            // Cari ID Service
            const foundService = allServices.find(s => 
                s.service_name.toLowerCase().includes(target.nameKeyword.toLowerCase())
            );

            if (!foundService) continue;
            const serviceId = foundService.service_code;

            // Ambil Data Negara
            const resCountry = await axios.get(
                `https://www.rumahotp.com/api/v2/countries?service_id=${serviceId}`,
                { headers: { "x-apikey": apiKey } }
            );

            const countryData = (resCountry.data?.data || []).find(c => c.iso_code.toLowerCase() === target.countryIso);
            if (!countryData) continue;

            // FILTER: Available & Stok >= 5
            const activeProviders = (countryData.pricelist || []).filter(p => p.available && (p.stock || 0) >= 5);
            
            if (activeProviders.length === 0) continue; 

            // Urutkan dari termurah
            activeProviders.sort((a, b) => parseInt(a.price) - parseInt(b.price));

            // Ambil Top 5
            const topServers = activeProviders.slice(0, 5);
            
            // Key History
            const historyKey = `${serviceId}_${target.countryIso}_DATA`;
            let oldData = history[historyKey] || {};
            
            let isAnyChanged = false;      
            let newData = {};
            
            // Variabel Statistik Perubahan
            let countUp = 0;
            let countDown = 0;

            // Variabel Text
            let listServerText = "";
            let cheapestServerInfo = null; // Untuk bagian "TOP SERVERS MURMER"

            // --- 🔄 LOOPING DATA ---
            topServers.forEach((srv, index) => {
                const finalPrice = parseInt(srv.price) + UNTUNG;
                const stock = srv.stock;
                const srvId = String(srv.server_id || srv.provider_id);
                
                newData[srvId] = finalPrice;
                const oldPrice = oldData[srvId];
                
                // Logic Rate Sukses (Stabil berdasarkan Harga)
                // Rumus: Sisa bagi harga dengan 20, ditambah base persen.
                // Angka ini tidak akan berubah selama harga tetap.
                let fakeRate = 0;
                let seed = finalPrice % 20; 
                
                if (finalPrice < 3500) {
                    // Murah: 10% - 30%
                    fakeRate = 10 + seed; 
                } else if (finalPrice < 6000) {
                    // Sedang: 40% - 60%
                    fakeRate = 40 + seed;
                } else {
                    // Mahal: 80% - 100%
                    fakeRate = 80 + seed; 
                }
                // Cap max 100
                if (fakeRate > 100) fakeRate = 100;

                // Format Tampilan Baris
                let priceDisplay = `Rp${finalPrice.toLocaleString()}`;
                let arrowDisplay = "";

                if (oldPrice && oldPrice !== finalPrice) {
                    isAnyChanged = true;
                    const diff = finalPrice - oldPrice;
                    
                    if (diff > 0) {
                        countUp++;
                        arrowDisplay = "(🔺)";
                    } else {
                        countDown++;
                        arrowDisplay = "(🔻)";
                    }
                    
                    priceDisplay = `Rp${oldPrice.toLocaleString()} ➡️ Rp${finalPrice.toLocaleString()} ${arrowDisplay}`;
                }

                // Simpan info server termurah (Index 0)
                if (index === 0) {
                    let diffCheapest = 0;
                    let percentCheapest = "0";
                    let arrowCheapest = "🔹";
                    let oldCheapest = finalPrice;
                    
                    if (oldPrice && oldPrice !== finalPrice) {
                        diffCheapest = finalPrice - oldPrice;
                        percentCheapest = Math.abs((diffCheapest / oldPrice) * 100).toFixed(1);
                        arrowCheapest = diffCheapest > 0 ? "🔺 Naik" : "🔻 Turun";
                        oldCheapest = oldPrice;
                    }

                    cheapestServerInfo = {
                        name: srvId,
                        oldPrice: oldCheapest,
                        newPrice: finalPrice,
                        diff: Math.abs(diffCheapest),
                        percent: percentCheapest,
                        arrowText: arrowCheapest,
                        rate: fakeRate,
                        stock: stock
                    };
                }

                // Icon Tree
                const badge = index === 0 ? "👑 " : "├ ";
                
                listServerText += `${badge}*Server ${srvId}* | ${priceDisplay}\n`;
                listServerText += `   └ 📦 Stok: ${stock} • ⭐ Rate: ${fakeRate}%\n`;
            });

            // Jika belum ada data lama, simpan dulu
            if (Object.keys(oldData).length === 0) {
                history[historyKey] = newData;
                continue;
            }

            // --- 📢 KIRIM NOTIFIKASI ---
            if (isAnyChanged) {
                
                // Tentukan Header (Voting)
                let headerStatus = "UPDATE HARGA";
                let headerIcon = "📢"; // Default icon

                if (countDown > countUp) {
                    headerStatus = "HARGA TURUN";
                    headerIcon = "📉";
                } else if (countUp > countDown) {
                    headerStatus = "HARGA NAIK";
                    headerIcon = "📈";
                }

                const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

                // Susun Pesan sesuai Request
                const caption = `
📢 *FARIN SHOP INFO HARGA*

${headerIcon} *${headerStatus}*

👑 *TOP SERVERS MURMER*
📉 UPDATE TERMURAH:
• Server: Server ${cheapestServerInfo.name}
• Harga: Rp${cheapestServerInfo.oldPrice.toLocaleString()} ➡️ Rp${cheapestServerInfo.newPrice.toLocaleString()}
${cheapestServerInfo.arrowText} Rp${cheapestServerInfo.diff.toLocaleString()} (${cheapestServerInfo.percent}%)

📊 *INFO LAYANAN:*
• Rate Sukses: ${cheapestServerInfo.rate}%
• Stok Tersedia: ${cheapestServerInfo.stock} pcs

📱 *${target.displayName}*

📊 *UPDATE TOP 5 SERVER AVAILABLE:*
(Min. Stok 5 Pcs)

${listServerText}

_Update: ${time}_
`;

                if (channelId) {
                    await bot.sendMessage(channelId, caption, { 
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                // Tombol Vertikal (Atas Bawah)
                                [{ text: "🛒 Order Sekarang", url: botLink }],
                                [{ text: "📱 Cek Harga Real-time", url: botLink }]
                            ]
                        } 
                    }).catch(err => console.error(`❌ Gagal kirim ke ${channelId}:`, err.message));
                }

                // Update History
                history[historyKey] = newData;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

    } catch (err) {
        console.error("❌ Error Monitor Harga:", err.message);
    }

    fs.writeFileSync(priceHistoryPath, JSON.stringify(history, null, 2));
}


// 3. INTERVAL JALAN OTOMATIS
// Cek setiap 3 menit (agar tidak terlalu spam tapi tetap update)
setInterval(checkPriceMonitor, 40 * 60 * 1000); 
setTimeout(checkPriceMonitor, 10000); // Jalan pertama kali setelah 10 detik





let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log("🔄 Update File:", __filename);
  delete require.cache[file];
  require(file);
});