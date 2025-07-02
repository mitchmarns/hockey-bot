// Update playerInfo.js to display face claim
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');
const teamModel = require('../database/models/teamModel');
const { EmbedBuilder } = require('discord.js');

async function playerInfo(interaction) {
  const playerName = interaction.options.getString('name');
  const guildId = interaction.guildId;
  
  // Find player
  const player = await playerModel.getPlayerByName(playerName, guildId);
  
  if (!player) {
    return interaction.reply(`Player "${playerName}" doesn't exist.`);
  }

  // Get team data for color
  const team = player.team_id ? await teamModel.getTeamById(player.team_id, guildId) : null;
  
  // Get player skills
  const skills = await skillsModel.getPlayerSkills(player.id, guildId);
  
  // Use team color if available
  const embedColor = (team && team.team_color) ? team.team_color : '#0099ff';
  
  // Create hockey card style embed
  const embed = new EmbedBuilder()
    .setColor(embedColor) // Changed from hockey red
    .setTitle(`${player.name.toUpperCase()}`)
    .setDescription(`**${player.team_name?.toUpperCase() || 'FREE AGENT'}**`)
    .setTimestamp();
  
  // Main player info section
  const playerInfo = [];
  if (player.position) {
    const pos = player.position.replace(/_/g, ' ').toUpperCase();
    playerInfo.push(`**POS:** ${pos}`);
  }
  if (player.number) {
    playerInfo.push(`**#${player.number}**`);
  }
  
  embed.addFields({ 
    name: 'PLAYER INFO', 
    value: playerInfo.join('  •  '), 
    inline: false 
  });

  // Career stats section
  const totalPoints = (player.goals || 0) + (player.assists || 0);
  const stats = [
    `**GP:** ${player.games_played || 0}`,
    `**G:** ${player.goals || 0}`,
    `**A:** ${player.assists || 0}`,
    `**PTS:** ${totalPoints}`
  ];
  
  // Add position-specific stats
  if (player.position === 'goalie') {
    const saves = player.saves || 0;
    const goalsAgainst = player.goals_against || 0;
    const totalShots = saves + goalsAgainst;
    const savePercentage = totalShots > 0 ? ((saves / totalShots) * 100).toFixed(1) : '0.0';
    const gaa = player.games_played > 0 ? (goalsAgainst / player.games_played).toFixed(2) : '0.00';
    
    stats.length = 0; // Clear regular stats for goalies
    stats.push(
      `**GP:** ${player.games_played || 0}`,
      `**SV:** ${saves}`,
      `**GA:** ${goalsAgainst}`,
      `**SV%:** ${savePercentage}%`,
      `**GAA:** ${gaa}`,
      `**SO:** ${player.shutouts || 0}`
    );
  } else {
    // Add additional skater stats
    if (player.shots) stats.push(`**SOG:** ${player.shots}`);
    if (player.plus_minus !== undefined) stats.push(`**+/-:** ${player.plus_minus > 0 ? '+' : ''}${player.plus_minus}`);
    if (player.penalty_minutes) stats.push(`**PIM:** ${player.penalty_minutes}`);
  }
  
  embed.addFields({ 
    name: 'CAREER STATS', 
    value: stats.join('  •  '), 
    inline: false 
  });

  // Skills section
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
      name: 'SKILLS', 
      value: skillBars.join('\n'), 
      inline: false 
    });
  }
  
  // Personal details
  const personalDetails = [];
  if (player.face_claim) {
    personalDetails.push(`**FACE CLAIM:** ${player.face_claim}`);
  }
  
  if (personalDetails.length > 0) {
    embed.addFields({ 
      name: 'PERSONAL', 
      value: personalDetails.join('\n'), 
      inline: false 
    });
  }
  
  // Add player image
  if (player.image_url) {
    embed.setThumbnail(player.image_url);
  }
  
  // Add footer
  embed.setFooter({ 
    text: `Player Card • ${new Date().getFullYear()} Season` 
  });
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = playerInfo;