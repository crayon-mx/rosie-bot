const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = require('./commands');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('\n🔄 Registering slash commands...\n');

    const commandData = commands.map(cmd => cmd.data.toJSON());

    const result = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commandData }
    );

    console.log(`✦ Successfully registered ${result.length} slash commands`);
    console.log('\n✓ Commands are live! Start the bot now.\n');

  } catch (error) {
    console.error('\n❌ Error registering commands:');
    console.error(error.message);
    
    if (error.message.includes('401')) {
      console.log('\n⚠️  Check your DISCORD_TOKEN in .env');
    }
    if (error.message.includes('404')) {
      console.log('\n⚠️  Check your CLIENT_ID and GUILD_ID in .env');
    }
    
    process.exit(1);
  }
})();
