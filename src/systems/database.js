const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        gleam_coins INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        daily_claimed INTEGER DEFAULT 0,
        daily_coins_today INTEGER DEFAULT 0,
        daily_reset_date TEXT DEFAULT '',
        last_message INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        mystery_box_last INTEGER DEFAULT 0,
        mystery_box_month TEXT DEFAULT '',
        intro_posted INTEGER DEFAULT 0,
        joined_at INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, guild_id)
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        cost INTEGER NOT NULL,
        purchased_at INTEGER DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::INTEGER,
        expires_at INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS xp_cooldowns (
        user_id TEXT PRIMARY KEY,
        last_xp INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS staff_log (
        id SERIAL PRIMARY KEY,
        staff_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        action TEXT NOT NULL,
        amount INTEGER DEFAULT 0,
        reason TEXT DEFAULT '',
        logged_at INTEGER DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_members_guild ON members(guild_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_active ON purchases(active, expires_at);
    `);
    console.log('✓ Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

initializeDatabase();

// Helper function to run queries
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,
  pool,

  async getMember(userId, guildId) {
    const result = await query(
      'SELECT * FROM members WHERE user_id = $1 AND guild_id = $2',
      [userId, guildId]
    );
    return result.rows[0];
  },

  async upsertMember(userId, guildId) {
    const joinedAt = Math.floor(Date.now() / 1000);
    await query(
      `INSERT INTO members (user_id, guild_id, gleam_coins, xp, level, joined_at)
       VALUES ($1, $2, 0, 0, 0, $3)
       ON CONFLICT (user_id, guild_id) DO NOTHING`,
      [userId, guildId, joinedAt]
    );
  },

  async addCoins(amount, userId, guildId) {
    await query(
      `UPDATE members 
       SET gleam_coins = gleam_coins + $1,
           total_earned = total_earned + $1
       WHERE user_id = $2 AND guild_id = $3`,
      [amount, userId, guildId]
    );
  },

  async removeCoins(amount, userId, guildId) {
    await query(
      `UPDATE members 
       SET gleam_coins = GREATEST(0, gleam_coins - $1)
       WHERE user_id = $2 AND guild_id = $3`,
      [amount, userId, guildId]
    );
  },

  async addXP(xpAmount, level, userId, guildId) {
    await query(
      'UPDATE members SET xp = xp + $1, level = $2 WHERE user_id = $3 AND guild_id = $4',
      [xpAmount, level, userId, guildId]
    );
  },

  async updateDaily(dailyClaimed, dailyCoinsToday, resetDate, userId, guildId) {
    await query(
      `UPDATE members 
       SET daily_claimed = $1, daily_coins_today = $2, daily_reset_date = $3
       WHERE user_id = $4 AND guild_id = $5`,
      [dailyClaimed, dailyCoinsToday, resetDate, userId, guildId]
    );
  },

  async updateChatCoins(amount, resetDate, userId, guildId) {
    await query(
      `UPDATE members 
       SET daily_coins_today = daily_coins_today + $1,
           daily_reset_date = $2
       WHERE user_id = $3 AND guild_id = $4`,
      [amount, resetDate, userId, guildId]
    );
  },

  async resetDailyChat(amount, resetDate, userId, guildId) {
    await query(
      `UPDATE members 
       SET daily_coins_today = $1, daily_reset_date = $2
       WHERE user_id = $3 AND guild_id = $4`,
      [amount, resetDate, userId, guildId]
    );
  },

  async updateLastMessage(timestamp, userId, guildId) {
    await query(
      'UPDATE members SET last_message = $1 WHERE user_id = $2 AND guild_id = $3',
      [timestamp, userId, guildId]
    );
  },

  async logXPCooldown(userId, lastXp) {
    await query(
      `INSERT INTO xp_cooldowns (user_id, last_xp) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET last_xp = excluded.last_xp`,
      [userId, lastXp]
    );
  },

  async getXPCooldown(userId) {
    const result = await query(
      'SELECT last_xp FROM xp_cooldowns WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  },

  async logPurchase(userId, itemId, cost, expiresAt) {
    await query(
      'INSERT INTO purchases (user_id, item_id, cost, expires_at) VALUES ($1, $2, $3, $4)',
      [userId, itemId, cost, expiresAt]
    );
  },

  async getActivePurchase(userId, itemId) {
    const result = await query(
      `SELECT * FROM purchases 
       WHERE user_id = $1 AND item_id = $2 AND active = 1 
       AND (expires_at = 0 OR expires_at > EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::INTEGER)
       ORDER BY purchased_at DESC LIMIT 1`,
      [userId, itemId]
    );
    return result.rows[0];
  },

  async expirePurchases() {
    await query(
      `UPDATE purchases SET active = 0 
       WHERE expires_at > 0 AND expires_at <= EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::INTEGER AND active = 1`
    );
  },

  async logStaffAction(staffId, targetId, action, amount, reason) {
    await query(
      'INSERT INTO staff_log (staff_id, target_id, action, amount, reason) VALUES ($1, $2, $3, $4, $5)',
      [staffId, targetId, action, amount, reason]
    );
  },

  async updateMysteryBox(timestamp, month, userId, guildId) {
    await query(
      'UPDATE members SET mystery_box_last = $1, mystery_box_month = $2 WHERE user_id = $3 AND guild_id = $4',
      [timestamp, month, userId, guildId]
    );
  },

  async updateIntroPosted(userId, guildId) {
    await query(
      'UPDATE members SET intro_posted = 1 WHERE user_id = $1 AND guild_id = $2',
      [userId, guildId]
    );
  },

  async getLeaderboard(guildId) {
    const result = await query(
      `SELECT user_id, gleam_coins, xp, level 
       FROM members WHERE guild_id = $1 
       ORDER BY gleam_coins DESC LIMIT 10`,
      [guildId]
    );
    return result.rows;
  },

  async ensureMember(userId, guildId) {
    await this.upsertMember(userId, guildId);
    return this.getMember(userId, guildId);
  },

  todayStr() {
    return new Date().toISOString().slice(0, 10);
  },

  monthStr() {
    return new Date().toISOString().slice(0, 7);
  }
};
