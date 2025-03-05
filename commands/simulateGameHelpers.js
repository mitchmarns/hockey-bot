// simulateGameHelpers.js - Updated to handle both character and player models
const skillsModel = require('../database/models/skillsModel');
const playerModel = require('../database/models/playerModel');

// Enhanced character/player retrieval with compatibility for both models
async function getCharacterWithSkills(entity, guildId) {
  // Check if this is a player entity (from old model) or character entity (from new model)
  const isPlayerModel = entity.hasOwnProperty('team_id') && !entity.hasOwnProperty('character_type');
  const isCharacterModel = entity.hasOwnProperty('character_type');
  
  // Get skills for the entity - works with both player and character IDs
  const skills = await skillsModel.getPlayerSkills(entity.id, guildId);
  
  return { ...entity, skills };
}

// Get all players by team ID - compatible with both models
async function getTeamPlayers(teamId, guildId) {
  try {
    // Try to get characters first (new model)
    const characterModel = require('../database/models/characterModel');
    const characters = await characterModel.getCharactersByTeam(teamId, 'player', guildId);
    
    if (characters && characters.length > 0) {
      return characters;
    }
    
    // Fallback to players (old model) if no characters found
    const players = await playerModel.getPlayersByTeamId(teamId, guildId);
    return players;
  } catch (error) {
    console.log("Error getting team players, trying fallback:", error);
    // Final fallback - direct database query that handles both models
    const db = require('../database/db').getDb(guildId);
    
    try {
      // First try characters table
      const characters = await db.all(`
        SELECT * FROM characters 
        WHERE team_id = ? AND character_type = 'player'
      `, [teamId]);
      
      if (characters && characters.length > 0) {
        return characters;
      }
    } catch (e) {
      console.log("Characters table query failed, trying players table");
    }
    
    // Then try players table
    try {
      const players = await db.all(`
        SELECT * FROM players 
        WHERE team_id = ?
      `, [teamId]);
      
      return players;
    } catch (e) {
      console.error("Both tables failed:", e);
      return []; // Return empty array as last resort
    }
  }
}

// Function to calculate team strength
function calculateTeamStrength(players) {
  // Handle empty array case
  if (!players || players.length === 0) {
    return {
      skating: 50,
      offense: 50,
      defense: 50,
      goaltending: 50,
      overall: 50
    };
  }

  const skaters = players.filter(p => p.position !== 'goalie');
  const goalies = players.filter(p => p.position === 'goalie');
  
  // Calculate skating strength
  const skatingStrength = skaters.reduce((sum, p) => sum + (p.skills?.skating || 50), 0) / 
    (skaters.length || 1);
  
  // Calculate offense strength (shooting + passing)
  const offenseStrength = skaters.reduce((sum, p) => 
    sum + ((p.skills?.shooting || 50) + (p.skills?.passing || 50)) / 2, 0) / 
    (skaters.length || 1);
  
  // Calculate defense strength
  const defenseStrength = skaters.reduce((sum, p) => sum + (p.skills?.defense || 50), 0) / 
    (skaters.length || 1);
  
  // Calculate goaltending strength
  const goaltendingStrength = goalies.length > 0 ? 
    goalies.reduce((sum, p) => sum + (p.skills?.goaltending || 50), 0) / goalies.length : 
    50; // Default if no goalie
  
  return {
    skating: skatingStrength,
    offense: offenseStrength,
    defense: defenseStrength,
    goaltending: goaltendingStrength,
    overall: (skatingStrength + offenseStrength + defenseStrength * 2 + goaltendingStrength * 3) / 7
  };
}

// Function to simulate game with team strengths
function simulateGameScore(homeStrength, awayStrength) {
  // Base scores (random 0-3 goals)
  let homeScore = Math.floor(Math.random() * 4);
  let awayScore = Math.floor(Math.random() * 4);
  
  // Adjust based on offense vs goaltending
  const homeOffenseVsGoal = (homeStrength.offense - awayStrength.goaltending) / 100;
  const awayOffenseVsGoal = (awayStrength.offense - homeStrength.goaltending) / 100;
  
  // Add extra goals based on skill difference (0-3 extra goals)
  homeScore += Math.floor(Math.max(0, homeOffenseVsGoal * 6));
  awayScore += Math.floor(Math.max(0, awayOffenseVsGoal * 6));
  
  // Home ice advantage (slight chance for extra goal)
  if (Math.random() < 0.2) {
    homeScore += 1;
  }
  
  return { homeScore, awayScore };
}

// Enhanced goal scorer selection based on player skills
function selectGoalScorer(skaters) {
  if (!skaters || skaters.length === 0) return null;
  
  // Weigh players by shooting skill
  const totalWeight = skaters.reduce((sum, player) => sum + (player.skills?.shooting || 50), 0);
  let random = Math.random() * totalWeight;
  
  for (const player of skaters) {
    const weight = player.skills?.shooting || 50;
    if (random <= weight) {
      return player;
    }
    random -= weight;
  }
  
  // Fallback to random player if something goes wrong
  return skaters[Math.floor(Math.random() * skaters.length)];
}

// Enhanced assist selection based on player skills
function selectAssist(skaters, scorerId) {
  const possibleAssists = skaters.filter(p => p.id !== scorerId);
  if (possibleAssists.length === 0) return null;
  
  // Weigh players by passing skill
  const totalWeight = possibleAssists.reduce((sum, player) => sum + (player.skills?.passing || 50), 0);
  let random = Math.random() * totalWeight;
  
  for (const player of possibleAssists) {
    const weight = player.skills?.passing || 50;
    if (random <= weight) {
      return player;
    }
    random -= weight;
  }
  
  // Fallback to random player if something goes wrong
  return possibleAssists[Math.floor(Math.random() * possibleAssists.length)];
}

module.exports = {
  getCharacterWithSkills,
  getTeamPlayers,
  calculateTeamStrength,
  simulateGameScore,
  selectGoalScorer,
  selectAssist
};