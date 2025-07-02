// Team lines-related database operations - Updated for character system compatibility
const { getDb } = require('../db');

// Improved query to work with both character and player tables
async function getForwardLines(teamId, guildId) {
  const db = getDb(guildId);
  
  try {
    // First attempt using the new characters table
    return await db.all(`
      SELECT l.*, 
        c1.name as center_name, c1.jersey_number as center_number,
        c2.name as left_wing_name, c2.jersey_number as left_wing_number,
        c3.name as right_wing_name, c3.jersey_number as right_wing_number
      FROM team_lines l
      LEFT JOIN characters c1 ON l.center_id = c1.id
      LEFT JOIN characters c2 ON l.left_wing_id = c2.id
      LEFT JOIN characters c3 ON l.right_wing_id = c3.id
      WHERE l.team_id = ? AND l.line_type = 'forward'
      ORDER BY l.line_number
    `, [teamId]);
  } catch (error) {
    console.log('Error querying with characters table, falling back to players:', error);
    
    // Fallback to players table for backward compatibility
    try {
      return await db.all(`
        SELECT l.*, 
          p1.name as center_name, p1.number as center_number,
          p2.name as left_wing_name, p2.number as left_wing_number,
          p3.name as right_wing_name, p3.number as right_wing_number
        FROM team_lines l
        LEFT JOIN players p1 ON l.center_id = p1.id
        LEFT JOIN players p2 ON l.left_wing_id = p2.id
        LEFT JOIN players p3 ON l.right_wing_id = p3.id
        WHERE l.team_id = ? AND l.line_type = 'forward'
        ORDER BY l.line_number
      `, [teamId]);
    } catch (fallbackError) {
      console.error('Both queries failed:', fallbackError);
      return [];
    }
  }
}

// Improved query to work with both character and player tables
async function getDefensePairs(teamId, guildId) {
  const db = getDb(guildId);
  
  try {
    // First attempt using the new characters table
    return await db.all(`
      SELECT l.*, 
        c1.name as defense1_name, c1.jersey_number as defense1_number,
        c2.name as defense2_name, c2.jersey_number as defense2_number
      FROM team_lines l
      LEFT JOIN characters c1 ON l.defense1_id = c1.id
      LEFT JOIN characters c2 ON l.defense2_id = c2.id
      WHERE l.team_id = ? AND l.line_type = 'defense'
      ORDER BY l.line_number
    `, [teamId]);
  } catch (error) {
    console.log('Error querying with characters table, falling back to players:', error);
    
    // Fallback to players table for backward compatibility
    try {
      return await db.all(`
        SELECT l.*, 
          p1.name as defense1_name, p1.number as defense1_number,
          p2.name as defense2_name, p2.number as defense2_number
        FROM team_lines l
        LEFT JOIN players p1 ON l.defense1_id = p1.id
        LEFT JOIN players p2 ON l.defense2_id = p2.id
        WHERE l.team_id = ? AND l.line_type = 'defense'
        ORDER BY l.line_number
      `, [teamId]);
    } catch (fallbackError) {
      console.error('Both queries failed:', fallbackError);
      return [];
    }
  }
}

