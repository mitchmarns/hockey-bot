// Coach-related database operations
const { getDb } = require('../db');

// Get coach by name
async function getCoachByName(name, guildId) {
  const db = getDb(guildId);
  return await db.get(`
    SELECT c.*, t.name as team_name, t.city as team_city
    FROM coaches c
    LEFT JOIN teams t ON c.team_id = t.id
    WHERE c.name = ? COLLATE NOCASE
  `, [name]);
}

// Get coach by ID
async function getCoachById(id, guildId) {
  const db = getDb(guildId);
  return await db.get(`
    SELECT c.*, t.name as team_name, t.city as team_city
    FROM coaches c
    LEFT JOIN teams t ON c.team_id = t.id
    WHERE c.id = ?
  `, [id]);
}

// Get coaches for a team
async function getCoachesByTeamId(teamId, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT c.*, t.name as team_name, t.city as team_city
    FROM coaches c
    JOIN teams t ON c.team_id = t.id
    WHERE c.team_id = ?
    ORDER BY 
      CASE 
        WHEN c.coach_type = 'head' THEN 1
        WHEN c.coach_type = 'assistant' THEN 2
        WHEN c.coach_type = 'goalie' THEN 3
        ELSE 4
      END
  `, [teamId]);
}

// Create a coach
async function createCoach(name, teamId, userId, coachType, imageUrl = null, biography = null, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'INSERT INTO coaches (name, team_id, user_id, coach_type, image_url, biography) VALUES (?, ?, ?, ?, ?, ?)',
    [name, teamId, userId, coachType, imageUrl, biography]
  );
}

// Update coach image
async function updateCoachImage(coachId, imageUrl, guildId) {
  const db = getDb(guildId);
  return await db.run('UPDATE coaches SET image_url = ? WHERE id = ?', [imageUrl, coachId]);
}

// Update coach bio
async function updateCoachBio(coachId, biography, guildId) {
  const db = getDb(guildId);
  return await db.run('UPDATE coaches SET biography = ? WHERE id = ?', [biography, coachId]);
}

// Update coach team
async function updateCoachTeam(coachId, newTeamId, guildId) {
  const db = getDb(guildId);
  return await db.run(
    'UPDATE coaches SET team_id = ? WHERE id = ?',
    [newTeamId, coachId]
  );
}

// Check if user is a coach for a team
async function isUserCoachForTeam(userId, teamId, guildId) {
  const db = getDb(guildId);
  const coach = await db.get(
    'SELECT * FROM coaches WHERE user_id = ? AND team_id = ?', 
    [userId, teamId]
  );
  
  return !!coach; // Return true if coach exists, false otherwise
}

// Delete a coach
async function deleteCoach(coachId, guildId) {
  const db = getDb(guildId);
  return await db.run('DELETE FROM coaches WHERE id = ?', [coachId]);
}

module.exports = {
  getCoachByName,
  getCoachById,
  getCoachesByTeamId,
  createCoach,
  updateCoachImage,
  updateCoachBio,
  updateCoachTeam,
  isUserCoachForTeam,
  deleteCoach
};