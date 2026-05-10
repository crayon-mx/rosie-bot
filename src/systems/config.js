// src/systems/config.js

module.exports = {

  rosie: {
    name: 'Rosie',
    footer: '✦ chosen baddies',
    tagline: 'aesthetic social · egirl culture · pairing',
  },

  colors: {
    pink:   0xe8547a,
    lilac:  0xc9a7e8,
    gold:   0xffd700,
    blush:  0xf9b8cb,
    dark:   0x1a1120,
    green:  0x6dc892,
    red:    0xff6b6b,
    soft:   0xfef0f5,
  },

  // Decorative elements for embeds
  div:   '· ─────────────────── ·',
  sdiv:  '· ──────── ·',

  coins: {
    WELCOME_GIFT:               50,
    DAILY_AMOUNT:               80,
    CHAT_PER_MESSAGE:            3,
    CHAT_DAILY_CAP:            150,
    TOTAL_DAILY_CAP:           230,
    CHAT_COOLDOWN_SECONDS:      60,
    INTRO_BONUS:                25,
    MYSTERY_BOX_COOLDOWN_HOURS: 72,
  },

  levels: [
    {
      level: 0,
      roleName: '𝕓𝕒𝕓𝕪 𝕓𝕒𝕕𝕕𝕚𝕖 ♡',
      roleEnv: 'ROLE_BABY_BADDIE',
      coinBonus: 0,
      announcement: false,
      emoji: '🌸',
      perks: ['main channels', '/daily', 'gleam coins', 'pairing form'],
    },
    {
      level: 5,
      roleName: '𝕡𝕒𝕣𝕥𝕪 𝕘𝕚𝕣𝕝 🎀',
      roleEnv: 'ROLE_PARTY_GIRL',
      coinBonus: 100,
      announcement: false,
      emoji: '🎀',
      perks: ['#fit-check-runway', '#selfie-saturday', 'comp entries', '2x giveaways'],
    },
    {
      level: 15,
      roleName: "𝕤𝕙𝕖'𝕤 𝕘𝕚𝕧𝕚𝕟𝕘 ✨",
      roleEnv: 'ROLE_SHES_GIVING',
      coinBonus: 150,
      announcement: true,
      emoji: '✨',
      perks: ["#she's-giving-chat", 'color shop', '3x giveaways', 'comp prizes'],
      announcementText: (user) =>
        `${user} just hit level 15 ✨\nshe's giving and the whole server can feel it 💅`,
    },
    {
      level: 25,
      roleName: '𝕥𝕙𝕒𝕥 𝕘𝕚𝕣𝕝 ✦',
      roleEnv: 'ROLE_THAT_GIRL',
      coinBonus: 200,
      announcement: true,
      emoji: '✦',
      perks: ['#it-girl-exclusive', 'top baddies board', '4x giveaways', 'priority events'],
      announcementText: (user) =>
        `✦ ${user} reached level 25\nyeah she's *that* girl 🖤`,
    },
    {
      level: 40,
      roleName: '𝕤𝕥𝕒𝕪𝕖𝕕 𝕓𝕒𝕕𝕕𝕚𝕖 🖤',
      roleEnv: 'ROLE_STAYED_BADDIE',
      coinBonus: 300,
      announcement: true,
      emoji: '🖤',
      perks: ['#main-character-lounge', 'hall of baddies', '5x giveaways', 'free monthly box', 'auto pairing priority'],
      announcementText: (user) =>
        `🖤 ${user} hit level 40\nshe didn't just show up — she **stayed**. respect 👑`,
    },
    {
      level: 60,
      roleName: '𝕔𝕙𝕠𝕤𝕖𝕟 𝕓𝕒𝕕𝕕𝕚𝕖 ⭐',
      roleEnv: 'ROLE_CHOSEN_BADDIE',
      coinBonus: 500,
      announcement: true,
      emoji: '⭐',
      perks: ['#chosen-sanctum', 'ALL channels', '6x giveaways', 'wall of fame', 'free monthly shoutout', 'permanent priority pairing'],
      announcementText: (user) =>
        `⭐ **CHOSEN BADDIE** ⭐\n\n${user} reached level 60\n\nthe rarest role in Chosen Baddies\nshe earned every single bit of this 🌸`,
    },
  ],

  shop: [
    { id: 'custom_color',      name: '🎨  Custom Color Role',        cost: 900,  description: 'Your name in any hex color. Open a ticket after purchase.',          duration: 0,              requiresTicket: true,  minLevel: 15, category: 'cosmetic'  },
    { id: 'rosie_shoutout',    name: '📢  Rosie Shoutout',           cost: 500,  description: 'Rosie hypes you in #announcements. You write it, staff reviews.',     duration: 0,              requiresTicket: true,  minLevel: 0,  category: 'cosmetic'  },
    { id: 'aesthetic_icon',    name: '🎭  Aesthetic Icon (72h)',      cost: 600,  description: 'The weekly winner role for 72 hours. Auto-expires.',                  duration: 72*60*60,       requiresTicket: false, minLevel: 5,  category: 'cosmetic'  },
    { id: 'nickname_restyle',  name: '✏️  Nickname Restyle',         cost: 150,  description: 'Rosie makes your display name aesthetic. Ticket for style.',          duration: 0,              requiresTicket: true,  minLevel: 0,  category: 'cosmetic'  },
    { id: 'monthly_badge',     name: '🌸  Monthly Badge',            cost: 350,  description: 'Collectible role. Changes every month, gone when it ends.',           duration: 0,              requiresTicket: false, minLevel: 0,  category: 'cosmetic', limited: true },
    { id: 'mystery_box',       name: '🎁  Mystery Box',              cost: 220,  description: 'Random reward: coins, role, or rare prize. 72h cooldown.',            duration: 0,              requiresTicket: false, minLevel: 0,  category: 'cosmetic', hasCooldown: true },
    { id: 'hall_of_fame',      name: '🏆  Hall of Fame',             cost: 750,  description: 'Your name permanently on the Chosen Baddies wall.',                  duration: 0,              requiresTicket: true,  minLevel: 25, category: 'cosmetic'  },
    { id: 'vip_role',          name: '💜  VIP Baddie',               cost: 1200, description: 'Exclusive VIP role, custom color + special badge. Permanent.',        duration: 0,              requiresTicket: true,  minLevel: 25, category: 'cosmetic'  },
    { id: 'emoji_pack',        name: '⚡  Emoji & Sticker Pack',     cost: 380,  description: 'Access all custom server emojis and stickers. Permanent.',            duration: 0,              requiresTicket: false, minLevel: 0,  category: 'functional'},
    { id: 'slowmode_bypass',   name: '🐌  Slowmode Bypass (7d)',     cost: 300,  description: 'Skip slowmode everywhere for 7 days. Misuse = instant revoke.',      duration: 7*24*60*60,     requiresTicket: false, minLevel: 0,  category: 'functional'},
    { id: 'event_early_access',name: '📅  Event Early Access (60d)', cost: 250,  description: 'Pinged 30 min before every event. Lasts 60 days.',                   duration: 60*24*60*60,    requiresTicket: false, minLevel: 0,  category: 'functional'},
    { id: 'xp_boost',          name: '🚀  XP Boost (24h)',           cost: 400,  description: 'Double XP from every message for 24 hours.',                         duration: 24*60*60,       requiresTicket: false, minLevel: 0,  category: 'functional'},
  ],

  mysteryBoxOutcomes: [
    { type: 'coins', amount: 50,  weight: 30, label: '50 gleam coins 💎' },
    { type: 'coins', amount: 150, weight: 20, label: '150 gleam coins 💎' },
    { type: 'coins', amount: 300, weight: 10, label: '300 gleam coins 💎' },
    { type: 'coins', amount: 500, weight: 5,  label: '500 gleam coins 💎 ✨ lucky!' },
    { type: 'xp',    amount: 500, weight: 15, label: '500 bonus XP ✨' },
    { type: 'role',  itemId: 'aesthetic_icon', weight: 12, label: '24h aesthetic icon 🎭' },
    { type: 'role',  itemId: 'monthly_badge',  weight: 8,  label: 'monthly badge 🌸' },
  ],
};
