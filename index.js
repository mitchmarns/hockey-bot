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

// When the bot is ready
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Initialize databases for all guilds the bot is in
  try {
    const guilds = client.guilds.cache;
    
    for (const [guildId, guild] of guilds) {
      console.log(`Initializing database for guild: ${guild.name} (${guildId})`);
      
      try {
        // Initialize the database for this guild
        await initDatabase(guildId);
        console.log(`Successfully initialized database for guild: ${guild.name}`);
      } catch (guildError) {
        console.error(`Error initializing database for guild ${guild.name}:`, guildError);
      }
    }
    
    console.log('Hockey Roleplay Bot is online with all databases initialized!');
  } catch (error) {
    console.error('Critical error initializing databases:', error);
  }
});

// Add handler for when bot joins a new guild
client.on('guildCreate', async (guild) => {
  console.log(`Joined new guild: ${guild.name} (${guild.id})`);
  
  try {
    // Initialize database for this new guild
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