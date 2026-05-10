// src/systems/database.js
// All data stored in SQLite — fast, local, zero cost, no external service needed

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'rosie.db'));

// Enable WAL mode for better performance and concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ══════════════════════════════════════════
// TABLE CREATION
// ══════════════════════════════════════════


// ══════════════════════════════════════════
// MIGRATIONS — safely add new columns
// ══════════════════════════════════════════
try { db.exec('ALTER TABLE members ADD COLUMN last_work INTEGER DEFAULT 0'); } catch(e) {}

db.exec(`
  -- Members table: all user data in one place
  CREATE TABLE IF NOT EXISTS members (
    user_id       TEXT PRIMARY KEY,
    guild_id      TEXT NOT NULL,
    gleam_coins   INTEGER DEFAULT 0,
    xp            INTEGER DEFAULT 0,
    level         INTEGER DEFAULT 0,
    daily_claimed INTEGER DEFAULT 0,       -- Unix timestamp of last /daily claim
    daily_coins_today INTEGER DEFAULT 0,   -- Chat coins earned today (resets midnight)
    daily_reset_date TEXT DEFAULT '',      -- Date string YYYY-MM-DD for daily cap reset
    last_message  INTEGER DEFAULT 0,       -- Unix timestamp of last coin-earning message
    total_earned  INTEGER DEFAULT 0,       -- Lifetime coins earned (never decreases)
    mystery_box_last INTEGER DEFAULT 0,    -- Unix timestamp of last mystery box use
    mystery_box_month TEXT DEFAULT '',     -- Month string for free monthly box tracking
    intro_posted  INTEGER DEFAULT 0,       -- 1 if they've claimed intro bonus
    joined_at     INTEGER DEFAULT 0,       -- Unix timestamp of server join
    created_at    INTEGER DEFAULT (unixepoch())
  );

  -- Shop purchases log — every transaction recorded forever
  CREATE TABLE IF NOT EXISTS purchases (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    item_id     TEXT NOT NULL,
    cost        INTEGER NOT NULL,
    purchased_at INTEGER DEFAULT (unixepoch()),
    expires_at  INTEGER DEFAULT 0,         -- 0 means never expires
    active      INTEGER DEFAULT 1          -- 0 = expired/used
  );

  -- XP cooldown tracking — anti-spam
  CREATE TABLE IF NOT EXISTS xp_cooldowns (
    user_id     TEXT PRIMARY KEY,
    last_xp     INTEGER DEFAULT 0
  );

  -- Booster tracking
  CREATE TABLE IF NOT EXISTS boosters (
    user_id           TEXT PRIMARY KEY,
    boosted_at        INTEGER DEFAULT (unixepoch()),
    last_monthly_pay  TEXT DEFAULT '',     -- Month string YYYY-MM for anniversary coins
    mystery_box_month TEXT DEFAULT ''      -- Month string for free monthly box
  );

  -- Staff action log — every coin grant/deduct by staff logged
  CREATE TABLE IF NOT EXISTS staff_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id    TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    action      TEXT NOT NULL,
    amount      INTEGER DEFAULT 0,
    reason      TEXT DEFAULT '',
    logged_at   INTEGER DEFAULT (unixepoch())
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_members_guild ON members(guild_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_active ON purchases(active);
`);

// ══════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════

const getMember = db.prepare(`
  SELECT * FROM members WHERE user_id = ? AND guild_id = ?
`);

const upsertMember = db.prepare(`
  INSERT INTO members (user_id, guild_id, gleam_coins, xp, level, joined_at)
  VALUES (?, ?, 0, 0, 0, ?)
  ON CONFLICT(user_id) DO NOTHING
`);

const addCoins = db.prepare(`
  UPDATE members 
  SET gleam_coins = gleam_coins + ?,
      total_earned = total_earned + ?
  WHERE user_id = ? AND guild_id = ?
`);

const removeCoins = db.prepare(`
  UPDATE members 
  SET gleam_coins = MAX(0, gleam_coins - ?)
  WHERE user_id = ? AND guild_id = ?
`);

