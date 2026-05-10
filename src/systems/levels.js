const db = require('./database');
const config = require('./config');
const { awardEventCoins } = require('./coins');
const { EmbedBuilder } = require('discord.js');

const XP_MIN = 15;
const XP_MAX = 25;
const XP_COOLDOWN = 60;

function randomXP() {
  return Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
}

function xpForLevel(level) {
  return Math.floor((5 / 6) * level * (2 * level * level + 27 * level + 91));
}

function getLevelFromXP(xp) {
  let level = 0;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

function xpToNextLevel(xp) {
  const currentLevel = getLevelFromXP(xp);
  return xpForLevel(currentLevel + 1) - xp;
}

async function awardMessageXP(member, guild, client) {
  const userId = member.id;
  const guildId = guild.id;
  const now = Math.floor(Date.now() / 1000);

  const cooldown = db.getXPCooldown.get(userId);
  if (cooldown && (now - cooldown.last_xp) < XP_COOLDOWN) {
    return { xpAwarded: 0, leveledUp: false };
  }

  const dbMember = db.ensureMember(userId, guildId);
  const xpGain = randomXP();
  const oldXP = dbMember.xp;
  const newXP = oldXP + xpGain;
  const oldLevel = getLevelFromXP(oldXP);
  const newLevel = getLevelFromXP(newXP);

  db.addXP.run(xpGain, newLevel, userId, guildId);
  db.logXPCooldown.run(userId, now, now);

  let leveledUp = false;
  let levelConfig = null;

  if (newLevel > oldLevel) {
    leveledUp = true;
    levelConfig = config.levels.find(l => l.level === newLevel);

    if (levelConfig) {
      await handleLevelMilestone(userId, guildId, newLevel, levelConfig, member, guild, client);
    }
  }

  return { xpAwarded: xpGain, leveledUp, newLevel, oldLevel, levelConfig };
}

async function handleLevelMilestone(userId, guildId, level, levelConfig, discordMember, guild, client) {
  if (levelConfig.coinBonus > 0) {
    awardEventCoins(userId, guildId, levelConfig.coinBonus, `level_${level}_milestone`);
  }

  try {
    const newRoleId = process.env[levelConfig.roleEnv];
    if (newRoleId) {
      const newRole = guild.roles.cache.get(newRoleId);
      if (newRole && discordMember) {
        const levelRoleIds = config.levels
          .map(l => process.env[l.roleEnv])
          .filter(Boolean);

        for (const roleId of levelRoleIds) {
          if (roleId !== newRoleId && discordMember.roles.cache.has(roleId)) {
            await discordMember.roles.remove(roleId).catch(() => {});
          }
        }

        await discordMember.roles.add(newRole).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`Error assigning level role:`, err.message);
  }

  if (levelConfig.announcement && levelConfig.announcementText) {
    const channelId = process.env.CHANNEL_ANNOUNCEMENTS;
    if (channelId) {
      const channel = client.channels.cache.get(channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.pink)
          .setDescription(levelConfig.announcementText(`<@${userId}`))
          .setFooter({ text: '✦ chosen baddies · level milestone' });

        if (level === 60) {
          embed.setTitle('⭐ CHOSEN BADDIE ⭐');
        }

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }

  if (discordMember) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.pink)
      .setTitle(`✦ level ${level}`)
      .setDescription(
        `you\'re now **${levelConfig.roleName}** 🌸\n\n` +
        (levelConfig.coinBonus > 0 ? `you earned **${levelConfig.coinBonus} gleam coins** ✨` : '')
      )
      .setFooter({ text: 'chosen baddies' });

    discordMember.send({ embeds: [embed] }).catch(() => {});
  }
}

function getLevelInfo(userId, guildId) {
  const member = db.ensureMember(userId, guildId);
  const level = getLevelFromXP(member.xp);
  const toNext = xpToNextLevel(member.xp);
  const progress = member.xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  const levelConf = config.levels.filter(l => l.level <= level).pop();

  return {
    xp: member.xp,
    level,
    toNext,
    progress,
    needed,
    percent: Math.floor((progress / needed) * 100),
    roleName: levelConf?.roleName || 'baby baddie ♡',
    nextMilestone: config.levels.find(l => l.level > level) || null,
  };
}

async function syncLevelRole(discordMember, guild) {
  const member = db.ensureMember(discordMember.id, guild.id);
  const level = getLevelFromXP(member.xp);

  const reached = config.levels.filter(l => l.level <= level);
  if (reached.length === 0) return;

  const highest = reached[reached.length - 1];
  const correctRoleId = process.env[highest.roleEnv];

  const levelRoleIds = config.levels
    .map(l => process.env[l.roleEnv])
    .filter(Boolean);

  for (const roleId of levelRoleIds) {
    if (roleId === correctRoleId) {
      if (!discordMember.roles.cache.has(roleId)) {
        const role = guild.roles.cache.get(roleId);
        if (role) await discordMember.roles.add(role).catch(() => {});
      }
    } else {
      if (discordMember.roles.cache.has(roleId)) {
        await discordMember.roles.remove(roleId).catch(() => {});
      }
    }
  }
}

module.exports = {
  awardMessageXP,
  handleLevelMilestone,
  getLevelInfo,
  getLevelFromXP,
  xpForLevel,
  xpToNextLevel,
  syncLevelRole,
};