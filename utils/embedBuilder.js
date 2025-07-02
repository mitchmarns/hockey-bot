// Discord embed creation helpers
const { EmbedBuilder } = require('discord.js');

/**
 * Create a standard embed with consistent styling
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {string} color - Hex color code (default: #0099ff)
 * @param {boolean} timestamp - Whether to add timestamp (default: true)
 * @returns {EmbedBuilder} - Discord embed object
 */
function createEmbed(title, description, color = '#808080', timestamp = true) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description);
  
  if (timestamp) {
    embed.setTimestamp();
  }
  
  return embed;
}

/**
 * Create a success embed (green color)
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {string} [color='#808080'] 
 * @returns {EmbedBuilder} - Discord embed object
 */
function createSuccessEmbed(title, description, color) {
  return createEmbed(title, description, color);
}

/**
 * Create an error embed (red color)
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @returns {EmbedBuilder} - Discord embed object
 */
function createErrorEmbed(title, description) {
  return createEmbed(title, description, '#ff0000');
}

/**
 * Create a player info embed with enhanced hockey stats
 * @param {Object} player - Player data
 * @param {Object} skills - Player skills data 
 * @param {string} [color='#808080'] 
 * @returns {EmbedBuilder} - Discord embed object
 */
function createPlayerEmbed(player, skills = null) {
  const embed = createEmbed(
    `${player.name.toUpperCase()}`,
    `**${player.team_name?.toUpperCase() || 'FREE AGENT'}**`,
    '#0099ff' // Changed from hockey red to blue
  );
  
  // Main player info with better formatting
  const playerInfo = [];
  if (player.position) {
    const pos = player.position.replace(/_/g, ' ').toUpperCase();
    playerInfo.push(`**POS:** ${pos}`);
  }
  if (player.number) {
    playerInfo.push(`**#${player.number}**`);
  }
  
  embed.addFields({ 
    name: '# PLAYER INFO', 
    value: playerInfo.join('  •  '), 
    inline: false 
  });

  // Different stats based on position
  if (player.position === 'goalie') {
    // Goalie stats with hockey card formatting
    const saves = player.saves || 0;
    const goalsAgainst = player.goals_against || 0;
    const totalShots = saves + goalsAgainst;
    
    const savePercentage = totalShots > 0 ? 
      ((saves / totalShots) * 100).toFixed(1) : '0.0';
    
    const gaa = player.games_played > 0 ? 
      (goalsAgainst / player.games_played).toFixed(2) : '0.00';
    
    const goalieStats = [
      `**GP:** ${player.games_played || 0}`,
      `**SV:** ${saves}`,
      `**GA:** ${goalsAgainst}`,
      `**SV%:** ${savePercentage}%`,
      `**GAA:** ${gaa}`,
      `**SO:** ${player.shutouts || 0}`
    ];
    
    embed.addFields({ 
      name: '# GOALIE STATS', 
      value: goalieStats.join('  •  '), 
      inline: false 
    });
  } else {
    // Skater stats with hockey card formatting
    const totalPoints = (player.goals || 0) + (player.assists || 0);
    const skaterStats = [
      `**GP:** ${player.games_played || 0}`,
      `**G:** ${player.goals || 0}`,
      `**A:** ${player.assists || 0}`,
      `**PTS:** ${totalPoints}`
    ];
    
    // Additional stats
    if (player.shots) skaterStats.push(`**SOG:** ${player.shots}`);
    if (player.plus_minus !== undefined) {
      skaterStats.push(`**+/-:** ${player.plus_minus > 0 ? '+' : ''}${player.plus_minus}`);
    }
    if (player.penalty_minutes) skaterStats.push(`**PIM:** ${player.penalty_minutes}`);
    
    embed.addFields({ 
      name: '# PLAYER STATS', 
      value: skaterStats.join('  •  '), 
      inline: false 
    });
    
    // Add faceoff stats for centers
    if (player.position === 'center' && (player.faceoff_wins || player.faceoff_losses)) {
      const faceoffWins = player.faceoff_wins || 0;
      const faceoffLosses = player.faceoff_losses || 0;
      const totalFaceoffs = faceoffWins + faceoffLosses;
      const faceoffPct = totalFaceoffs > 0 ? ((faceoffWins / totalFaceoffs) * 100).toFixed(1) : '0.0';
      
      embed.addFields({ 
        name: '# FACEOFFS', 
        value: `**FO%:** ${faceoffPct}%  •  **W:** ${faceoffWins}  •  **L:** ${faceoffLosses}`, 
        inline: false 
      });
    }
  }

  // Add skills if provided with visual bars
  if (skills) {
    const skillBars = [];
    const skillNames = {
      skating: 'Skating',
      shooting: 'Shooting', 
      passing: 'Passing',
      defense: 'Defense',
      physical: 'Physical',
      goaltending: 'Goaltending'
    };
    
    Object.entries(skillNames).forEach(([key, name]) => {
      const value = skills[key] || 50;
      const bars = '█'.repeat(Math.floor(value / 10)) + '░'.repeat(10 - Math.floor(value / 10));
      skillBars.push(`${name}: ${bars} ${value}`);
    });
    
    embed.addFields({ 
      name: '# SKILLS', 
      value: skillBars.join('\n'), 
      inline: false 
    });
  }
  
  if (player.image_url) {
    embed.setThumbnail(player.image_url);
  }
  
  // Add hockey card footer
  embed.setFooter({ 
    text: `Player Card • ${new Date().getFullYear()} Season` 
  });
  
  return embed;
}