const setCoins = db.prepare(`
  UPDATE members SET gleam_coins = ? WHERE user_id = ? AND guild_id = ?
`);

const addXP = db.prepare(`
  UPDATE members SET xp = xp + ?, level = ? WHERE user_id = ? AND guild_id = ?
`);

const updateDaily = db.prepare(`
  UPDATE members 
  SET daily_claimed = ?, daily_coins_today = ?, daily_reset_date = ?
  WHERE user_id = ? AND guild_id = ?
`);

const updateChatCoins = db.prepare(`
  UPDATE members 
  SET daily_coins_today = daily_coins_today + ?,
      daily_reset_date = ?
  WHERE user_id = ? AND guild_id = ?
`);

const resetDailyChat = db.prepare(`
  UPDATE members 
  SET daily_coins_today = ?, daily_reset_date = ?
  WHERE user_id = ? AND guild_id = ?
`);

const updateLastMessage = db.prepare(`
  UPDATE members SET last_message = ? WHERE user_id = ? AND guild_id = ?
`);

const logXPCooldown = db.prepare(`
  INSERT INTO xp_cooldowns (user_id, last_xp) VALUES (?, ?)
  ON CONFLICT(user_id) DO UPDATE SET last_xp = ?
`);

const getXPCooldown = db.prepare(`SELECT last_xp FROM xp_cooldowns WHERE user_id = ?`);

const logPurchase = db.prepare(`
  INSERT INTO purchases (user_id, item_id, cost, expires_at)
  VALUES (?, ?, ?, ?)
`);

const getActivePurchase = db.prepare(`
  SELECT * FROM purchases 
  WHERE user_id = ? AND item_id = ? AND active = 1 
  AND (expires_at = 0 OR expires_at > unixepoch())
  ORDER BY purchased_at DESC LIMIT 1
`);

const expirePurchases = db.prepare(`
  UPDATE purchases SET active = 0 
  WHERE expires_at > 0 AND expires_at <= unixepoch() AND active = 1
`);

const logStaffAction = db.prepare(`
  INSERT INTO staff_log (staff_id, target_id, action, amount, reason)
  VALUES (?, ?, ?, ?, ?)
`);

const updateMysteryBox = db.prepare(`
  UPDATE members SET mystery_box_last = ?, mystery_box_month = ? 
  WHERE user_id = ? AND guild_id = ?
`);

const updateIntroPosted = db.prepare(`
  UPDATE members SET intro_posted = 1 WHERE user_id = ? AND guild_id = ?
`);

const getLeaderboard = db.prepare(`
  SELECT user_id, gleam_coins, xp, level 
  FROM members WHERE guild_id = ? 
  ORDER BY gleam_coins DESC LIMIT 10
`);

const getXPLeaderboard = db.prepare(`
  SELECT user_id, gleam_coins, xp, level 
  FROM members WHERE guild_id = ? 
  ORDER BY xp DESC LIMIT 10
`);

// ══════════════════════════════════════════
// EXPORTED API
// ══════════════════════════════════════════

module.exports = {
  db,
  getMember,
  upsertMember,
  addCoins,
  removeCoins,
  setCoins,
  addXP,
  updateDaily,
  updateChatCoins,
  resetDailyChat,
  updateLastMessage,
  logXPCooldown,
  getXPCooldown,
  logPurchase,
  getActivePurchase,
  expirePurchases,
  logStaffAction,
  updateMysteryBox,
  updateIntroPosted,
  getLeaderboard,
  getXPLeaderboard,

  // Ensure member exists before any operation
  ensureMember(userId, guildId) {
    upsertMember.run(userId, guildId, Math.floor(Date.now() / 1000));
    return getMember.get(userId, guildId);
  },

  // Today's date string YYYY-MM-DD
  todayStr() {
    return new Date().toISOString().slice(0, 10);
  },

  // Current month string YYYY-MM
  monthStr() {
    return new Date().toISOString().slice(0, 7);
  }
};
