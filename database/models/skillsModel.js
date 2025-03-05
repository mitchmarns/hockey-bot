// skillsModel.js - Updated to work with characters
const { getDb } = require('../db');

// Get skills for a character
async function getPlayerSkills(characterId, guildId) {
  const db = getDb(guildId);
  
  try {
    // First check if this character has skills in the player_skills table
    const skills = await db.get('SELECT * FROM player_skills WHERE player_id = ?', [characterId]);
    
    // Return default skills if none found
    if (!skills) {
      return {
        player_id: characterId,
        skating: 50,
        shooting: 50,
        passing: 50,
        defense: 50,
        physical: 50,
        goaltending: 50
      };
    }
    
    return skills;
  } catch (error) {
    console.error(`Error getting skills for character ${characterId}:`, error);
    // Return default skills if there's an error
    return {
      player_id: characterId,
      skating: 50,
      shooting: 50,
      passing: 50,
      defense: 50,
      physical: 50,
      goaltending: 50
    };
  }
}

// Set skills for a character
async function setPlayerSkills(characterId, skillsData, guildId) {
  const db = getDb(guildId);
  
  try {
    // Check if character already has skills
    const existingSkills = await db.get('SELECT id FROM player_skills WHERE player_id = ?', [characterId]);
    
    if (existingSkills) {
      // Update existing skills
      return await db.run(
        `UPDATE player_skills SET 
          skating = ?, 
          shooting = ?, 
          passing = ?, 
          defense = ?, 
          physical = ?, 
          goaltending = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE player_id = ?`,
        [
          skillsData.skating,
          skillsData.shooting,
          skillsData.passing,
          skillsData.defense,
          skillsData.physical,
          skillsData.goaltending,
          characterId
        ]
      );
    } else {
      // Insert new skills
      return await db.run(
        `INSERT INTO player_skills 
          (player_id, skating, shooting, passing, defense, physical, goaltending) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          skillsData.skating,
          skillsData.shooting,
          skillsData.passing,
          skillsData.defense,
          skillsData.physical,
          skillsData.goaltending
        ]
      );
    }
  } catch (error) {
    console.error(`Error setting skills for character ${characterId}:`, error);
    throw error;
  }
}

module.exports = {
  getPlayerSkills,
  setPlayerSkills
};