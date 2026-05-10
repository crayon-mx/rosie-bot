// src/commands/index.js
// All slash commands — aesthetic, cute, on-theme

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const coins = require('../systems/coins');
const levels = require('../systems/levels');
const shop = require('../systems/shop');
const config = require('../systems/config');
const db = require('../systems/database');

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

function isStaff(member) {
  const staffRoles = [
    process.env.ROLE_OWNER,
    process.env.ROLE_HEAD_ADMIN,
    process.env.ROLE_ADMIN,
    process.env.ROLE_MOD,
  ].filter(Boolean);
  return staffRoles.some(r => member.roles.cache.has(r));
}

function staffOnly(interaction) {
  if (!isStaff(interaction.member)) {
    const e = new EmbedBuilder()
      .setColor(config.colors.lilac)
      .setDescription('✦ staff only, bestie 🌸');
    interaction.reply({ embeds: [e], ephemeral: true });
    return true;
  }
  return false;
}

// XP progress bar
function progressBar(percent, length = 18) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

// Format large numbers
function fmt(n) {
  return Number(n).toLocaleString();
}

// Rosie footer
function footer() {
  return { text: '✦ chosen baddies · rosie' };
}

// ══════════════════════════════════════════
// COMMANDS
// ══════════════════════════════════════════