// Improved query to work with both character and player tables
async function getSpecialTeamsLines(teamId, lineType, guildId) {
  const db = getDb(guildId);
  
  try {
    // First attempt using the new characters table
    return await db.all(`
      SELECT l.*, 
        c1.name as center_name, c1.jersey_number as center_number,
        c2.name as left_wing_name, c2.jersey_number as left_wing_number,
        c3.name as right_wing_name, c3.jersey_number as right_wing_number,
        c4.name as defense1_name, c4.jersey_number as defense1_number,
        c5.name as defense2_name, c5.jersey_number as defense2_number
      FROM team_lines l
      LEFT JOIN characters c1 ON l.center_id = c1.id
      LEFT JOIN characters c2 ON l.left_wing_id = c2.id
      LEFT JOIN characters c3 ON l.right_wing_id = c3.id
      LEFT JOIN characters c4 ON l.defense1_id = c4.id
      LEFT JOIN characters c5 ON l.defense2_id = c5.id
      WHERE l.team_id = ? AND l.line_type = ?
      ORDER BY l.line_number
    `, [teamId, lineType]);
  } catch (error) {
    console.log('Error querying with characters table, falling back to players:', error);
    
    // Fallback to players table for backward compatibility
    try {
      return await db.all(`
        SELECT l.*, 
          p1.name as center_name, p1.number as center_number,
          p2.name as left_wing_name, p2.number as left_wing_number,
          p3.name as right_wing_name, p3.number as right_wing_number,
          p4.name as defense1_name, p4.number as defense1_number,
          p5.name as defense2_name, p5.number as defense2_number
        FROM team_lines l
        LEFT JOIN players p1 ON l.center_id = p1.id
        LEFT JOIN players p2 ON l.left_wing_id = p2.id
        LEFT JOIN players p3 ON l.right_wing_id = p3.id
        LEFT JOIN players p4 ON l.defense1_id = p4.id
        LEFT JOIN players p5 ON l.defense2_id = p5.id
        WHERE l.team_id = ? AND l.line_type = ?
        ORDER BY l.line_number
      `, [teamId, lineType]);
    } catch (fallbackError) {
      console.error('Both queries failed:', fallbackError);
      return [];
    }
  }
}

// Improved query to work with both character and player tables
async function getGoalieRotation(teamId, guildId) {
  const db = getDb(guildId);
  
  try {
    // First attempt using the new characters table
    return await db.get(`
      SELECT gr.*,
        c1.name as starter_name, c1.jersey_number as starter_number,
        c2.name as backup_name, c2.jersey_number as backup_number,
        c3.name as third_string_name, c3.jersey_number as third_string_number
      FROM goalie_rotation gr
      LEFT JOIN characters c1 ON gr.starter_id = c1.id
      LEFT JOIN characters c2 ON gr.backup_id = c2.id
      LEFT JOIN characters c3 ON gr.third_string_id = c3.id
      WHERE gr.team_id = ?
    `, [teamId]);
  } catch (error) {
    console.log('Error querying with characters table, falling back to players:', error);
    
    // Fallback to players table for backward compatibility
    try {
      return await db.get(`
        SELECT gr.*,
          p1.name as starter_name, p1.number as starter_number,
          p2.name as backup_name, p2.number as backup_number,
          p3.name as third_string_name, p3.number as third_string_number
        FROM goalie_rotation gr
        LEFT JOIN players p1 ON gr.starter_id = p1.id
        LEFT JOIN players p2 ON gr.backup_id = p2.id
        LEFT JOIN players p3 ON gr.third_string_id = p3.id
        WHERE gr.team_id = ?
      `, [teamId]);
    } catch (fallbackError) {
      console.error('Both queries failed:', fallbackError);
      return null;
    }
  }
}

// Set a forward line - unchanged as it just needs IDs
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

// Set a defense pair - unchanged as it just needs IDs
async function setDefensePair(teamId, pairNumber, defense1Id, defense2Id, coachUserId, guildId) {
  const db = getDb(guildId);
  
  // Check if defense pair already exists
  const existingPair = await db.get(
    'SELECT id FROM team_lines WHERE team_id = ? AND line_type = ? AND line_number = ?',
    [teamId, 'defense', pairNumber]
  );
  
  if (existingPair) {
    // Update existing pair
    return await db.run(
      `UPDATE team_lines 
       SET defense1_id = ?, defense2_id = ?, last_updated_by = ?, updated_at = CURRENT_TIMESTAMP
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

// Set a special teams unit (powerplay or penalty kill) - unchanged as it just needs IDs
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

// Set goalie rotation - unchanged as it just needs IDs
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