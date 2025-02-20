const { Client, GatewayIntentBits, SlashCommandBuilder,EmbedBuilder , REST, Routes } = require("discord.js");
const mysql = require("mysql2");
require("dotenv").config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const guildId = "SERVER_ID";
const botId = "BOT_ID";
const adminRoleId = "ADMIN_ROLE_ID";
const charVerifyId = "CHAR_VERIFY_ID";
const botToken = "BOT_TOKEN"

let db;

function connectDatabase() {
    db = mysql.createConnection({
        host: "",
        user: "",
        password: "",
        database: "",
    });

    db.connect(err => {
        if (err) {
            console.error("[MySql] Bağlantı başarısız, tekrar deneniyor...:", err);
            setTimeout(connectDatabase, 5000);
        } else {
            console.log("[MySql] MySQL bağlantısı başarılı!");
        }
    });

    db.on("error", err => {
        console.error("[MySql] Veritabanı hatası:", err);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
            console.log("[MySql] Bağlantı kaybedildi, tekrar bağlanılıyor...");
            connectDatabase();
        } else {
            throw err;
        }
    });
}

connectDatabase();

const commands = [
    new SlashCommandBuilder()
        .setName("discordesle")
        .setDescription("FiveM whitelist için discord eşleme.")
        .addStringOption(option =>
            option.setName("authkey")
                .setDescription("Size verilen doğrulama kodunu giriniz.")
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName("discordesle-sil")
        .setDescription("Belirtilen Discord ID'yi whitelistten sil.")
        .addStringOption(option =>
            option.setName("discordid")
                .setDescription("Silmek istediğiniz Discord ID'yi giriniz.")
                .setRequired(true)
        )
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(botToken);
(async () => {
    try {
        console.log("[Komut] Slash komutları yükleniyor...");
        await rest.put(Routes.applicationGuildCommands(botId, guildId), { body: commands });
        console.log("[Komut] Slash komutları başarıyla yüklendi!");
    } catch (error) {
        console.error("[Komut] Slash komutları yüklenirken hata oluştu:", error);
    }
})();

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === "discordesle") {
        const authkey = interaction.options.getString("authkey");
        const discordID = "discord:" + interaction.user.id;

        if (!interaction.member.roles.cache.has(charVerifyId)) {
            return interaction.reply({ content: "⛔ **Hata:** Bu komutu kullanmak için IC isim kanalına isim girmelisin.", ephemeral: true });
        }

        db.query("SELECT * FROM mg_whitelistcode WHERE authkey = ?", [authkey], (err, results) => {
            if (err) {
                console.error(err);
                return interaction.reply({ content: "⚠️ **Hata:** Veritabanı bağlantısında sorun oluştu. **MG** ile iletişime geçiniz. **Hata Kodu: [03]**", ephemeral: true });
            }

            if (results.length === 0) {
                return interaction.reply({ content: "⛔ **Hata:** Geçersiz veya yanlış bir **authkey** girdiniz.", ephemeral: true });
            }

            const userData = results[0];

            if (userData.discordid && userData.whitelist === 1) {
                return interaction.reply({ content: "❌ **Hata:** Zaten whitelistin var, tekrar eşleştirme yapamazsın.", ephemeral: true });
            }

            db.query("UPDATE mg_whitelistcode SET discordid = ?, whitelist = 1 WHERE authkey = ?", [discordID, authkey], (err) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: "⚠️ **Hata:** Bilgiler güncellenirken bir hata oluştu. **MG** ile iletişime geçiniz. **Hata Kodu: [01]**", ephemeral: true });
                }
                console.log("[Log] Discord hesabı etkinleştirildi discord id:" + discordID);
                logMessageEmbed("Discord Eşleştirildi","Discord id:"+interaction.member.id+"Key:"+authkey,0x0099ff,"CHANNEL_ID");
                interaction.reply({ content: "✅ **Başarılı!** Discord ID'n başarıyla eşleştirildi.", ephemeral: true });
            });
        });
    }
    
    if (interaction.commandName === "discordesle-sil") {
        if (!interaction.member.roles.cache.has(adminRoleId)) {
            return interaction.reply({ content: "⛔ **Hata:** Bu komutu kullanmak için yetkiniz yok.", ephemeral: true });
        }

        const discordID = "discord:" + interaction.options.getString("discordid");

        db.query("DELETE FROM mg_whitelistcode WHERE discordid = ?", [discordID], (err, result) => {
            if (err) {
                console.error(err);
                return interaction.reply({ content: "⚠️ **Hata:** Veritabanı bağlantısında sorun oluştu. **MG** ile iletişime geçiniz. **Hata Kodu: [04]**", ephemeral: true });
            }

            if (result.affectedRows === 0) {
                return interaction.reply({ content: "⛔ **Hata:** Belirtilen Discord ID ile eşleşen bir kayıt bulunamadı.", ephemeral: true });
            }

            console.log("[Log] Discord ID silindi: " + discordID);
            logMessageEmbed("Discord Eşleme silindi","Silen id:"+interaction.member.id+"\nSilinen id:"+interaction.options.getString("discordid"),0x0099ff,"CHANNEL_ID");
            interaction.reply({ content: `✅ **Başarılı!** ${discordID} başarıyla whitelistten kaldırıldı.`, ephemeral: true });
        });
    }
});

function logMessageEmbed(header,message,color,channelId) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        console.log('Kanal bulunamadı!');
        return;
    }

    const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(header)
    .setDescription(message)
    .setFooter({ text: '1000001', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();;

    channel.send({ embeds: [embed] })
        .then(() => console.log('Embed başarıyla gönderildi!'))
        .catch(console.error);
}

client.login(botToken);