/**
 * Create a team info embed with enhanced hockey stats
 * @param {Object} team - Team data
 * @param {Array} roster - Team roster
 * @returns {EmbedBuilder} - Discord embed object
 */
function createTeamEmbed(team, roster = null) {
  const embed = createEmbed(
    `${team.city} ${team.name}`,
    `Record: ${team.wins}-${team.losses}-${team.ties} (${team.wins * 2 + team.ties} pts)`
  );
  
  // Add logo if available
  if (team.logo) {
    embed.setThumbnail(team.logo);
  }
  
  // Add team statistics
  const goalsFor = team.goals_for || 0;
  const goalsAgainst = team.goals_against || 0;
  const goalDiff = goalsFor - goalsAgainst;
  
  embed.addFields(
    { name: 'Goals For', value: goalsFor.toString(), inline: true },
    { name: 'Goals Against', value: goalsAgainst.toString(), inline: true },
    { name: 'Goal Diff', value: goalDiff > 0 ? `+${goalDiff}` : goalDiff.toString(), inline: true }
  );
  
  // Add shots and special teams stats if available
  const shotsFor = team.shots_for || 0;
  const shotsAgainst = team.shots_against || 0;
  
  if (shotsFor > 0 || shotsAgainst > 0) {
    embed.addFields(
      { name: 'Shots For', value: shotsFor.toString(), inline: true },
      { name: 'Shots Against', value: shotsAgainst.toString(), inline: true },
      { name: 'Shot Diff', value: (shotsFor - shotsAgainst) > 0 ? 
                             `+${shotsFor - shotsAgainst}` : 
                             (shotsFor - shotsAgainst).toString(), inline: true }
    );
  }
  
  // Add power play and penalty kill stats if available
  const powerPlays = team.power_plays || 0;
  const powerPlayGoals = team.power_play_goals || 0;
  const penalties = team.penalties || 0;
  const penaltyKillSuccess = team.penalty_kill_success || 0;
  
  if (powerPlays > 0 || penalties > 0) {
    const ppPercentage = powerPlays > 0 ? 
      ((powerPlayGoals / powerPlays) * 100).toFixed(1) : "0.0";
    
    const pkPercentage = penalties > 0 ? 
      ((penaltyKillSuccess / penalties) * 100).toFixed(1) : "0.0";
    
    embed.addFields(
      { name: 'Power Play', value: `${ppPercentage}% (${powerPlayGoals}/${powerPlays})`, inline: true },
      { name: 'Penalty Kill', value: `${pkPercentage}%`, inline: true },
      { name: 'PIM', value: (team.penalty_minutes || 0).toString(), inline: true }
    );
  }
  
  // Add home/away record if available
  const homeWins = team.home_wins || 0;
  const homeLosses = team.home_losses || 0;
  const awayWins = team.away_wins || 0; 
  const awayLosses = team.away_losses || 0;
  
  if (homeWins > 0 || homeLosses > 0 || awayWins > 0 || awayLosses > 0) {
    embed.addFields(
      { name: 'Home Record', value: `${homeWins}-${homeLosses}`, inline: true },
      { name: 'Away Record', value: `${awayWins}-${awayLosses}`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true }
    );
  }
  
  // Add roster if provided
  if (roster && roster.length > 0) {
    // Group players by position
    const goalies = roster.filter(p => p.position === 'goalie');
    const defensemen = roster.filter(p => p.position === 'defenseman');
    const centers = roster.filter(p => p.position === 'center');
    const leftWings = roster.filter(p => p.position === 'left_wing');
    const rightWings = roster.filter(p => p.position === 'right_wing');
    
    // Display goalies
    if (goalies.length > 0) {
      embed.addFields({
        name: 'Goalies',
        value: goalies.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: false
      });
    }
    
    // Display defensemen
    if (defensemen.length > 0) {
      embed.addFields({
        name: 'Defensemen',
        value: defensemen.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: false
      });
    }
    
    // Display forwards by position
    if (centers.length > 0) {
      embed.addFields({
        name: 'Centers',
        value: centers.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: true
      });
    }
    
    if (leftWings.length > 0) {
      embed.addFields({
        name: 'Left Wings',
        value: leftWings.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: true
      });
    }
    
    if (rightWings.length > 0) {
      embed.addFields({
        name: 'Right Wings',
        value: rightWings.map(p => `#${p.number} ${p.name}`).join('\n'),
        inline: true
      });
    }
  }
  
  return embed;
}

module.exports = {
  createEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createPlayerEmbed,
  createTeamEmbed
};