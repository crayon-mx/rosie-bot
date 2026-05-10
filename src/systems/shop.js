// src/systems/shop.js
// Handles all shop purchases, mystery box, validation

const db = require('./database');
const config = require('./config');
const { spendCoins, awardEventCoins } = require('./coins');
const { getLevelFromXP } = require('./levels');
const { EmbedBuilder } = require('discord.js');

/**
 * Get full shop listing with member's current balance and level
 */
function getShopListing(userId, guildId) {
  const member = db.ensureMember(userId, guildId);
  const level = getLevelFromXP(member.xp);

  return {
    items: config.shop.map(item => ({
      ...item,
      canAfford: member.gleam_coins >= item.cost,
      meetsLevel: level >= (item.minLevel || 0),
      available: !item.limited, // staff sets limited items unavailable
    })),
    balance: member.gleam_coins,
    level,
  };
}

/**
 * Purchase an item from the shop
 * Returns { success, error, item, newBalance, requiresTicket, mysteryResult }
 */
async function purchaseItem(userId, guildId, itemId, discordMember, guild, client) {
  const item = config.shop.find(i => i.id === itemId);
  if (!item) return { success: false, error: 'item_not_found' };

  const member = db.ensureMember(userId, guildId);
  const level = getLevelFromXP(member.xp);

  // Level requirement check
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

  // Log the purchase
  const expiresAt = item.duration > 0
    ? Math.floor(Date.now() / 1000) + item.duration
    : 0;
  db.logPurchase.run(userId, itemId, item.cost, expiresAt);

  // Handle mystery box specially
  if (itemId === 'mystery_box') {
    const now = Math.floor(Date.now() / 1000);
    db.updateMysteryBox.run(now, db.monthStr(), userId, guildId);

    const result = rollMysteryBox(userId, guildId, discordMember, guild, client);
    return { success: true, item, newBalance: spend.newBalance, mysteryResult: result };
  }

  // Handle timed items (aesthetic_icon, slowmode_bypass, event_early_access)
  if (item.duration > 0 && discordMember && guild) {
    // These are handled by staff or scheduled expiry
    // We log the purchase with expiry — scheduler checks these
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

  // Apply the outcome
  if (chosen.type === 'coins') {
    awardEventCoins(userId, guildId, chosen.amount, 'mystery_box');
  }

  // Role outcomes and shoutouts are flagged for staff to apply via ticket system
  // since they require Discord permission operations

  return chosen;
}

/**
 * Check and expire timed purchases
 * Called by the scheduled task every 10 minutes
 */
function expireTimedPurchases() {
  db.expirePurchases.run();
}

/**
 * Check if a member has an active purchase of a specific item
 */
function hasActivePurchase(userId, itemId) {
  const purchase = db.getActivePurchase.get(userId, itemId);
  return !!purchase;
}

/**
 * Build the shop embed for display
 */
function buildShopEmbed(userId, guildId) {
  const { items, balance, level } = getShopListing(userId, guildId);
  const cosmetic   = items.filter(i => i.category === "cosmetic");
  const functional = items.filter(i => i.category === "functional");

  const formatItem = (item) => {
    const status   = !item.meetsLevel ? "*(level req)*" : !item.canAfford ? "*(not enough coins)*" : "";
    const dur      = item.duration > 0 ? " · " + Math.round(item.duration/3600) + "h" : "";
    const tkt      = item.requiresTicket ? " · ticket" : "";
    const lk       = (!item.meetsLevel || item.limited) ? " 🔒" : "";
    return item.name + lk + " · **" + item.cost.toLocaleString() + " 💎**" + dur + tkt + " " + status + "\n↳ *" + item.description + "*";
  };

  const embed = new EmbedBuilder()
    .setColor(config.colors.blush)
    .setAuthor({ name: "🛍  chosen shop" })
    .setDescription(
      "💎  **" + balance.toLocaleString() + " gleam coins** · level **" + level + "**\n" +
      "use /buy to purchase · all sales final\n" +
      "· ─────────────────── ·"
    )
    .addFields(
      { name: "✨  cosmetic",   value: cosmetic.map(formatItem).join("\n\n")   || "none available", inline: false },
      { name: "⚡  functional", value: functional.map(formatItem).join("\n\n") || "none available", inline: false }
    )
    .setFooter({ text: "✦ chosen baddies · rosie · no refunds" });

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
