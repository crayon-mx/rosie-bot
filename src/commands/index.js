const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const coins = require('../systems/coins');
const levels = require('../systems/levels');
const shop = require('../systems/shop');
const config = require('../systems/config');
const db = require('../systems/database');

// ══════════════════════════════════════════
// STAFF CHECK
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
    interaction.reply({
      content: '✦ staff only',
      ephemeral: true,
    });
    return true;
  }
  return false;
}

// ══════════════════════════════════════════
// COMMANDS
// ══════════════════════════════════════════

const commands = [

  // ── /balance ──────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('balance')
      .setDescription('Check your coins & level')
      .addUserOption(o => o.setName('user').setDescription('Check another member').setRequired(false)),

    async execute(interaction) {
      const target = interaction.options.getUser('user') || interaction.user;
      const member = coins.getMember(target.id, interaction.guildId);
      const levelInfo = levels.getLevelInfo(target.id, interaction.guildId);

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setTitle(`💎 gleam coins`)
        .setDescription(
          `**${target.username}**\n\n` +
          `balance · **${member.gleam_coins.toLocaleString()} 💎**\n` +
          `lifetime · **${member.total_earned.toLocaleString()} 💎**\n\n` +
          `level · **${levelInfo.level}** · *${levelInfo.roleName}*\n` +
          `xp · **${levelInfo.xp.toLocaleString()}** · ${levelInfo.toNext} to next`
        )
        .setFooter({ text: '✦ chosen baddies' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ── /daily ────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('daily')
      .setDescription('Claim 80 coins once per 24 hours'),

    async execute(interaction) {
      const result = coins.claimDaily(interaction.user.id, interaction.guildId);

      if (!result.success) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.lilac)
          .setDescription(
            `✦ you already claimed today\n\n` +
            `come back in **${result.hoursLeft}h ${result.minsLeft}m** ♡`
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setTitle('💎 daily claimed')
        .setDescription(
          `**+${result.amount} gleam coins** ✨\n\n` +
          `new balance · **${result.newBalance.toLocaleString()} 💎**\n\n` +
          `*come back in 24 hours*`
        )
        .setFooter({ text: '✦ chosen baddies' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ── /level ────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('level')
      .setDescription('Check your level & progress')
      .addUserOption(o => o.setName('user').setDescription('Check another member').setRequired(false)),

    async execute(interaction) {
      const target = interaction.options.getUser('user') || interaction.user;
      const info = levels.getLevelInfo(target.id, interaction.guildId);

      const barLength = 20;
      const filled = Math.floor((info.percent / 100) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

      const nextMilestone = info.nextMilestone
        ? `\nnext · **${info.nextMilestone.roleName}** at level ${info.nextMilestone.level}`
        : '\n✦ *maximum level reached* ⭐';

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setTitle(`✨ level`)
        .setDescription(
          `**${target.username}**\n\n` +
          `role · **${info.roleName}**\n` +
          `level · **${info.level}**\n` +
          `xp · **${info.xp.toLocaleString()}**\n\n` +
          `progress to level ${info.level + 1}\n` +
          `\`${bar}\` ${info.percent}%\n` +
          `*${info.toNext} xp needed*` +
          nextMilestone
        )
        .setFooter({ text: '✦ chosen baddies' });

      await interaction.reply({ embeds: [embed], ephemeral: false });
    },
  },

  // ── /shop ─────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Browse the shop'),

    async execute(interaction) {
      const embed = shop.buildShopEmbed(interaction.user.id, interaction.guildId);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ── /buy ──────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('buy')
      .setDescription('Purchase an item')
      .addStringOption(o =>
        o.setName('item')
          .setDescription('Item ID')
          .setRequired(true)
          .addChoices(
            ...config.shop.map(i => ({ name: i.name, value: i.id }))
          )
      ),

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
        const errors = {
          item_not_found: '✦ item not found',
          not_enough: `✦ not enough coins\nyou have **${result.has} 💎** but need **${result.needs} 💎**`,
          level_required: `✦ need level **${result.required}** (you're level ${result.current})`,
          mystery_cooldown: `✦ mystery box recharging\ncome back in **${result.hoursLeft}h**`,
        };

        const embed = new EmbedBuilder()
          .setColor(config.colors.lilac)
          .setDescription(errors[result.error] || '✦ something went wrong');

        return interaction.editReply({ embeds: [embed] });
      }

      // Success
      let desc = `✨ **${result.item.name}** purchased\n\n` +
                 `balance · **${result.newBalance.toLocaleString()} 💎**`;

      if (result.requiresTicket) {
        desc += '\n\n📩 open a ticket in #tickets to claim';
      }

      if (result.mysteryResult) {
        desc += `\n\n🎁 mystery result: ${result.mysteryResult.label}`;
        if (result.mysteryResult.type === 'coins') {
          desc += ' *(auto added)*';
        } else {
          desc += '\n📩 open a ticket to claim';
        }
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setTitle('🛍 purchase successful')
        .setDescription(desc)
        .setFooter({ text: '✦ all sales final' });

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // ── /leaderboard ──────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('Top 10 coin holders'),

    async execute(interaction) {
      const top = coins.getLeaderboard(interaction.guildId);

      const lines = await Promise.all(
        top.map(async (row, i) => {
          const user = await interaction.client.users.fetch(row.user_id).catch(() => null);
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          const name = user ? user.username : 'unknown';
          return `${medal} **${name}** · ${row.gleam_coins.toLocaleString()} 💎`;
        })
      );

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('💎 top baddies')
        .setDescription(lines.join('\n') || 'no members yet')
        .setFooter({ text: '✦ chosen baddies' });

      await interaction.reply({ embeds: [embed] });
    },
  },

  // ── /intro ────────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('intro')
      .setDescription('Claim one-time intro bonus (25 coins)'),

    async execute(interaction) {
      const result = coins.claimIntroBonus(interaction.user.id, interaction.guildId);

      if (!result.success) {
        return interaction.reply({
          content: '✦ you already claimed your intro bonus',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.pink)
        .setDescription(`✨ intro bonus claimed\n**+${result.amount} gleam coins** ♡\n\nwelcome 🌸`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

  // ── /coinsgive (STAFF) ────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('coinsgive')
      .setDescription('[STAFF] Give coins to a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(interaction) {
      if (staffOnly(interaction)) return;

      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'staff grant';

      const newBal = coins.staffAddCoins(
        interaction.user.id, target.id, interaction.guildId, amount, reason
      );

      await interaction.reply({
        content: `✦ added **${amount} 💎** to ${target.username}\nnew balance: **${newBal} 💎**`,
        ephemeral: true,
      });
    },
  },

  // ── /coinsremove (STAFF) ──────────────────
  {
    data: new SlashCommandBuilder()
      .setName('coinsremove')
      .setDescription('[STAFF] Remove coins from a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(interaction) {
      if (staffOnly(interaction)) return;

      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'staff deduct';

      const newBal = coins.staffRemoveCoins(
        interaction.user.id, target.id, interaction.guildId, amount, reason
      );

      await interaction.reply({
        content: `✦ removed **${amount} 💎** from ${target.username}\nnew balance: **${newBal} 💎**`,
        ephemeral: true,
      });
    },
  },

  // ── /synclevels (STAFF) ───────────────────
  {
    data: new SlashCommandBuilder()
      .setName('synclevels')
      .setDescription('[STAFF] Sync a member\'s level role')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)),

    async execute(interaction) {
      if (staffOnly(interaction)) return;
      await interaction.deferReply({ ephemeral: true });

      const target = interaction.options.getUser('user');
      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

      if (!guildMember) {
        return interaction.editReply({ content: '✦ member not found' });
      }

      await levels.syncLevelRole(guildMember, interaction.guild);
      await interaction.editReply({ content: `✦ synced level role for **${target.username}**` });
    },
  },

];

module.exports = commands;