const commands = [

  // ────────────────────────────────────────
  // /balance
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('balance')
      .setDescription('Check your gleam coins and level')
      .addUserOption(o => o
        .setName('user')
        .setDescription('Check another baddie\'s balance')
        .setRequired(false)),

    async execute(interaction) {
      const target = interaction.options.getUser('user') || interaction.user;
      const isSelf = target.id === interaction.user.id;
      const m = coins.getMember(target.id, interaction.guildId);
      const info = levels.getLevelInfo(target.id, interaction.guildId);
      const bar = progressBar(info.percent);
      const nextLevel = info.nextMilestone;

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setAuthor({ name: `${target.username}'s wallet`, iconURL: target.displayAvatarURL() })
        .setDescription(`${config.div}`)
        .addFields(
          {
            name: '💎  gleam coins',
            value: `**${fmt(m.gleam_coins)}** coins\n*${fmt(m.total_earned)} earned lifetime*`,
            inline: true,
          },
          {
            name: `${info.level === 0 ? '🌸' : config.levels.find(l=>l.level<=info.level)?.emoji || '✨'}  level`,
            value: `**level ${info.level}**\n*${info.roleName}*`,
            inline: true,
          },
          { name: '\u200B', value: '\u200B', inline: false },
          {
            name: '📊  xp progress',
            value: `\`${bar}\` **${info.percent}%**\n${fmt(info.xp)} xp · *${fmt(info.toNext)} to level ${info.level + 1}*`,
            inline: false,
          },
        )
        .setFooter(footer());

      if (nextLevel) {
        embed.addFields({
          name: '🎯  next milestone',
          value: `**${nextLevel.roleName}** at level ${nextLevel.level}\n*${nextLevel.perks.slice(0, 2).join(' · ')}*`,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: isSelf });
    },
  },

  // ────────────────────────────────────────
  // /daily
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('daily')
      .setDescription('Claim your 80 gleam coins — resets every 24 hours ♡'),

    async execute(interaction) {
      const result = coins.claimDaily(interaction.user.id, interaction.guildId);

      if (!result.success) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.lilac)
          .setAuthor({ name: 'daily coins', iconURL: interaction.user.displayAvatarURL() })
          .setDescription(
            `🌙  you already claimed today, bestie\n\n` +
            `come back in **${result.hoursLeft}h ${result.minsLeft}m** ♡\n\n` +
            `*tip: use /work or /vote for extra coins while you wait*`
          )
          .setFooter(footer());
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setAuthor({ name: 'daily claimed ✓', iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`${config.div}`)
        .addFields(
          { name: '💎  earned',   value: `**+${result.amount} gleam coins**`, inline: true },
          { name: '👛  balance',  value: `**${fmt(result.newBalance)} coins**`, inline: true },
        )
        .setFooter({ text: '✦ chosen baddies · come back in 24h ♡' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ────────────────────────────────────────
  // /level
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('level')
      .setDescription('Check your level and XP progress')
      .addUserOption(o => o
        .setName('user')
        .setDescription('Check another baddie\'s level')
        .setRequired(false)),

    async execute(interaction) {
      const target = interaction.options.getUser('user') || interaction.user;
      const info = levels.getLevelInfo(target.id, interaction.guildId);
      const bar = progressBar(info.percent);
      const currentMilestone = config.levels.filter(l => l.level <= info.level).pop();
      const nextMilestone = info.nextMilestone;

      const perksText = currentMilestone?.perks
        ? currentMilestone.perks.map(p => `✦  ${p}`).join('\n')
        : '✦  verify to begin';

      const embed = new EmbedBuilder()
        .setColor(currentMilestone?.emoji ? config.colors.pink : config.colors.blush)
        .setAuthor({ name: `${target.username}'s level card`, iconURL: target.displayAvatarURL() })
        .setDescription(
          `${currentMilestone?.emoji || '🌸'}  **${info.roleName}**\n` +
          `${config.div}`
        )
        .addFields(
          { name: '📊  xp', value: `**${fmt(info.xp)}** total xp`, inline: true },
          { name: '🎯  level', value: `**level ${info.level}**`, inline: true },
          { name: '\u200B', value: '\u200B', inline: false },
          {
            name: `progress to level ${info.level + 1}`,
            value: `\`${bar}\` **${info.percent}%**\n*${fmt(info.toNext)} xp remaining*`,
            inline: false,
          },
          {
            name: '🌸  current perks',
            value: perksText,
            inline: false,
          },
        )
        .setFooter(footer());

      if (nextMilestone) {
        embed.addFields({
          name: `✨  level ${nextMilestone.level} unlocks`,
          value: nextMilestone.perks.map(p => `✦  ${p}`).join('\n'),
          inline: false,
        });
      } else {
        embed.addFields({
          name: '⭐  legendary',
          value: 'maximum level reached\nyou are chosen baddies royalty forever',
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed] });
    },
  },

  // ────────────────────────────────────────
  // /shop
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Browse the Chosen Shop 🛍'),

    async execute(interaction) {
      const embed = shop.buildShopEmbed(interaction.user.id, interaction.guildId);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ────────────────────────────────────────
  // /buy
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('buy')
      .setDescription('Purchase an item from the Chosen Shop')
      .addStringOption(o => o
        .setName('item')
        .setDescription('What do you want to buy?')
        .setRequired(true)
        .addChoices(...config.shop.map(i => ({ name: i.name, value: i.id })))),

    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });

      const itemId = interaction.options.getString('item');
      const result = await shop.purchaseItem(
        interaction.user.id,
        interaction.guildId,
        itemId,
        interaction.member,
        interaction.guild,
        interaction.client
      );

      if (!result.success) {
        const msgs = {
          item_not_found:    '✦ that item doesn\'t exist in the shop 🌸',
          not_enough:        `✦ not enough coins, bestie\nyou have **${fmt(result.has)} 💎** · need **${fmt(result.needs)} 💎** · short **${fmt(result.short)} 💎**`,
          level_required:    `✦ you need to be **level ${result.required}** for this\nyou're currently level **${result.current}** ♡`,
          mystery_cooldown:  `✦ mystery box is recharging 🎁\ncome back in **${result.hoursLeft}h**`,
          limited_sold_out:  '✦ this item isn\'t available right now — check back next month 🌸',
        };

        const embed = new EmbedBuilder()
          .setColor(config.colors.lilac)
          .setDescription(msgs[result.error] || '✦ something went wrong 🌸')
          .setFooter(footer());

        return interaction.editReply({ embeds: [embed] });
      }

      let desc = `**${result.item.name}** is yours ✨\n\n` +
                 `💎  new balance · **${fmt(result.newBalance)} coins**`;

      if (result.requiresTicket) {
        desc += `\n\n📩  *open a ticket in #tickets to claim · staff applies within 24h*`;
      }

      if (result.mysteryResult) {
        desc += `\n\n${config.div}\n🎁  **mystery result**\n${result.mysteryResult.label}`;
        if (result.mysteryResult.type === 'coins' || result.mysteryResult.type === 'xp') {
          desc += '\n*added to your account automatically ✦*';
        } else {
          desc += '\n*open a ticket in #tickets to claim your prize 🌸*';
        }
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setAuthor({ name: 'purchase successful ✓', iconURL: interaction.user.displayAvatarURL() })
        .setDescription(desc)
        .setFooter({ text: '✦ chosen baddies · all sales final · no refunds' });

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // ────────────────────────────────────────
  // /leaderboard
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('Top 10 gleam coin holders in Chosen Baddies')
      .addStringOption(o => o
        .setName('type')
        .setDescription('Coins or XP leaderboard?')
        .setRequired(false)
        .addChoices(
          { name: '💎 Gleam Coins', value: 'coins' },
          { name: '✨ XP / Levels', value: 'xp' },
        )),

    async execute(interaction) {
      await interaction.deferReply();

      const type = interaction.options.getString('type') || 'coins';
      const top = type === 'xp'
        ? db.getXPLeaderboard.all(interaction.guildId)
        : db.getLeaderboard.all(interaction.guildId);

      const medals = ['🥇', '🥈', '🥉'];

      const lines = await Promise.all(
        top.map(async (row, i) => {
          const user = await interaction.client.users.fetch(row.user_id).catch(() => null);
          const name = user ? user.username : 'unknown baddie';
          const medal = medals[i] || `**${i + 1}.**`;

          if (type === 'xp') {
            const info = levels.getLevelInfo(row.user_id, interaction.guildId);
            return `${medal}  **${name}**\n    level ${info.level} · ${fmt(row.xp)} xp`;
          } else {
            return `${medal}  **${name}**\n    ${fmt(row.gleam_coins)} 💎`;
          }
        })
      );

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(type === 'xp' ? '✨ top baddies by level' : '💎 top baddies by coins')
        .setDescription(
          `${config.div}\n\n` +
          (lines.join('\n\n') || 'no members yet 🌸') +
          `\n\n${config.div}`
        )
        .setFooter(footer());

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // ────────────────────────────────────────
  // /profile
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('profile')
      .setDescription('View your full Chosen Baddies profile card')
      .addUserOption(o => o
        .setName('user')
        .setDescription('View another baddie\'s profile')
        .setRequired(false)),

    async execute(interaction) {
      const target = interaction.options.getUser('user') || interaction.user;
      const m = coins.getMember(target.id, interaction.guildId);
      const info = levels.getLevelInfo(target.id, interaction.guildId);
      const bar = progressBar(info.percent);
      const milestone = config.levels.filter(l => l.level <= info.level).pop();

      // Leaderboard rank
      const lb = db.getLeaderboard.all(interaction.guildId);
      const rank = lb.findIndex(r => r.user_id === target.id) + 1;
      const rankText = rank > 0 ? `#${rank} in server` : 'unranked';

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setAuthor({ name: `${target.username}`, iconURL: target.displayAvatarURL() })
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setDescription(
          `${milestone?.emoji || '🌸'}  **${info.roleName}**\n` +
          `${config.div}`
        )
        .addFields(
          { name: '💎  coins',    value: `${fmt(m.gleam_coins)}`, inline: true },
          { name: '✨  level',    value: `${info.level}`,          inline: true },
          { name: '🏆  rank',     value: rankText,                 inline: true },
          { name: '📊  xp progress', value: `\`${bar}\` ${info.percent}%\n*${fmt(info.toNext)} xp to level ${info.level + 1}*`, inline: false },
          { name: '💰  lifetime earned', value: `${fmt(m.total_earned)} gleam coins total`, inline: true },
        )
        .setFooter(footer());

      await interaction.reply({ embeds: [embed] });
    },
  },

  // ────────────────────────────────────────
  // /intro
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('intro')
      .setDescription('Claim your one-time intro post bonus (25 coins) ♡'),

    async execute(interaction) {
      const result = coins.claimIntroBonus(interaction.user.id, interaction.guildId);

      if (!result.success) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.lilac)
          .setDescription('✦ you already claimed your intro bonus\n*it\'s a one-time gift, bestie 🌸*')
          .setFooter(footer());
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setDescription(
          `🌸  **intro bonus claimed!**\n\n` +
          `**+${result.amount} gleam coins** added to your account ✨\n\n` +
          `welcome to chosen baddies — we're so glad you're here ♡`
        )
        .setFooter(footer());

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ────────────────────────────────────────
  // /perks
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('perks')
      .setDescription('See all level perks and what you unlock at each milestone'),

    async execute(interaction) {
      const info = levels.getLevelInfo(interaction.user.id, interaction.guildId);

      const fields = config.levels.map(lvl => {
        const reached = info.level >= lvl.level;
        const current = config.levels.filter(l => l.level <= info.level).pop()?.level === lvl.level;
        const status = current ? '← you are here' : reached ? '✓ unlocked' : `level ${lvl.level} needed`;
        const icon = current ? '✨' : reached ? '✦' : '○';

        return {
          name: `${icon}  ${lvl.roleName}  ·  ${status}`,
          value: lvl.perks.map(p => `· ${p}`).join('\n') + (lvl.coinBonus > 0 ? `\n· +${lvl.coinBonus} coin milestone bonus` : ''),
          inline: false,
        };
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.lilac)
        .setTitle('🌸 level perks — chosen baddies')
        .setDescription(`your level: **${info.level}** · **${info.roleName}**\n${config.div}`)
        .addFields(...fields)
        .setFooter({ text: '✦ chat to earn xp · levels assigned automatically by rosie' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ────────────────────────────────────────
  // /work
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('work')
      .setDescription('Do some work for Rosie and earn coins ♡ (1h cooldown)'),

    async execute(interaction) {
      const m = db.ensureMember(interaction.user.id, interaction.guildId);
      const now = Math.floor(Date.now() / 1000);
      const WORK_COOLDOWN = 3600; // 1 hour
      const lastWork = m.last_work || 0;
      const timeSince = now - lastWork;

      if (lastWork > 0 && timeSince < WORK_COOLDOWN) {
        const left = WORK_COOLDOWN - timeSince;
        const m2 = Math.ceil(left / 60);
        const embed = new EmbedBuilder()
          .setColor(config.colors.lilac)
          .setDescription(`✦ you already worked recently, bestie\ncome back in **${m2} minutes** ♡`)
          .setFooter(footer());
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const jobs = [
        { text: 'styled Rosie\'s outfits for the week',     min: 30, max: 60  },
        { text: 'ran the chosen baddies aesthetic board',   min: 25, max: 55  },
        { text: 'curated moodboards for the server',        min: 35, max: 65  },
        { text: 'organized the selfie archive',             min: 20, max: 50  },
        { text: 'managed the glam coin economy',            min: 40, max: 70  },
        { text: 'designed new matching cards for Rosie',    min: 30, max: 60  },
        { text: 'moderated the aesthetic competition',      min: 25, max: 55  },
        { text: 'updated the hall of fame board',           min: 35, max: 65  },
      ];

      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

      coins.awardEventCoins(interaction.user.id, interaction.guildId, earned, 'work');
      db.db.prepare('UPDATE members SET last_work = ? WHERE user_id = ? AND guild_id = ?')
        .run(now, interaction.user.id, interaction.guildId);

      const updated = coins.getMember(interaction.user.id, interaction.guildId);

      const embed = new EmbedBuilder()
        .setColor(config.colors.green)
        .setAuthor({ name: 'work complete ✓', iconURL: interaction.user.displayAvatarURL() })
        .setDescription(
          `you ${job.text} 🌸\n\n` +
          `💎  **+${earned} gleam coins**\n` +
          `👛  balance: **${fmt(updated.gleam_coins)} coins**`
        )
        .setFooter({ text: '✦ chosen baddies · work again in 1 hour' });

      await interaction.reply({ embeds: [embed] });
    },
  },

  // ────────────────────────────────────────
  // /give  (gift coins to another member)
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('give')
      .setDescription('Gift gleam coins to another baddie ♡')
      .addUserOption(o => o.setName('user').setDescription('Who to gift').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('How many coins').setRequired(true).setMinValue(1).setMaxValue(500)),

    async execute(interaction) {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (target.id === interaction.user.id) {
        return interaction.reply({ content: '✦ you can\'t gift yourself, bestie 🌸', ephemeral: true });
      }
      if (target.bot) {
        return interaction.reply({ content: '✦ rosie doesn\'t need your coins 🌸', ephemeral: true });
      }

      const result = coins.spendCoins(interaction.user.id, interaction.guildId, amount);
      if (!result.success) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.lilac)
          .setDescription(`✦ not enough coins\nyou have **${fmt(result.has)} 💎** but tried to give **${fmt(amount)} 💎**`)
          .setFooter(footer());
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      coins.awardEventCoins(target.id, interaction.guildId, amount, `gift_from_${interaction.user.id}`);
      db.ensureMember(target.id, interaction.guildId);

      const senderBal = coins.getMember(interaction.user.id, interaction.guildId).gleam_coins;
      const targetBal = coins.getMember(target.id, interaction.guildId).gleam_coins;

      const embed = new EmbedBuilder()
        .setColor(config.colors.blush)
        .setDescription(
          `🎀  **${interaction.user.username}** gifted **${target.username}**\n\n` +
          `💎  **${fmt(amount)} gleam coins** sent ✨\n\n` +
          `${interaction.user.username}: ${fmt(senderBal)} coins remaining\n` +
          `${target.username}: ${fmt(targetBal)} coins total`
        )
        .setFooter(footer());

      await interaction.reply({ embeds: [embed] });
    },
  },

  // ────────────────────────────────────────
  // /coinsgive  (staff)
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('coinsgive')
      .setDescription('[STAFF] Give gleam coins to a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(interaction) {
      if (staffOnly(interaction)) return;
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'staff grant';
      const newBal = coins.staffAddCoins(interaction.user.id, target.id, interaction.guildId, amount, reason);

      const embed = new EmbedBuilder()
        .setColor(config.colors.green)
        .setDescription(`✦ gave **${fmt(amount)} 💎** to **${target.username}**\nnew balance: **${fmt(newBal)} coins**\nreason: *${reason}*`)
        .setFooter(footer());
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ────────────────────────────────────────
  // /coinsremove  (staff)
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('coinsremove')
      .setDescription('[STAFF] Remove gleam coins from a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(interaction) {
      if (staffOnly(interaction)) return;
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'staff deduct';
      const newBal = coins.staffRemoveCoins(interaction.user.id, target.id, interaction.guildId, amount, reason);

      const embed = new EmbedBuilder()
        .setColor(config.colors.red)
        .setDescription(`✦ removed **${fmt(amount)} 💎** from **${target.username}**\nnew balance: **${fmt(newBal)} coins**\nreason: *${reason}*`)
        .setFooter(footer());
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ────────────────────────────────────────
  // /synclevels  (staff)
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('synclevels')
      .setDescription('[STAFF] Re-sync a member\'s level role')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),

    async execute(interaction) {
      if (staffOnly(interaction)) return;
      await interaction.deferReply({ ephemeral: true });
      const target = interaction.options.getUser('user');
      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!guildMember) return interaction.editReply({ content: '✦ member not found 🌸' });
      await levels.syncLevelRole(guildMember, interaction.guild);
      await interaction.editReply({ content: `✦ synced level role for **${target.username}** ✓` });
    },
  },

  // ────────────────────────────────────────
  // /announce  (staff)
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('announce')
      .setDescription('[STAFF] Post a Rosie announcement in the announcements channel')
      .addStringOption(o => o.setName('message').setDescription('Announcement text').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Title (optional)').setRequired(false)),

    async execute(interaction) {
      if (staffOnly(interaction)) return;

      const msg = interaction.options.getString('message');
      const title = interaction.options.getString('title') || null;
      const channelId = process.env.CHANNEL_ANNOUNCEMENTS;

      if (!channelId) {
        return interaction.reply({ content: '✦ CHANNEL_ANNOUNCEMENTS not set in env 🌸', ephemeral: true });
      }

      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) return interaction.reply({ content: '✦ announcements channel not found', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setDescription(`${config.div}\n\n${msg}\n\n${config.div}`)
        .setFooter({ text: '✦ chosen baddies · rosie' });

      if (title) embed.setTitle(title);

      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✦ announcement posted in ${channel} ✓`, ephemeral: true });
    },
  },

  // ────────────────────────────────────────
  // /serverinfo
  // ────────────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('serverinfo')
      .setDescription('Chosen Baddies server info and stats'),

    async execute(interaction) {
      const guild = interaction.guild;
      const members = guild.memberCount;
      const humans = guild.members.cache.filter(m => !m.user.bot).size;
      const bots = guild.members.cache.filter(m => m.user.bot).size;
      const channels = guild.channels.cache.size;
      const roles = guild.roles.cache.size;

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL() || undefined })
        .setThumbnail(guild.iconURL({ size: 256 }) || null)
        .setDescription(`${config.div}`)
        .addFields(
          { name: '🌸  members',  value: `${fmt(humans)} baddies\n${fmt(bots)} bots`, inline: true },
          { name: '📂  channels', value: `${fmt(channels)} total`,                     inline: true },
          { name: '🎀  roles',    value: `${fmt(roles)} total`,                        inline: true },
          { name: '✦  created',   value: `<t:${Math.floor(guild.createdTimestamp/1000)}:R>`, inline: true },
          { name: '👑  owner',    value: `<@${guild.ownerId}>`,                         inline: true },
        )
        .setFooter(footer());

      await interaction.reply({ embeds: [embed] });
    },
  },

];

module.exports = commands;
