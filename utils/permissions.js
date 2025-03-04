// utils/permissions.js
// Permissions checking utilities

/**
 * Check if a member has administrator permissions
 * @param {GuildMember} member - Discord guild member
 * @returns {boolean} - True if member has admin permissions
 */
function hasAdminPermission(member) {
  return member.permissions.has('ADMINISTRATOR');
}

/**
 * Check if a member is a server moderator
 * @param {GuildMember} member - Discord guild member
 * @returns {boolean} - True if member has moderator role
 */
function isServerModerator(member) {
  return member.permissions.has('MODERATE_MEMBERS') || 
         member.roles.cache.some(role => 
           role.name.toLowerCase().includes('mod') || 
           role.name.toLowerCase().includes('admin')
         );
}

/**
 * Check if a user owns a player
 * @param {Player} player - Player object
 * @param {string} userId - Discord user ID
 * @returns {boolean} - True if user owns the player
 */
function isPlayerOwner(player, userId) {
  return player && player.user_id === userId;
}

/**
 * Check if a user owns a team (if team has an owner field)
 * @param {Team} team - Team object
 * @param {string} userId - Discord user ID
 * @returns {boolean} - True if user owns the team
 */
function isTeamOwner(team, userId) {
  return team && team.owner_id === userId;
}

module.exports = {
  hasAdminPermission,
  isServerModerator,
  isPlayerOwner,
  isTeamOwner
};