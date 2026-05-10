const { Client, GatewayIntentBits, ChannelType, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const commands = require('./commands');
const { awardChatCoins } = require('./systems/coins');
const { awardMessageXP } = require('./systems/levels');
const { expireTimedPurchases } = require('./systems/shop');
const db = require('./systems/database');
const config = require('./systems/config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ══════════════════════════════════════════
// BOT READY EVENT
// ══════════════════════════════════════════

client.once('ready', async () => {  // add async here
  // ── REGISTER COMMANDS ON STARTUP ──
  const { REST, Routes } = require('discord.js');
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const commandData = commands.map(c => c.data.toJSON());
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commandData }
  ).then(() => console.log('✦ Slash commands registered'))
   .catch(e => console.error('❌ Command registration failed:', e.message));
  // ── END REGISTER ──
  console.log(`\n✦ ═══════════════════════════════════════════`);
  console.log(`✦ Bot: ${client.user.username}#${client.user.discriminator}`);
  console.log(`✦ Status: ONLINE`);
  console.log(`✦ Serving ${client.guilds.cache.size} server(s)`);
  console.log(`✦ ═══════════════════════════════════════════\n`);

const { ActivityType } = require('discord.js');
  client.user.setActivity(
    process.env.BOT_STATUS || 'chosen baddies',
    { type: ActivityType.Watching }
  );

  // Auto-expire timed purchases every 10 minutes
  setInterval(() => {
    expireTimedPurchases();
  }, 10 * 60 * 1000);

  console.log(`✦ Tasks running: Purchase expiry check every 10min`);
});

// ══════════════════════════════════════════
// SLASH COMMANDS
// ══════════════════════════════════════════

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find(c => c.data.name === interaction.commandName);

  if (!command) {
    return interaction.reply({
      content: '✦ command not found',
      ephemeral: true,
    });
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`\n❌ Error in command /${interaction.commandName}:`);
    console.error(error);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xff6b6b)
      .setDescription(`✦ something went wrong\n\`\`\`${error.message}\`\`\``);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    }
  }
});

// ══════════════════════════════════════════
// MESSAGE EVENTS — XP & COINS
// ══════════════════════════════════════════

client.on('messageCreate', async (message) => {
  // Skip if: bot, DM, empty, or command
  if (message.author.bot || !message.guild || !message.content.trim() || message.content.startsWith('/')) {
    return;
  }

  try {
    // Award chat coins
    if (process.env.ENABLE_COIN_GAIN === 'true') {
      awardChatCoins(message.author.id, message.guildId);
    }

    // Award XP
    if (process.env.ENABLE_XP_GAIN === 'true') {
      await awardMessageXP(message.member, message.guild, client);
    }
  } catch (error) {
    console.error('Error processing message:', error.message);
  }
});

// ══════════════════════════════════════════
// MEMBER JOIN
// ══════════════════════════════════════════

client.on('guildMemberAdd', async (member) => {
  try {
    const { giveWelcomeGift } = require('./systems/coins');

    // Initialize member in database
    db.ensureMember(member.id, member.guild.id);

    // Award welcome gift (50 coins)
    giveWelcomeGift(member.id, member.guild.id);

    // Send DM welcome
const dmEmbed = new EmbedBuilder()
      .setColor(config.colors.pink)
      .setTitle(`˚ʚ you're in ɞ˚`)
      .setDescription(
        `⊹ ˖ welcome to chosen baddies ˖ ⊹\n\n` +
        `ᝰ rosie dropped **50 gleam coins** in your account 💎\n\n` +
        `⊹ ˖ ⋆｡‧ get started ‧｡⋆ ˖ ⊹\n\n` +
        `ᝰ \`/balance\` — see your coins & level\n` +
        `ᝰ \`/daily\` — claim 80 coins every 24h\n` +
        `ᝰ \`/shop\` — spend your gleam coins\n` +
        `ᝰ \`/vibe\` — check your vibe for today\n\n` +
        `✦ post an intro for **+25 💎** · use \`/intro\` after posting`
      )
      .setFooter({ text: '✦ chosen baddies · rosie' });

    await member.send({ embeds: [dmEmbed] }).catch(() => {});

    // Post in welcome channel
    const welcomeChannelId = process.env.CHANNEL_WELCOME;
    if (welcomeChannelId) {
      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (channel) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor(config.colors.blush)
          .setDescription(`${member} just joined the baddies 🌸`);

        await channel.send({ embeds: [welcomeEmbed] }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Error on member join:', error.message);
  }
});

// ══════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════

client.login(process.env.DISCORD_TOKEN);

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});
