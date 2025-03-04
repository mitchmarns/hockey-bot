// Team lines-related database operations
const { getDb } = require('../db');

// Get all forward lines for a team
async function getForwardLines(teamId, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT l.*, 
      c.name as center_name, c.number as center_number,
      lw.name as left_wing_name, lw.number as left_wing_number,
      rw.name as right_wing_name, rw.number as right_wing_number
    FROM team_lines l
    LEFT JOIN players c ON l.center_id = c.id
    LEFT JOIN players lw ON l.left_wing_id = lw.id
    LEFT JOIN players rw ON l.right_wing_id = rw.id
    WHERE l.team_id = ? AND l.line_type = 'forward'
    ORDER BY l.line_number
  `, [teamId]);
}

// Get all defense pairs for a team
async function getDefensePairs(teamId, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT l.*, 
      d1.name as defense1_name, d1.number as defense1_number,
      d2.name as defense2_name, d2.number as defense2_number
    FROM team_lines l
    LEFT JOIN players d1 ON l.defense1_id = d1.id
    LEFT JOIN players d2 ON l.defense2_id = d2.id
    WHERE l.team_id = ? AND l.line_type = 'defense'
    ORDER BY l.line_number
  `, [teamId]);
}

// Get special teams units (powerplay, penalty kill)
async function getSpecialTeamsLines(teamId, lineType, guildId) {
  const db = getDb(guildId);
  return await db.all(`
    SELECT l.*, 
      c.name as center_name, c.number as center_number,
      lw.name as left_wing_name, lw.number as left_wing_number,
      rw.name as right_wing_name, rw.number as right_wing_number,
      d1.name as defense1_name, d1.number as defense1_number,
      d2.name as defense2_name, d2.number as defense2_number
    FROM team_lines l
    LEFT JOIN players c ON l.center_id = c.id
    LEFT JOIN players lw ON l.left_wing_id = lw.id
    LEFT JOIN players rw ON l.right_wing_id = rw.id
    LEFT JOIN players d1 ON l.defense1_id = d1.id
    LEFT JOIN players d2 ON l.defense2_id = d2.id
    WHERE l.team_id = ? AND l.line_type = ?
    ORDER BY l.line_number
  `, [teamId, lineType]);
}

// Get goalie rotation
async function getGoalieRotation(teamId, guildId) {
  const db = getDb(guildId);
  return await db.get(`
    SELECT gr.*,
      s.name as starter_name, s.number as starter_number,
      b.name as backup_name, b.number as backup_number,
      t.name as third_string_name, t.number as third_string_number
    FROM goalie_rotation gr
    LEFT JOIN players s ON gr.starter_id = s.id
    LEFT JOIN players b ON gr.backup_id = b.id
    LEFT JOIN players t ON gr.third_string_id = t.id
    WHERE gr.team_id = ?
  `, [teamId]);
}

// Set a forward line
async function setForwardLine(teamId, lineNumber, centerId, leftWingId, rightWingId, coachUserId, guildId) {
  const db = getDb(guildId);
  
  // Check if line already exists
  const existingLine = await db.get(
    'SELECT id FROM team_lines WHERE team_id = ? AND line_type = ? AND line_number = ?',
    [teamId, 'forward', lineNumber]
  );
  
  if (existingLine) {
    // Update existing line
    return await db.run(
      `UPDATE team_lines 
       SET center_id = ?, left_wing_id = ?, right_wing_id = ?, 
           last_updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [centerId, leftWingId, rightWingId, coachUserId, existingLine.id]
    );
  } else {
    // Create new line
    return await db.run(
      `INSERT INTO team_lines 
         (team_id, line_type, line_number, center_id, left_wing_id, right_wing_id, last_updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [teamId, 'forward', lineNumber, centerId, leftWingId, rightWingId, coachUserId]
    );
  }
}

// Set a defense pair
async function setDefensePair(teamId, pairNumber, defense1Id, defense2Id, coachUserId, guildId) {
  const db = getDb(guildId);
  
  // Check if pair already exists
  const existingPair = await db.get(
    'SELECT id FROM team_lines WHERE team_id = ? AND line_type = ? AND line_number = ?',
    [teamId, 'defense', pairNumber]
  );
  
  if (existingPair) {
    // Update existing pair
    return await db.run(
      `UPDATE team_lines 
       SET defense1_id = ?, defense2_id = ?, 
           last_updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [defense1Id, defense2Id, coachUserId, existingPair.id]
    );
  } else {
    // Create new pair
    return await db.run(
      `INSERT INTO team_lines 
         (team_id, line_type, line_number, defense1_id, defense2_id, last_updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teamId, 'defense', pairNumber, defense1Id, defense2Id, coachUserId]
    );
  }
}

// Set a special teams unit (powerplay or penalty kill)
async function setSpecialTeamsLine(teamId, lineType, unitNumber, playerId1, playerId2, playerId3, playerId4, playerId5, coachUserId, guildId) {
  const db = getDb(guildId);
  
  // For powerplay/penalty kill, determine how to assign the players based on positions
  // This is simplified - you might want more sophisticated assignment logic
  const existingUnit = await db.get(
    'SELECT id FROM team_lines WHERE team_id = ? AND line_type = ? AND line_number = ?',
    [teamId, lineType, unitNumber]
  );
  
  if (existingUnit) {
    // Update existing unit
    return await db.run(
      `UPDATE team_lines 
       SET center_id = ?, left_wing_id = ?, right_wing_id = ?, defense1_id = ?, defense2_id = ?,
           last_updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [playerId1, playerId2, playerId3, playerId4, playerId5, coachUserId, existingUnit.id]
    );
  } else {
    // Create new unit
    return await db.run(
      `INSERT INTO team_lines 
         (team_id, line_type, line_number, center_id, left_wing_id, right_wing_id, defense1_id, defense2_id, last_updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [teamId, lineType, unitNumber, playerId1, playerId2, playerId3, playerId4, playerId5, coachUserId]
    );
  }
}

// Set goalie rotation
async function setGoalieRotation(teamId, starterId, backupId, thirdStringId, coachUserId, guildId) {
  const db = getDb(guildId);
  
  // Check if rotation already exists
  const existingRotation = await db.get(
    'SELECT id FROM goalie_rotation WHERE team_id = ?',
    [teamId]
  );
  
  if (existingRotation) {
    // Update existing rotation
    return await db.run(
      `UPDATE goalie_rotation 
       SET starter_id = ?, backup_id = ?, third_string_id = ?, 
           last_updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [starterId, backupId, thirdStringId, coachUserId, existingRotation.id]
    );
  } else {
    // Create new rotation
    return await db.run(
      `INSERT INTO goalie_rotation 
         (team_id, starter_id, backup_id, third_string_id, last_updated_by)
       VALUES (?, ?, ?, ?, ?)`,
      [teamId, starterId, backupId, thirdStringId, coachUserId]
    );
  }
}

// Delete a line
async function deleteLine(lineId, guildId) {
  const db = getDb(guildId);
  return await db.run('DELETE FROM team_lines WHERE id = ?', [lineId]);
}

module.exports = {
  getForwardLines,
  getDefensePairs,
  getSpecialTeamsLines,
  getGoalieRotation,
  setForwardLine,
  setDefensePair,
  setSpecialTeamsLine,
  setGoalieRotation,
  deleteLine
};