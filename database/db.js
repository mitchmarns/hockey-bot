// Database connection and initialization
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { getDbPath } = require('../config/config');

// Store database connections by guild ID
const connections = {};
const connectionTTL = 30 * 60 * 1000; // 30 minutes
const connTimers = {};

// Initialize the database for a specific guild
async function initDatabase(guildId) {
  if (!guildId) {
    throw new Error('Guild ID is required to initialize database');
  }
  
  const dbPath = getDbPath(guildId);
  
  // Open the database
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log(`Connected to SQLite database for guild ${guildId}`);
  
  // Store the connection BEFORE migrations
  connections[guildId] = db;
  
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      logo TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      number INTEGER NOT NULL,
      team_id INTEGER,
      user_id TEXT NOT NULL,
      image_url TEXT,
      goals INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id)
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team_id INTEGER NOT NULL,
      away_team_id INTEGER NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      scheduled_date TEXT,
      scheduled_time TEXT,
      is_played BOOLEAN DEFAULT 0,
      played_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (home_team_id) REFERENCES teams (id),
      FOREIGN KEY (away_team_id) REFERENCES teams (id)
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      player_id INTEGER,
      period INTEGER,
      time TEXT,
      description TEXT,
      FOREIGN KEY (game_id) REFERENCES games (id),
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS player_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      skating INTEGER DEFAULT 50,
      shooting INTEGER DEFAULT 50,
      passing INTEGER DEFAULT 50,
      defense INTEGER DEFAULT 50,
      physical INTEGER DEFAULT 50,
      goaltending INTEGER DEFAULT 50,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS player_phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      phone_number TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS phone_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_phone_id INTEGER NOT NULL,
      to_phone_id INTEGER NOT NULL,
      message_text TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_phone_id) REFERENCES player_phones (id),
      FOREIGN KEY (to_phone_id) REFERENCES player_phones (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS player_triggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      trigger_text TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS trade_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      from_team_id INTEGER NOT NULL,
      to_team_id INTEGER NOT NULL,
      trade_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (player_id) REFERENCES players (id),
      FOREIGN KEY (from_team_id) REFERENCES teams (id),
      FOREIGN KEY (to_team_id) REFERENCES teams (id)
    )
  `);
  
  console.log(`Database tables initialized for guild ${guildId}`);
  
  // Run database migrations with error handling
  try {
    await migrateDatabase(guildId);
    console.log(`Database migrations completed for guild ${guildId}`);
  } catch (error) {
    console.error(`Error during database migration for guild ${guildId}:`, error);
    // Continue anyway, so the bot can still function with base tables
  }
  
  return db;
}

// Database migration system
async function migrateDatabase(guildId) {
  const db = getDb(guildId);
  
  // Create version table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS db_version (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get current database version
  const versionRow = await db.get('SELECT MAX(version) as version FROM db_version');
  const dbVersion = versionRow?.version || 0;
  
  console.log(`Current database version for guild ${guildId}: ${dbVersion}`);
  
  // Run migrations in sequence
  if (dbVersion < 1) {
    console.log(`Migrating guild ${guildId} to version 1...`);
    // Base schema - already created in initDatabase
    await db.run('INSERT INTO db_version (version) VALUES (1)');
  }
  
  if (dbVersion < 2) {
    console.log(`Migrating guild ${guildId} to version 2...`);
    // Add extended player stats
    await db.exec(`
      ALTER TABLE players ADD COLUMN IF NOT EXISTS plus_minus INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS penalty_minutes INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS shots INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS blocks INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS hits INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS faceoff_wins INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS faceoff_losses INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS time_on_ice_seconds INTEGER DEFAULT 0;
      
      ALTER TABLE players ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS goals_against INTEGER DEFAULT 0;
      ALTER TABLE players ADD COLUMN IF NOT EXISTS shutouts INTEGER DEFAULT 0;
    `);
    await db.run('INSERT INTO db_version (version) VALUES (2)');
  }
  
  if (dbVersion < 3) {
    console.log(`Migrating guild ${guildId} to version 3...`);
    // Add extended team stats
    await db.exec(`
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS goals_for INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS goals_against INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS shots_for INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS shots_against INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS power_plays INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS power_play_goals INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS penalties INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS penalty_kill_success INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS penalty_minutes INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS home_wins INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS home_losses INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS away_wins INTEGER DEFAULT 0;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS away_losses INTEGER DEFAULT 0;
    `);
    await db.run('INSERT INTO db_version (version) VALUES (3)');
  }

  if (dbVersion < 4) {
    console.log(`Migrating guild ${guildId} to version 4...`);
    // Add season and playoff fields to games
    await db.exec(`
      ALTER TABLE games ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES seasons(id);
      ALTER TABLE games ADD COLUMN IF NOT EXISTS is_playoff_game BOOLEAN DEFAULT 0;
    `);
    
    // Create seasons table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        is_active BOOLEAN DEFAULT 1,
        is_playoffs BOOLEAN DEFAULT 0,
        playoffs_started BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create playoff_series table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS playoff_series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        team1_id INTEGER NOT NULL,
        team2_id INTEGER NOT NULL,
        team1_wins INTEGER DEFAULT 0,
        team2_wins INTEGER DEFAULT 0,
        winner_id INTEGER,
        best_of INTEGER DEFAULT 7,
        is_complete BOOLEAN DEFAULT 0,
        next_series_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (season_id) REFERENCES seasons (id),
        FOREIGN KEY (team1_id) REFERENCES teams (id),
        FOREIGN KEY (team2_id) REFERENCES teams (id),
        FOREIGN KEY (winner_id) REFERENCES teams (id),
        FOREIGN KEY (next_series_id) REFERENCES playoff_series (id)
      )
    `);

    await db.run('INSERT INTO db_version (version) VALUES (4)');
  }
  
  // Continue with more migrations as needed...
}

// Get database connection for a specific guild
function getDb(guildId) {
  if (!guildId) {
    throw new Error('Guild ID is required to get database connection');
  }
  
  if (!connections[guildId]) {
    throw new Error(`Database not initialized for guild ${guildId}. Call initDatabase(${guildId}) first.`);
  }
  
  // Reset timer when DB is accessed
  if (connTimers[guildId]) {
    clearTimeout(connTimers[guildId]);
  }
  
  // Set new timeout
  connTimers[guildId] = setTimeout(() => {
    console.log(`Closing inactive DB connection for guild ${guildId}`);
    connections[guildId].close().catch(err => 
      console.error(`Error closing DB connection for guild ${guildId}:`, err)
    );
    delete connections[guildId];
    delete connTimers[guildId];
  }, connectionTTL);
  
  return connections[guildId];
}

module.exports = {
  initDatabase,
  getDb,
  migrateDatabase
};