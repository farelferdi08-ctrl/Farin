const fs = require("fs");
const chalk = require("chalk");

module.exports = {
TOKEN: "8084526858:AAHGZ2hVK_7mzO-eMBnirdG-WqSEkK-n9Oo", // Token dari @BotFather
OWNER_ID: "7355538049", // ID Telegram owner
urladmin: "https://t.me/farinmodssv2",
urlchannel: "https://t.me/farinmods",
idchannel: "-1003032034957", // isi id channel untung notifikasi
botName: "Farin Shop",
version: "1.0.0",
authorName: "@FarinShop_bot",
ownerName: "Farin",
  
//==============================================[ SETTING IMAGE ]=======//
ppthumb: "https://i.ibb.co/pjDfdk9d/file-000000002ae072078ebda61e55840b15.png",       // Foto utama bot (/start)
deposit:"https://i.ibb.co/0pmY5r1F/file-0000000096f8720ba5b9b227e8b757b2.png",
berhasil:"https://i.ibb.co/XfGm0ZTV/file-00000000c6d0720bba5f5876392484af.png",
maintance:"https://i.ibb.co/3965kQ0v/file-000000002a78720ba56ba9afdfa12bf9.png",
maintanceoff:"https://i.ibb.co/FbLMrYzf/file-00000000637071fdb685832182873674.png",
id_channel_price: "-1003291462039",
//==============================================[ SETTING OTPNUM ]=======//
RUMAHOTPV2: "otp_ncRxncCVCZpFtwLJ", //token sama seperti di bawah 
RUMAHOTP: "otp_ncRxncCVCZpFtwLJ",
nomor_pencairan_RUMAHOTP: "083163985132", // masi dalam masa percobaan
type_ewallet_RUMAHOTP: "dana", // masi dalam masa percobaan
atas_nama_ewallet_RUMAHOTP: "Ahmad Farrel Ferdinand", // masi dalam masa percobaan
UNTUNG_NOKOS: 1500,
UNTUNG_DEPOSIT: 500,

};

// 🔁 Auto reload jika file config.js diubah
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.blue(">> Update File :"), chalk.black.bgWhite(`${__filename}`));
  delete require.cache[file];
  require(file);
});
