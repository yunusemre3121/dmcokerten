const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const MAX_MESSAGES = 100;
const activeDMs = new Map();


const MESSAGE_CONTENT = "enayi";

module.exports = {
  execute: async (message, client, botIndex, isModerator) => {
    if (message.channel.id !== config.commandChannelId) {
      if (isModerator) {
        try {
          await message.reply({
            content: `Bu komutu sadece <#${config.commandChannelId}> kanalında kullanabilirsin!`,
            ephemeral: true
          });
        } catch (error) {
          console.error(`Moderatör bot cevap veremedi:`, error);
        }
      }
      return;
    }

    const args = message.content.split(' ');
    if (args.length !== 3) {
      if (isModerator) {
        try {
          await message.reply({
            content: 'Kullanım: .dm <kullanıcı_id> <mesaj_sayısı>',
            ephemeral: true
          });
        } catch (error) {
          console.error(`Moderatör bot kullanım mesajı gönderemedi:`, error);
        }
      }
      return;
    }

    const targetId = args[1];
    const messageCount = parseInt(args[2]);

    if (isNaN(messageCount) || messageCount < 1 || messageCount > MAX_MESSAGES) {
      if (isModerator) {
        try {
          await message.reply({
            content: `Mesaj sayısı 1 ile ${MAX_MESSAGES} arasında olmalı!`,
            ephemeral: true
          });
        } catch (error) {
          console.error(`Moderatör bot mesaj sayısı hatası gönderemedi:`, error);
        }
      }
      return;
    }

    let logChannel;
    let ownerLogChannel;
    if (isModerator) {
      logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
      if (config.ownerLogChannelId) {
        ownerLogChannel = await client.channels.fetch(config.ownerLogChannelId).catch(() => null);
      }
      
      if (!logChannel) {
        try {
          await message.reply({
            content: 'Log kanalı bulunamadı, lütfen config.json dosyasını kontrol et.',
            ephemeral: true
          });
        } catch (error) {
          console.error(`Moderatör bot log kanalı hatası gönderemedi:`, error);
        }
        return;
      }
    }

    try {
      const targetUser = await client.users.fetch(targetId);
      if (activeDMs.has(targetId)) {
        if (isModerator) {
          try {
            await message.reply({
              content: 'Bu kullanıcıya zaten bir DM işlemi yapılıyor!',
              ephemeral: true
            });
          } catch (error) {
            console.error(`Moderatör bot aktif DM hatası gönderemedi:`, error);
          }
        }
        return;
      }

      // Rol kontrolü
      const guild = message.guild;
      const member = await guild.members.fetch(targetId).catch(() => null);
      if (member && member.roles.cache.has(config.noSpamRoleId)) {
        if (isModerator && logChannel) {
          const roleEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ İşlem Tamamlanamadı')
            .setDescription(`<@${targetId}> kullanıcısına spam atılamaz, koruma rolüne sahip!`)
            .addFields(
              { name: 'Kullanıcı', value: `${targetUser.tag} (${targetId})`, inline: true },
              { name: 'Hata', value: 'Spam koruma rolü', inline: true }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [roleEmbed] });
          await message.reply({
            content: `<@${targetId}> kullanıcısına spam atılamaz, koruma rolüne sahip!`,
            ephemeral: true
          });
          
          // Owner log kanalına da bildirim gönder
          if (ownerLogChannel) {
            const ownerRoleEmbed = new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ KORUMALI KULLANICI')
              .setDescription(`<@${message.author.id}> kullanıcısı, koruma rolüne sahip <@${targetId}> kullanıcısına spam atmaya çalıştı!`)
              .addFields(
                { name: 'Hedef Kullanıcı', value: `${targetUser.tag} (${targetId})`, inline: true },
                { name: 'İsteyen Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Mesaj Sayısı', value: `${messageCount}`, inline: true }
              )
              .setTimestamp();
            await ownerLogChannel.send({ embeds: [ownerRoleEmbed] });
          }
        }
        return;
      }

      activeDMs.set(targetId, true);
      
      // İşlem başlama mesajı
      if (isModerator && logChannel) {
        const startEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('🚀 İşlem Başlatıldı')
          .setDescription(`**Onur ${botIndex + 1}** <@${targetId}> kullanıcısına ${messageCount} mesaj göndermeye başlıyor...`)
          .addFields(
            { name: 'Kullanıcı', value: `${targetUser.tag} (${targetId})`, inline: true },
            { name: 'Mesaj Sayısı', value: `${messageCount}`, inline: true },
            { name: 'Durum', value: '⏳ İşlem devam ediyor...', inline: true }
          )
          .setFooter({ text: `Tarafından: ${message.author.tag}` })
          .setTimestamp();
        await logChannel.send({ embeds: [startEmbed] });
      }
      
      // Owner log kanalına başlangıç mesajı
      if (ownerLogChannel) {
        const ownerStartEmbed = new EmbedBuilder()
          .setColor('#0099FF')
          .setTitle('🔥 YENİ SPAM İŞLEMİ BAŞLATILDI')
          .setDescription(`<@${message.author.id}> kullanıcısı, <@${targetId}> kullanıcısına **Onur ${botIndex + 1}** botu ile spam başlattı.`)
          .addFields(
            { name: 'Hedef Kullanıcı', value: `${targetUser.tag} (${targetId})`, inline: true },
            { name: 'İsteyen Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: 'Mesaj Sayısı', value: `${messageCount}`, inline: true },
            { name: 'Bot', value: `Onur ${botIndex + 1}`, inline: true },
            { name: 'Sunucu', value: message.guild.name, inline: true },
            { name: 'Kanal', value: message.channel.name, inline: true }
          )
          .setTimestamp();
        await ownerLogChannel.send({ embeds: [ownerStartEmbed] });
      }

      let sentCount = 0;
      let dmClosed = false;

      for (let i = 0; i < messageCount; i++) {
        try {
          await targetUser.send(MESSAGE_CONTENT);
          sentCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          if (error.code === 50007) {
            dmClosed = true;
            
            // DM kapatma embedli mesajı
            if (isModerator && logChannel) {
              const dmClosedEmbed = new EmbedBuilder()
                .setColor('#FF6347')
                .setTitle('⛔ DM Kapatıldı')
                .setDescription(`**KAŞAR <@${targetId}> DM KAPADI!**`)
                .addFields(
                  { name: 'Kullanıcı', value: `${targetUser.tag} (${targetId})`, inline: true },
                  { name: 'Gönderilen Mesaj', value: `${sentCount}/${messageCount}`, inline: true },
                  { name: 'Durum', value: '❌ Engellendi', inline: true }
                )
                .setImage('https://i.imgur.com/vzTnsUa.gif')
                .setFooter({ text: 'DM Kapatmak Kurtarmaz' })
                .setTimestamp();
              await logChannel.send({ embeds: [dmClosedEmbed] });
              
              await message.reply({
                content: `<@${targetId}> kullanıcısının DM'leri kapalı!`,
                ephemeral: true
              });
            }
            
            // Owner log kanalına DM kapatma bildirimi
            if (ownerLogChannel) {
              const ownerDmClosedEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⛔ DM KAPATILDI')
                .setDescription(`<@${targetId}> kullanıcısı DM'lerini kapattı veya botu engelledi!`)
                .addFields(
                  { name: 'Hedef Kullanıcı', value: `${targetUser.tag} (${targetId})`, inline: true },
                  { name: 'İsteyen Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                  { name: 'Gönderilen Mesaj', value: `${sentCount}/${messageCount}`, inline: true },
                  { name: 'Bot', value: `Onur ${botIndex + 1}`, inline: true }
                )
                .setTimestamp();
              await ownerLogChannel.send({ embeds: [ownerDmClosedEmbed] });
            }
            
            break;
          }
        }
      }

      // İşlem tamamlanma mesajı
      if (!dmClosed && isModerator && logChannel) {
        const successEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ İşlem Tamamlandı')
          .setDescription(`**Onur ${botIndex + 1}** tarafından <@${targetId}> kullanıcısına ${messageCount} mesaj başarıyla gönderildi.`)
          .addFields(
            { name: 'Kullanıcı', value: `${targetUser.tag} (${targetId})`, inline: true },
            { name: 'Mesaj Sayısı', value: `${messageCount}`, inline: true },
            { name: 'Durum', value: '✅ Tamamlandı', inline: true }
          )
          .setFooter({ text: `Tarafından: ${message.author.tag}` })
          .setTimestamp();
        await logChannel.send({ embeds: [successEmbed] });
      }
      
      // Owner log kanalına tamamlanma bildirimi
      if (!dmClosed && ownerLogChannel) {
        const ownerSuccessEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ SPAM İŞLEMİ TAMAMLANDI')
          .setDescription(`<@${targetId}> kullanıcısına başarıyla ${messageCount} mesaj gönderildi.`)
          .addFields(
            { name: 'Hedef Kullanıcı', value: `${targetUser.tag} (${targetId})`, inline: true },
            { name: 'İsteyen Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: 'Gönderilen Mesaj', value: `${messageCount}/${messageCount}`, inline: true },
            { name: 'Bot', value: `Onur ${botIndex + 1}`, inline: true },
            { name: 'Süre', value: `${messageCount} saniye`, inline: true }
          )
          .setTimestamp();
        await ownerLogChannel.send({ embeds: [ownerSuccessEmbed] });
      }

    } catch (error) {
      if (error.code !== 50007 && isModerator && logChannel) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ İşlem Tamamlanamadı')
          .setDescription(`<@${targetId}> kullanıcısına mesaj gönderilemedi.`)
          .addFields(
            { name: 'Kullanıcı', value: targetId, inline: true },
            { name: 'Hata', value: error.message || 'Bilinmeyen hata', inline: true }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [errorEmbed] });
        await message.reply({
          content: 'Hata: Kullanıcı bulunamadı veya mesaj gönderilemedi.',
          ephemeral: true
        });
        
        // Owner log kanalına hata bildirimi
        if (ownerLogChannel) {
          const ownerErrorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ SPAM İŞLEMİ BAŞARISIZ')
            .setDescription(`<@${targetId}> kullanıcısına mesaj gönderme işlemi başarısız oldu.`)
            .addFields(
              { name: 'Hedef Kullanıcı', value: targetId, inline: true },
              { name: 'İsteyen Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: 'Hata Mesajı', value: error.message || 'Bilinmeyen hata', inline: true },
              { name: 'Bot', value: `Onur ${botIndex + 1}`, inline: true },
              { name: 'Hata Kodu', value: error.code || 'Yok', inline: true }
            )
            .setTimestamp();
          await ownerLogChannel.send({ embeds: [ownerErrorEmbed] });
        }
      }
    } finally {
      activeDMs.delete(targetId);
    }
  }
};