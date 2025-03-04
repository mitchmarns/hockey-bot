// Main entry point for the Hockey Roleplay Discord Bot - Updated for multi-server support
const { Client, GatewayIntentBits } = require('discord.js');
const { TOKEN } = require('./config/config');
const { initDatabase } = require('./database/db');
const registerCommands = require('./commands/registerCommands');
const commandHandlers = require('./commands/commandHandlers');

// Discord client setup
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ] 
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  
  const { commandName } = interaction;
  const guildId = interaction.guildId;
  
  // Ensure the guild ID is properly set in the global context for this command
  global.currentGuildId = guildId;
  
  // Check if command exists in handlers
  if (commandHandlers[commandName]) {
    try {
      // Pre-initialize database if needed
      try {
        const { getDbAsync } = require('./database/db');
        await getDbAsync(guildId);
      } catch (dbError) {
        console.warn(`Warning: Database pre-initialization failed for guild ${guildId}:`, dbError);
        // Continue anyway, as the getDb function will retry
      }
      
      // Execute the command
      await commandHandlers[commandName](interaction);
    } catch (error) {
      console.error(`Error handling command ${commandName}:`, error);
      
      // Check if it's a database error and provide a more helpful message
      if (error.message && (
          error.message.includes('database') || 
          error.message.includes('SQLITE') || 
          error.message.includes('no such table')
      )) {
        await interaction.reply({ 
          content: 'A database error occurred. The system is attempting to fix it automatically. Please try your command again in a few seconds.',
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: `An error occurred: ${error.message}`,
          ephemeral: true 
        });
      }
    }
  }
});

// Also update how the bot handles being added to new guilds
client.on('guildCreate', async (guild) => {
  console.log(`Joined new guild: ${guild.name} (${guild.id})`);
  
  try {
    // Initialize database for this new guild
    const { initDatabase } = require('./database/db');
    await initDatabase(guild.id);
    console.log(`Database initialized for new guild: ${guild.name}`);
  } catch (error) {
    console.error(`Error initializing database for new guild ${guild.name}:`, error);
  }
});

// Command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  
  const { commandName } = interaction;
  
  // Check if command exists in handlers
  if (commandHandlers[commandName]) {
    try {
      await commandHandlers[commandName](interaction);
    } catch (error) {
      console.error(`Error handling command ${commandName}:`, error);
      await interaction.reply({ 
        content: 'An error occurred while processing your command.', 
        ephemeral: true 
      });
    }
  }
});

// Login to Discord with your client's token
client.login(TOKEN);