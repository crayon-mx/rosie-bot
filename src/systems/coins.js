const db = require('./database');
const config = require('./config');

// ═══════��══════════════════════════════════
// EARN COINS — All with caps & cooldowns
// ══════════════════════════════════════════

function awardChatCoins(userId, guildId) {
  const member = db.ensureMember(userId, guildId);
  const now = Math.floor(Date.now() / 1000);
  const today = db.todayStr();

  if (member.daily_reset_date !== today) {
    db.resetDailyChat.run(0, today, userId, guildId);
    member.daily_coins_today = 0;
  }

  if (now - member.last_message < config.coins.CHAT_COOLDOWN_SECONDS) {
    return { awarded: 0, reason: 'cooldown' };
  }

  if (member.daily_coins_today >= config.coins.CHAT_DAILY_CAP) {
    return { awarded: 0, reason: 'chat_cap' };
  }

  if (member.daily_coins_today >= config.coins.TOTAL_DAILY_CAP) {
    return { awarded: 0, reason: 'total_cap' };
  }

  const amount = config.coins.CHAT_PER_MESSAGE;
  db.addCoins.run(amount, amount, userId, guildId);
  db.updateChatCoins.run(amount, today, userId, guildId);
  db.updateLastMessage.run(now, userId, guildId);

  return { awarded: amount, reason: 'ok' };
}

function claimDaily(userId, guildId) {
  const member = db.ensureMember(userId, guildId);
  const now = Math.floor(Date.now() / 1000);
  const today = db.todayStr();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60;

  const timeSinceClaim = now - member.daily_claimed;
  if (member.daily_claimed > 0 && timeSinceClaim < TWENTY_FOUR_HOURS) {
    const nextClaim = member.daily_claimed + TWENTY_FOUR_HOURS;
    const hoursLeft = Math.ceil((nextClaim - now) / 3600);
    const minsLeft = Math.ceil(((nextClaim - now) % 3600) / 60);
    return { success: false, hoursLeft, minsLeft };
  }

  if (member.daily_reset_date !== today) {
    db.resetDailyChat.run(0, today, userId, guildId);
  }

  db.addCoins.run(config.coins.DAILY_AMOUNT, config.coins.DAILY_AMOUNT, userId, guildId);
  db.updateDaily.run(now, member.daily_coins_today, today, userId, guildId);

  const updated = db.getMember.get(userId, guildId);
  return {
    success: true,
    amount: config.coins.DAILY_AMOUNT,
    newBalance: updated.gleam_coins,
  };
}

function awardEventCoins(userId, guildId, amount, reason) {
  db.ensureMember(userId, guildId);
  db.addCoins.run(amount, amount, userId, guildId);
  return { awarded: amount, reason };
}

function giveWelcomeGift(userId, guildId) {
  db.ensureMember(userId, guildId);
  db.addCoins.run(config.coins.WELCOME_GIFT, config.coins.WELCOME_GIFT, userId, guildId);
  return config.coins.WELCOME_GIFT;
}

function claimIntroBonus(userId, guildId) {
  const member = db.ensureMember(userId, guildId);
  if (member.intro_posted === 1) {
    return { success: false, reason: 'already_claimed' };
  }
  db.addCoins.run(config.coins.INTRO_BONUS, config.coins.INTRO_BONUS, userId, guildId);
  db.updateIntroPosted.run(userId, guildId);
  return { success: true, amount: config.coins.INTRO_BONUS };
}

// ══════════════════════════════════════════
// SPEND COINS
// ══════════════════════════════════════════

function spendCoins(userId, guildId, amount) {
  const member = db.ensureMember(userId, guildId);

  if (member.gleam_coins < amount) {
    return {
      success: false,
      error: 'not_enough',
      has: member.gleam_coins,
      needs: amount,
      short: amount - member.gleam_coins,
    };
  }

  db.removeCoins.run(amount, userId, guildId);
  const updated = db.getMember.get(userId, guildId);
  return { success: true, newBalance: updated.gleam_coins };
}

// ══════════════════════════════════════════
// GETTERS
// ══════════════════════════════════════════

function getMember(userId, guildId) {
  return db.ensureMember(userId, guildId);
}

function getBalance(userId, guildId) {
  const member = db.ensureMember(userId, guildId);
  return member.gleam_coins;
}

function getLeaderboard(guildId) {
  return db.getLeaderboard.all(guildId);
}

// ══════════════════════════════════════════
// STAFF TOOLS
// ══════════════════════════════════════════

function staffAddCoins(staffId, targetId, guildId, amount, reason) {
  if (amount < 1) return 0;
  db.ensureMember(targetId, guildId);
  db.addCoins.run(amount, amount, targetId, guildId);
  db.logStaffAction.run(staffId, targetId, 'add_coins', amount, reason || 'staff grant');
  return db.getMember.get(targetId, guildId).gleam_coins;
}

function staffRemoveCoins(staffId, targetId, guildId, amount, reason) {
  if (amount < 1) return 0;
  db.ensureMember(targetId, guildId);
  db.removeCoins.run(amount, targetId, guildId);
  db.logStaffAction.run(staffId, targetId, 'remove_coins', amount, reason || 'staff deduct');
  return db.getMember.get(targetId, guildId).gleam_coins;
}

module.exports = {
  awardChatCoins,
  claimDaily,
  awardEventCoins,
  giveWelcomeGift,
  claimIntroBonus,
  spendCoins,
  getMember,
  getBalance,
  getLeaderboard,
  staffAddCoins,
  staffRemoveCoins,
};