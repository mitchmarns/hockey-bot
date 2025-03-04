// Database connection and initialization
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const { getDbPath } = require("../config/config");
const path = require("path");
const fs = require("fs");

// Store database connections by guild ID
const connections = {};

// Initialize the database for a specific guild
async function initDatabase(guildId) {
  if (!guildId) {
    throw new Error("Guild ID is required to initialize database");
  }

  // Check if we already have an active connection
  if (connections[guildId] && isConnectionActive(connections[guildId])) {
    console.log(`Using existing database connection for guild ${guildId}`);
    return connections[guildId];
  }

  const dbPath = getDbPath(guildId);

  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Log the full database path to help with troubleshooting
  console.log(`Opening SQLite database at path: ${path.resolve(dbPath)}`);

  try {
    // Open the database with a longer timeout
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
      timeout: 30000, // 30 seconds timeout
    });

    // Enable foreign keys
    await db.run("PRAGMA foreign_keys = ON");

    console.log(`Connected to SQLite database for guild ${guildId}`);

    // Store the connection
    connections[guildId] = db;

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        logo TEXT,
        colors TEXT,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        ties INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if we need to migrate colors column to logo
    await migrateTeamColors(db, guildId);

    // Create other tables
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

    // Create seasons table
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

    // Create playoff_series table
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

    await db.exec(`
      CREATE TABLE IF NOT EXISTS coaches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  team_id INTEGER,
  user_id TEXT NOT NULL,
  image_url TEXT,
  coach_type TEXT DEFAULT 'head', -- head, assistant, goalie, etc.
  biography TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams (id)
        );
      `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS team_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  line_number INTEGER NOT NULL, -- 1st line, 2nd line, etc.
  line_type TEXT NOT NULL, -- forward, defense, powerplay, penalty_kill
  center_id INTEGER, -- For forward lines
  left_wing_id INTEGER, -- For forward lines
  right_wing_id INTEGER, -- For forward lines
  defense1_id INTEGER, -- For defense pairs
  defense2_id INTEGER, -- For defense pairs
  last_updated_by TEXT NOT NULL, -- Coach user_id who last updated
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams (id),
  FOREIGN KEY (center_id) REFERENCES players (id),
  FOREIGN KEY (left_wing_id) REFERENCES players (id),
  FOREIGN KEY (right_wing_id) REFERENCES players (id),
  FOREIGN KEY (defense1_id) REFERENCES players (id),
  FOREIGN KEY (defense2_id) REFERENCES players (id)
);
        `);

    await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_team_lines_team_id ON team_lines(team_id);
            `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS goalie_rotation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  starter_id INTEGER,
  backup_id INTEGER,
  third_string_id INTEGER,
  last_updated_by TEXT NOT NULL, -- Coach user_id who last updated
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams (id),
  FOREIGN KEY (starter_id) REFERENCES players (id),
  FOREIGN KEY (backup_id) REFERENCES players (id),
  FOREIGN KEY (third_string_id) REFERENCES players (id)
);
            `);

    // Add season fields to games if they don't exist
    const gamesColumns = await db.all("PRAGMA table_info(games)");
    const gameColumnNames = gamesColumns.map((col) => col.name);

    if (!gameColumnNames.includes("season_id")) {
      await db.run(
        "ALTER TABLE games ADD COLUMN season_id INTEGER REFERENCES seasons(id)"
      );
    }

    if (!gameColumnNames.includes("is_playoff_game")) {
      await db.run(
        "ALTER TABLE games ADD COLUMN is_playoff_game BOOLEAN DEFAULT 0"
      );
    }

    // Extended player stats
    const playerColumns = await db.all("PRAGMA table_info(players)");
    const playerColumnNames = playerColumns.map((col) => col.name);

    const playerStats = [
      { name: "plus_minus", type: "INTEGER DEFAULT 0" },
      { name: "penalty_minutes", type: "INTEGER DEFAULT 0" },
      { name: "shots", type: "INTEGER DEFAULT 0" },
      { name: "blocks", type: "INTEGER DEFAULT 0" },
      { name: "hits", type: "INTEGER DEFAULT 0" },
      { name: "faceoff_wins", type: "INTEGER DEFAULT 0" },
      { name: "faceoff_losses", type: "INTEGER DEFAULT 0" },
      { name: "time_on_ice_seconds", type: "INTEGER DEFAULT 0" },
      { name: "saves", type: "INTEGER DEFAULT 0" },
      { name: "goals_against", type: "INTEGER DEFAULT 0" },
      { name: "shutouts", type: "INTEGER DEFAULT 0" },
    ];

    for (const stat of playerStats) {
      if (!playerColumnNames.includes(stat.name)) {
        await db.run(
          `ALTER TABLE players ADD COLUMN ${stat.name} ${stat.type}`
        );
      }
    }

    // Add face_claim if it doesn't exist
    if (!playerColumnNames.includes("face_claim")) {
      await db.run("ALTER TABLE players ADD COLUMN face_claim TEXT");
      console.log(`Added face_claim column to players table for guild ${guildId}`);
    }

    // Extended team stats
    const teamColumns = await db.all("PRAGMA table_info(teams)");
    const teamColumnNames = teamColumns.map((col) => col.name);

    const teamStats = [
      { name: "goals_for", type: "INTEGER DEFAULT 0" },
      { name: "goals_against", type: "INTEGER DEFAULT 0" },
      { name: "shots_for", type: "INTEGER DEFAULT 0" },
      { name: "shots_against", type: "INTEGER DEFAULT 0" },
      { name: "power_plays", type: "INTEGER DEFAULT 0" },
      { name: "power_play_goals", type: "INTEGER DEFAULT 0" },
      { name: "penalties", type: "INTEGER DEFAULT 0" },
      { name: "penalty_kill_success", type: "INTEGER DEFAULT 0" },
      { name: "penalty_minutes", type: "INTEGER DEFAULT 0" },
      { name: "home_wins", type: "INTEGER DEFAULT 0" },
      { name: "home_losses", type: "INTEGER DEFAULT 0" },
      { name: "away_wins", type: "INTEGER DEFAULT 0" },
      { name: "away_losses", type: "INTEGER DEFAULT 0" },
    ];

    for (const stat of teamStats) {
      if (!teamColumnNames.includes(stat.name)) {
        await db.run(`ALTER TABLE teams ADD COLUMN ${stat.name} ${stat.type}`);
      }
    }

    console.log(`Database tables initialized for guild ${guildId}`);
    return db;
  } catch (error) {
    console.error(
      `Error opening/initializing database for guild ${guildId}:`,
      error
    );
    throw error;
  }
}

// Helper to check if a connection is still active
function isConnectionActive(conn) {
  try {
    // Try a simple method check that will throw if the connection is closed
    if (!conn || typeof conn.exec !== "function") {
      return false;
    }
    return true; // If we get here, the connection has valid methods
  } catch (e) {
    return false;
  }
}

// Get database connection for a specific guild - synchronous version
function getDb(guildId) {
  if (!guildId) {
    throw new Error("Guild ID is required to get database connection");
  }

  // If we already have an active connection, return it
  if (connections[guildId] && isConnectionActive(connections[guildId])) {
    return connections[guildId];
  }

  // If no active connection, log but don't block
  console.log(
    `No active connection for guild ${guildId}, initializing in background...`
  );

  // Start initialization in background (not using await)
  initDatabase(guildId)
    .then((db) => {
      console.log(`Background initialization completed for guild ${guildId}`);
      connections[guildId] = db;
    })
    .catch((error) => {
      console.error(
        `Error in background initialization for guild ${guildId}:`,
        error
      );
    });

  // Return an interim object if we have one, otherwise throw
  if (connections[guildId]) {
    return connections[guildId];
  }

  throw new Error(
    `Database not initialized for guild ${guildId}. Please try again in a moment.`
  );
}

// Async version for when you can use await
async function getDbAsync(guildId) {
  if (!guildId) {
    throw new Error("Guild ID is required to get database connection");
  }

  try {
    // If no connection exists or it's closed, initialize it
    if (!connections[guildId] || !isConnectionActive(connections[guildId])) {
      console.log(`No active connection for guild ${guildId}, initializing...`);
      await initDatabase(guildId);
    }

    // Return the active connection
    return connections[guildId];
  } catch (error) {
    console.error(`Error getting DB connection for guild ${guildId}:`, error);
    throw error;
  }
}

// Special migration function to handle logo/colors column issue
async function migrateTeamColors(db, guildId) {
  try {
    // Check if we have both columns
    const columns = await db.all("PRAGMA table_info(teams)");
    const columnNames = columns.map((c) => c.name);

    // If we have colors but not logo, rename the column
    if (columnNames.includes("colors") && !columnNames.includes("logo")) {
      console.log(`Migrating 'colors' column to 'logo' for guild ${guildId}`);
      await db.exec(`
        ALTER TABLE teams RENAME COLUMN colors TO logo;
      `);
      console.log("Column renamed successfully");
    }
    // If we have both, migrate data from colors to logo
    else if (columnNames.includes("colors") && columnNames.includes("logo")) {
      console.log(
        `Both 'colors' and 'logo' columns exist, migrating data for guild ${guildId}`
      );
      // Copy data from colors to logo where logo is null
      await db.exec(`
        UPDATE teams SET logo = colors WHERE logo IS NULL AND colors IS NOT NULL;
      `);
      console.log("Data migration complete");
    }
  } catch (error) {
    console.error(`Error migrating team colors for guild ${guildId}:`, error);
    // Continue anyway - this shouldn't be fatal
  }
}

module.exports = {
  initDatabase,
  getDb,
  getDbAsync,
};
