module.exports = {

  // ══════════════════════════════════════════
  // COIN ECONOMY (NO EXPLOITS — All capped)
  // ══════════════════════════════════════════
  coins: {
    WELCOME_GIFT: 50,              // On join
    DAILY_AMOUNT: 80,              // /daily command
    CHAT_PER_MESSAGE: 3,           // Per message
    CHAT_DAILY_CAP: 150,           // Max from chat per day
    TOTAL_DAILY_CAP: 230,          // Hard cap ALL sources per day
    CHAT_COOLDOWN_SECONDS: 60,     // Cooldown between messages
    INTRO_BONUS: 25,               // One-time intro bonus
    MYSTERY_BOX_COOLDOWN_HOURS: 72,// Time between mystery boxes
  },

  // ══════════════════════════════════════════
  // LEVEL MILESTONES (MEE6 formula)
  // ══════════════════════════════════════════
  levels: [
    {
      level: 0,
      roleName: 'baby baddie ♡',
      roleEnv: 'ROLE_BABY_BADDIE',
      coinBonus: 0,
      announcement: false,
    },
    {
      level: 5,
      roleName: 'party girl 🎀',
      roleEnv: 'ROLE_PARTY_GIRL',
      coinBonus: 100,
      announcement: false,
    },
    {
      level: 15,
      roleName: 'she\'s giving ✨',
      roleEnv: 'ROLE_SHES_GIVING',
      coinBonus: 150,
      announcement: true,
      announcementText: (user) =>
        `${user} hit level 15. the energy is immaculate 💅`,
    },
    {
      level: 25,
      roleName: 'that girl ✦',
      roleEnv: 'ROLE_THAT_GIRL',
      coinBonus: 200,
      announcement: true,
      announcementText: (user) =>
        `${user} is now level 25. yeah, she's *that* girl 🖤`,
    },
    {
      level: 40,
      roleName: 'stayed baddie 🖤',
      roleEnv: 'ROLE_STAYED_BADDIE',
      coinBonus: 300,
      announcement: true,
      announcementText: (user) =>
        `${user} reached level 40. she stuck around. respect ����`,
    },
    {
      level: 60,
      roleName: 'chosen baddie ⭐',
      roleEnv: 'ROLE_CHOSEN_BADDIE',
      coinBonus: 500,
      announcement: true,
      announcementText: (user) =>
        `⭐ ${user} is now a **chosen baddie**. the rarest tier here 🌸`,
    },
  ],

  // ══════════════════════════════════════════
  // SHOP ITEMS (All with validation)
  // ══════════════════════════════════════════
  shop: [
    {
      id: 'custom_color',
      name: '🎨 Custom Hex Color Role',
      cost: 900,
      description: 'Any hex color you want. Submit in ticket. Staff applies it.',
      duration: 0,
      requiresTicket: true,
      minLevel: 15,
    },
    {
      id: 'rosie_shoutout',
      name: '📢 Shoutout from Rosie',
      cost: 500,
      description: 'We post your vibe in #announcements. You write it, staff reviews.',
      duration: 0,
      requiresTicket: true,
      minLevel: 0,
    },
    {
      id: 'aesthetic_icon',
      name: '🎭 3-Day Aesthetic Icon',
      cost: 600,
      description: 'Weekly winner role for 72h. Auto-expires after.',
      duration: 72 * 60 * 60,
      requiresTicket: false,
      minLevel: 5,
    },
    {
      id: 'nickname_restyle',
      name: '✏️ Nickname Restyle',
      cost: 150,
      description: 'Rosie makes your name aesthetic. Pick your style in ticket.',
      duration: 0,
      requiresTicket: true,
      minLevel: 0,
    },
    {
      id: 'monthly_badge',
      name: '🌸 Monthly Limited Badge',
      cost: 350,
      description: 'Changes every month. Gone next month. Collect them all.',
      duration: 0,
      requiresTicket: false,
      minLevel: 0,
      limited: true,
    },
    {
      id: 'mystery_box',
      name: '🎁 Mystery Box',
      cost: 220,
      description: 'Random outcome: coins, role, or rare prize. 72h cooldown.',
      duration: 0,
      requiresTicket: false,
      minLevel: 0,
      hasCooldown: true,
    },
    {
      id: 'hall_of_fame',
      name: '🏆 Hall of Fame',
      cost: 750,
      description: 'Your name in the permanent hall of fame.',
      duration: 0,
      requiresTicket: true,
      minLevel: 25,
    },
    {
      id: 'emoji_pack',
      name: '⚡ Emoji Pack Access',
      cost: 380,
      description: 'Use all custom emojis forever.',
      duration: 0,
      requiresTicket: false,
      minLevel: 0,
    },
    {
      id: 'slowmode_bypass',
      name: '🐌 Slowmode Bypass (7 days)',
      cost: 300,
      description: 'Skip slowmode for 7 days. Misuse = revoked, no refund.',
      duration: 7 * 24 * 60 * 60,
      requiresTicket: false,
      minLevel: 0,
    },
    {
      id: 'event_early_access',
      name: '📅 Event Early Access (60 days)',
      cost: 250,
      description: 'Pinged 30min before events. Lasts 60 days.',
      duration: 60 * 24 * 60 * 60,
      requiresTicket: false,
      minLevel: 0,
    },
  ],

  // Mystery box outcomes (weighted random)
  mysteryBoxOutcomes: [
    { type: 'coins', amount: 50,  weight: 30, label: '50 gleam coins 💎' },
    { type: 'coins', amount: 150, weight: 20, label: '150 gleam coins 💎' },
    { type: 'coins', amount: 300, weight: 10, label: '300 gleam coins 💎' },
    { type: 'coins', amount: 500, weight: 5,  label: '500 gleam coins 💎 ✨' },
    { type: 'role',  role: 'aesthetic_icon', duration: 24*60*60, weight: 15, label: '24h aesthetic icon 🎭' },
    { type: 'role',  role: 'monthly_badge',  duration: 0, weight: 10, label: 'monthly badge 🌸' },
    { type: 'shoutout', weight: 10, label: 'free shoutout 📢' },
  ],

  // Colors for embeds
  colors: {
    pink: 0xe8547a,
    lilac: 0xc9a7e8,
    gold: 0xffd700,
    blush: 0xf9b8cb,
    dark: 0x1a1120,
  },
};
