// Main entry point for the Hockey Roleplay Discord Bot - Updated for multi-server support
const { Client, GatewayIntentBits, Events, InteractionType } = require('discord.js');
const { TOKEN } = require('./config/config');
const { initDatabase } = require('./database/db');
const { initCharacterSchema } = require('./database/models/characterModel');
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

async function initCharacterSchema(guildId) {
  console.log(`Initializing character schema for guild ${guildId}...`);
  const db = getDb(guildId);
  
  try {
    // Check if characters table exists
    const tablesResult = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='characters'");
    const charactersTableExists = tablesResult.length > 0;
    
    if (!charactersTableExists) {
      console.log(`Creating characters table for guild ${guildId}...`);
      // Create characters table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS characters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          character_type TEXT NOT NULL,
          team_id INTEGER,
          job TEXT,
          user_id TEXT NOT NULL,
          biography TEXT,
          image_url TEXT,
          face_claim TEXT,
          
          /* Player-specific fields */
          position TEXT,
          jersey_number INTEGER,
          height TEXT,
          weight TEXT,
          
          /* Coach-specific fields */
          specialty TEXT,
          experience TEXT,
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (team_id) REFERENCES teams (id)
        )
      `);
      console.log(`Characters table created successfully for guild ${guildId}`);
    } else {
      console.log(`Characters table already exists for guild ${guildId}`);
    }
    
    console.log(`Character schema initialization completed successfully for guild ${guildId}`);
  } catch (error) {
    console.error(`Error in character schema initialization for guild ${guildId}:`, error);
    throw error;
  }
}

// When the bot is ready
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Initialize databases for all guilds the bot is in
  try {
    const guilds = client.guilds.cache;
    
    for (const [guildId, guild] of guilds) {
      console.log(`Attempting to initialize database for guild: ${guild.name} (${guildId})`);
      
      try {
        // Initialize the database for this guild
        await initDatabase(guildId);
        
        // Initialize the character schema for this guild
        await initCharacterSchema(guildId);
        
        console.log(`Successfully initialized database and character schema for guild: ${guild.name}`);
      } catch (guildError) {
        console.error(`CRITICAL: Failed to initialize database/character schema for guild ${guild.name}:`, guildError);
      }
    }
    
    console.log('Database initialization process completed');
    
    // Register slash commands on startup
    try {
      await registerCommands();
      console.log('Slash commands registered successfully');
    } catch (cmdError) {
      console.error('Failed to register slash commands:', cmdError);
    }
  } catch (error) {
    console.error('CRITICAL error during database initialization:', error);
  }
});

// Improved interaction handler with deferred replies
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  const guildId = interaction.guildId;
  
  // Check if command exists in handlers
  if (commandHandlers[commandName]) {
    try {
      
      // Ensure database is initialized
      try {
        const db = require('./database/db');
        if (typeof db.getDb === 'function') {
          db.getDb(guildId);
        }
      } catch (dbError) {
        console.warn(`Warning: Database check failed for guild ${guildId}:`, dbError);
        // Continue anyway
      }
      
      // Execute the command
      await commandHandlers[commandName](interaction);
    } catch (error) {
      console.error(`Error handling command ${commandName}:`, error);
      
        // Check if interaction can still be responded to
        if (interaction.deferred && !interaction.replied) {
          try {
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
  } catch (replyError) {
    console.error('Error sending error message:', replyError);
  }
}
}
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

// Add global error handler to prevent crashes
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord with your client's token
client.login(TOKEN);