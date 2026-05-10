const db = require('./database');
const config = require('./config');
const { spendCoins, awardEventCoins } = require('./coins');
const { getLevelFromXP } = require('./levels');
const { EmbedBuilder } = require('discord.js');

/**
 * Get full shop listing
 */
function getShopListing(userId, guildId) {
  const member = db.ensureMember(userId, guildId);
  const level = getLevelFromXP(member.xp);

  return {
    items: config.shop.map(item => ({
      ...item,
      canAfford: member.gleam_coins >= item.cost,
      meetsLevel: level >= (item.minLevel || 0),
      available: !item.limited,
    })),
    balance: member.gleam_coins,
    level,
  };
}

/**
 * Purchase item — FULL VALIDATION
 * Checks:
 * - Item exists
 * - Level requirement met
 * - Balance sufficient
 * - Cooldown not active (mystery box)
 * - Only then spends coins
 */
async function purchaseItem(userId, guildId, itemId, discordMember, guild, client) {
  const item = config.shop.find(i => i.id === itemId);
  if (!item) return { success: false, error: 'item_not_found' };

  const member = db.ensureMember(userId, guildId);
  const level = getLevelFromXP(member.xp);

  // Level check
  if (level < (item.minLevel || 0)) {
    return {
      success: false,
      error: 'level_required',
      required: item.minLevel,
      current: level,
    };
  }

  // Mystery box cooldown check
  if (item.hasCooldown) {
    const now = Math.floor(Date.now() / 1000);
    const cooldownSeconds = config.coins.MYSTERY_BOX_COOLDOWN_HOURS * 3600;
    const timeSince = now - member.mystery_box_last;

    if (member.mystery_box_last > 0 && timeSince < cooldownSeconds) {
      const hoursLeft = Math.ceil((cooldownSeconds - timeSince) / 3600);
      return { success: false, error: 'mystery_cooldown', hoursLeft };
    }
  }

  // Balance check and spend
  const spend = spendCoins(userId, guildId, item.cost);
  if (!spend.success) {
    return {
      success: false,
      error: 'not_enough',
      has: spend.has,
      needs: spend.needs,
      short: spend.short,
    };
  }

  // Log purchase
  const expiresAt = item.duration > 0
    ? Math.floor(Date.now() / 1000) + item.duration
    : 0;
  db.logPurchase.run(userId, itemId, item.cost, expiresAt);

  // Handle mystery box
  if (itemId === 'mystery_box') {
    const now = Math.floor(Date.now() / 1000);
    db.updateMysteryBox.run(now, db.monthStr(), userId, guildId);

    const result = rollMysteryBox(userId, guildId, discordMember, guild, client);
    return { success: true, item, newBalance: spend.newBalance, mysteryResult: result };
  }

  return {
    success: true,
    item,
    newBalance: spend.newBalance,
    requiresTicket: item.requiresTicket,
    expiresAt,
  };
}

/**
 * Mystery box roll — weighted random
 */
function rollMysteryBox(userId, guildId, discordMember, guild, client) {
  const outcomes = config.mysteryBoxOutcomes;
  const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;

  let chosen = outcomes[outcomes.length - 1];
  for (const outcome of outcomes) {
    roll -= outcome.weight;
    if (roll <= 0) {
      chosen = outcome;
      break;
    }
  }

  // Apply outcome
  if (chosen.type === 'coins') {
    awardEventCoins(userId, guildId, chosen.amount, 'mystery_box');
  }

  return chosen;
}

/**
 * Expire timed purchases
 * Called every 10 minutes by main bot
 */
function expireTimedPurchases() {
  db.expirePurchases.run();
}

/**
 * Check if member has active purchase
 */
function hasActivePurchase(userId, itemId) {
  const purchase = db.getActivePurchase.get(userId, itemId);
  return !!purchase;
}

/**
 * Build shop embed for display
 */
function buildShopEmbed(userId, guildId) {
  const { items, balance, level } = getShopListing(userId, guildId);

  const cosmetic = items.filter(i => ['custom_color','rosie_shoutout','aesthetic_icon','nickname_restyle','monthly_badge','mystery_box','hall_of_fame'].includes(i.id));
  const functional = items.filter(i => ['emoji_pack','slowmode_bypass','event_early_access'].includes(i.id));

  const formatItem = (item) => {
    const afford = item.canAfford ? '' : ' *(can\'t afford)*';
    const levelReq = !item.meetsLevel ? ` *(need lvl ${item.minLevel})*` : '';
    const ticket = item.requiresTicket ? ' `ticket`' : '';
    const duration = item.duration > 0 ? ` · *${Math.round(item.duration/3600)}h*` : '';
    return `${item.name} · **${item.cost.toLocaleString()} 💎**${duration}${afford}${levelReq}${ticket}\n↳ *${item.description}*`;
  };

  const embed = new EmbedBuilder()
    .setColor(0xf9b8cb)
    .setTitle('🛍 chosen shop')
    .setDescription(
      `balance: **${balance.toLocaleString()} 💎**\n` +
      `level: **${level}**\n\n` +
      `use \`/buy <item>\` · all sales final`
    )
    .addFields(
      {
        name: '✨ cosmetic',
        value: cosmetic.map(formatItem).join('\n\n') || 'none',
      },
      {
        name: '⚡ functional',
        value: functional.map(formatItem).join('\n\n') || 'none',
      }
    )
    .setFooter({ text: '✦ chosen shop' });

  return embed;
}

module.exports = {
  getShopListing,
  purchaseItem,
  expireTimedPurchases,
  hasActivePurchase,
  buildShopEmbed,
  rollMysteryBox,
};
