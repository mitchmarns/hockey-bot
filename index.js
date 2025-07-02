// Main entry point for the Hockey Roleplay Discord Bot - Updated for multi-server support
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { TOKEN } = require('./config/config');
const commandHandlers = require('./commands/commandHandlers');
const registerCommands = require('./commands/registerCommands');

// Initialize bot with required intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// Set up commands collection
client.commands = new Collection();

// Bot ready event
client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user.tag}!`);
  console.log(`Bot is in ${client.guilds.cache.size} servers`);
  
  // Register slash commands
  try {
    console.log('Registering slash commands...');
    await registerCommands();
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
  
  // Initialize database schemas for all guilds
  const { initDatabase } = require('./database/db');
  for (const guild of client.guilds.cache.values()) {
    try {
      await initDatabase(guild.id);
      console.log(`Database initialized for guild: ${guild.name} (${guild.id})`);
    } catch (error) {
      console.error(`Failed to initialize database for guild ${guild.id}:`, error);
    }
  }
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const handler = commandHandlers[interaction.commandName];
  
  if (!handler) {
    console.warn(`No handler found for command: ${interaction.commandName}`);
    return;
  }

  try {
    await handler(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errorMessage = `An error occurred while executing this command: ${error.message}`;
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Handle new guild joins
client.on('guildCreate', async guild => {
  console.log(`Joined new guild: ${guild.name} (${guild.id})`);
  try {
    const { initDatabase } = require('./database/db');
    await initDatabase(guild.id);
    console.log(`Database initialized for new guild: ${guild.name}`);
  } catch (error) {
    console.error(`Failed to initialize database for new guild ${guild.id}:`, error);
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Start the bot
client.login(TOKEN);