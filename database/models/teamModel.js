// Team-related database operations
const { getDb } = require('../db');

// Get a team by name
async function getTeamByName(name, guildId) {
  if (!name) return null;
  
  try {
    const db = require("../db").getDb(guildId);
    
    // First try exact match (case-insensitive, trimmed)
    let team = await db.get(
      "SELECT * FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))", 
      [name]
    );
    
    // If not found, try a LIKE match
    if (!team) {
      team = await db.get(
        "SELECT * FROM teams WHERE LOWER(TRIM(name)) LIKE LOWER(TRIM(?))", 
        [name]
      );
    }
    
    // Still not found? Try with % wildcards
    if (!team) {
      team = await db.get(
        "SELECT * FROM teams WHERE LOWER(TRIM(name)) LIKE LOWER(TRIM(?))", 
        [`%${name}%`]
      );
    }
    
    // Final fallback - try to match just on partial team name
    if (!team && name.includes(' ')) {
      // If name has spaces, try matching just the last part (team nickname)
      const parts = name.split(' ');
      const nickname = parts[parts.length - 1];
      
      team = await db.get(
        "SELECT * FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(name)) LIKE LOWER(TRIM(?))", 
        [nickname, `%${nickname}%`]
      );
    }
    
    return team;
  } catch (error) {
    console.error(`Error finding team by name: ${error.message}`);
    throw error; // Bubble up error for better debugging
  }
}

// Get all teams
async function getAllTeams(guildId) {
  try {
    const db = getDb(guildId);
    return await db.all('SELECT * FROM teams');
  } catch (error) {
    console.error('Error in getAllTeams:', error);
    throw error;
  }
}

// Get teams sorted by points
async function getTeamStandings(guildId) {
  try {
    const db = getDb(guildId);
    return await db.all(`
      SELECT *, (wins * 2 + ties) as points 
      FROM teams 
      ORDER BY points DESC, wins DESC
    `);
  } catch (error) {
    console.error('Error in getTeamStandings:', error);
    throw error;
  }
}

// Create a team
async function createTeam(name, city, logo, teamColor, guildId) {
  try {
    const db = getDb(guildId);
    
    // Validate team color if provided
    if (teamColor && !isValidHexColor(teamColor)) {
      throw new Error('Invalid color format. Use hex format like #FF0000');
    }
    
    console.log(`Inserting team: ${name}, ${city}, ${logo}, ${teamColor}`);
    return await db.run(
      'INSERT INTO teams (name, city, logo, team_color) VALUES (?, ?, ?, ?)',
      [name, city, logo, teamColor]
    );
  } catch (error) {
    console.error('Error in createTeam:', error);
    throw error;
  }
}

// Update team record after a game
async function updateTeamRecord(teamId, result, guildId) {
  try {
    const db = getDb(guildId);
    if (result === 'win') {
      return await db.run('UPDATE teams SET wins = wins + 1 WHERE id = ?', [teamId]);
    } else if (result === 'loss') {
      return await db.run('UPDATE teams SET losses = losses + 1 WHERE id = ?', [teamId]);
    } else if (result === 'tie') {
      return await db.run('UPDATE teams SET ties = ties + 1 WHERE id = ?', [teamId]);
    }
  } catch (error) {
    console.error('Error in updateTeamRecord:', error);
    throw error;
  }
}

// Get team by ID
async function getTeamById(id, guildId) {
  try {
    const db = getDb(guildId);
    return await db.get('SELECT * FROM teams WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error in getTeamById:', error);
    throw error;
  }
}

// Update team color
async function updateTeamColor(teamId, color, guildId) {
  try {
    if (!isValidHexColor(color)) {
      throw new Error('Invalid color format. Use hex format like #FF0000');
    }
    
    const db = getDb(guildId);
    return await db.run('UPDATE teams SET team_color = ? WHERE id = ?', [color, teamId]);
  } catch (error) {
    console.error('Error in updateTeamColor:', error);
    throw error;
  }
}

// Helper function to validate hex colors
function isValidHexColor(color) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Add to teamModel.js - Team statistics
async function extendTeamSchema(guildId) {
  const db = getDb(guildId);
  
  // Check if the new columns already exist
  const columns = await db.all('PRAGMA table_info(teams)');
  const columnNames = columns.map(c => c.name);
  
  // Ensure team_color column exists first
  if (!columnNames.includes('team_color')) {
    await db.run("ALTER TABLE teams ADD COLUMN team_color TEXT DEFAULT '#808080'");
    console.log(`Added team_color column to teams table for guild ${guildId}`);
  }
  
  // New team stats to track
  const newStats = [
    { name: 'goals_for', type: 'INTEGER DEFAULT 0' },
    { name: 'goals_against', type: 'INTEGER DEFAULT 0' },
    { name: 'shots_for', type: 'INTEGER DEFAULT 0' },
    { name: 'shots_against', type: 'INTEGER DEFAULT 0' },
    { name: 'power_plays', type: 'INTEGER DEFAULT 0' },
    { name: 'power_play_goals', type: 'INTEGER DEFAULT 0' },
    { name: 'penalties', type: 'INTEGER DEFAULT 0' },
    { name: 'penalty_kill_success', type: 'INTEGER DEFAULT 0' },
    { name: 'penalty_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'home_wins', type: 'INTEGER DEFAULT 0' },
    { name: 'home_losses', type: 'INTEGER DEFAULT 0' },
    { name: 'away_wins', type: 'INTEGER DEFAULT 0' },
    { name: 'away_losses', type: 'INTEGER DEFAULT 0' }
  ];
  
  // Add each column if it doesn't exist
  for (const stat of newStats) {
    if (!columnNames.includes(stat.name)) {
      await db.run(`ALTER TABLE teams ADD COLUMN ${stat.name} ${stat.type}`);
      console.log(`Added ${stat.name} column to teams table for guild ${guildId}`);
    }
  }
  
  console.log(`Team schema extended with hockey stats for guild ${guildId}`);
}

// Add a new function to ensure team color column exists
async function ensureTeamColorColumn(guildId) {
  try {
    const db = getDb(guildId);
    const columns = await db.all('PRAGMA table_info(teams)');
    const columnNames = columns.map(c => c.name);
    
    if (!columnNames.includes('team_color')) {
      await db.run("ALTER TABLE teams ADD COLUMN team_color TEXT DEFAULT '#808080'");
      console.log(`Added team_color column to teams table for guild ${guildId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error ensuring team_color column for guild ${guildId}:`, error);
    throw error;
  }
}

module.exports = {
  getTeamByName,
  getAllTeams,
  getTeamStandings,
  createTeam,
  updateTeamRecord,
  getTeamById,
  updateTeamColor,
  extendTeamSchema,
  ensureTeamColorColumn
};