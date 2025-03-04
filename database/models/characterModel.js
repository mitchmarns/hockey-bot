// Character-related database operations
const { getDb } = require('../db');

// Initialize character schema if not already done
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
          character_type TEXT NOT NULL, /* 'player', 'coach', 'staff', 'civilian', etc. */
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

// Create a character
async function createCharacter(characterData) {
  const db = getDb(characterData.guildId);
  
  // Basic fields all characters have
  const baseParams = [
    characterData.name, 
    characterData.charType, 
    characterData.teamId, 
    characterData.job, 
    characterData.userId, 
    characterData.biography, 
    characterData.imageUrl, 
    characterData.faceClaim
  ];
  
  // Player-specific fields
  const playerParams = [
    characterData.position || null,
    characterData.jerseyNumber || null,
    characterData.height || null,
    characterData.weight || null
  ];
  
  // Coach-specific fields
  const coachParams = [
    characterData.specialty || null,
    characterData.experience || null
  ];
  
  return await db.run(
    `INSERT INTO characters (
      name, character_type, team_id, job, user_id, biography, image_url, face_claim,
      position, jersey_number, height, weight,
      specialty, experience
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...baseParams, ...playerParams, ...coachParams]
  );
}

// Get character by name
async function getCharacterByName(name, guildId) {
  const db = getDb(guildId);
  return await db.get(`
    SELECT c.*, t.name as team_name, t.city as team_city
    FROM characters c
    LEFT JOIN teams t ON c.team_id = t.id
    WHERE c.name = ? COLLATE NOCASE
  `, [name]);
}

// Get character by ID
async function getCharacterById(id, guildId) {
  const db = getDb(guildId);
  return await db.get(`
    SELECT c.*, t.name as team_name, t.city as team_city
    FROM characters c
    LEFT JOIN teams t ON c.team_id = t.id
    WHERE c.id = ?
  `, [id]);
}

// Get characters by team ID
async function getCharactersByTeam(teamId, characterType = null, guildId) {
  const db = getDb(guildId);
  
  let query = `
    SELECT c.*, t.name as team_name, t.city as team_city
    FROM characters c
    JOIN teams t ON c.team_id = t.id
    WHERE c.team_id = ?
  `;
  
  if (characterType) {
    query += ` AND c.character_type = ?`;
    return await db.all(query, [teamId, characterType]);
  }
  
  query += ` ORDER BY c.character_type, c.name`;
  return await db.all(query, [teamId]);
}

// Get all characters by type
async function getCharactersByType(characterType, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT c.*, t.name as team_name, t.city as team_city
    FROM characters c
    LEFT JOIN teams t ON c.team_id = t.id
    WHERE c.character_type = ?
    ORDER BY c.name
  `, [characterType]);
}

// Get characters by user ID
async function getCharactersByUser(userId, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT c.*, t.name as team_name, t.city as team_city
    FROM characters c
    LEFT JOIN teams t ON c.team_id = t.id
    WHERE c.user_id = ?
    ORDER BY c.character_type, c.name
  `, [userId]);
}

// Update character
async function updateCharacter(characterId, updatedData, guildId) {
  const db = getDb(guildId);
  
  // Build the SQL dynamically based on provided fields
  let updateFields = [];
  let values = [];
  
  for (const [key, value] of Object.entries(updatedData)) {
    if (value !== undefined) {
      updateFields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (updateFields.length === 0) return null;
  
  // Add the character ID to values
  values.push(characterId);
  
  return await db.run(
    `UPDATE characters SET ${updateFields.join(', ')} WHERE id = ?`,
    values
  );
}

// Delete a character
async function deleteCharacter(characterId, guildId) {
  const db = getDb(guildId);
  return await db.run('DELETE FROM characters WHERE id = ?', [characterId]);
}

module.exports = {
  initCharacterSchema,
  createCharacter,
  getCharacterByName,
  getCharacterById,
  getCharactersByTeam,
  getCharactersByType,
  getCharactersByUser,
  updateCharacter,
  deleteCharacter
};