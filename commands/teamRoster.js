// Team Roster command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const characterModel = require('../database/models/characterModel');

async function teamRoster(interaction) {
  try {
    const teamName = interaction.options.getString('team');
    const filterType = interaction.options.getString('type') || 'all';
    const guildId = interaction.guildId;
    
    // Find team
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return interaction.reply(`Team "${teamName}" doesn't exist.`);
    }
    
    // Get characters for the team
    let characters;
    if (filterType === 'all') {
      characters = await characterModel.getCharactersByTeam(team.id, null, guildId);
    } else {
      characters = await characterModel.getCharactersByTeam(team.id, filterType, guildId);
    }
    
    if (characters.length === 0) {
      return interaction.reply(`No ${filterType !== 'all' ? filterType + 's' : 'characters'} found for the ${team.city} ${team.name}.`);
    }
    
    // Group characters by type
    const playerCharacters = characters.filter(c => c.character_type === 'player');
    const coachCharacters = characters.filter(c => c.character_type === 'coach');
    const staffCharacters = characters.filter(c => c.character_type === 'staff');
    const civilianCharacters = characters.filter(c => c.character_type === 'civilian');
    
    // Create embed for team roster
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${team.city} ${team.name} Roster`)
      .setDescription(`Total Characters: ${characters.length}`)
      .setTimestamp();
    
    // Add team logo if available
    if (team.logo) {
      embed.setThumbnail(team.logo);
    }
    
    // Add players section if there are players or if showing all types
    if ((playerCharacters.length > 0 && filterType === 'all') || filterType === 'player') {
      let playerList = playerCharacters.map(p => {
        let details = p.name;
        if (p.position || p.jersey_number) {
          details += ` (${[
            p.position ? p.position.replace(/_/g, ' ') : null,
            p.jersey_number ? `#${p.jersey_number}` : null
          ].filter(Boolean).join(', ')})`;
        }
        return details;
      }).join('\n');
      
      if (playerList.length > 1024) {
        playerList = playerList.substring(0, 1021) + '...';
      }
      
      if (playerList.length === 0) playerList = 'None';
      
      embed.addFields({ name: 'Players', value: playerList });
    }
    
    // Add coaches section if there are coaches or if showing all types
    if ((coachCharacters.length > 0 && filterType === 'all') || filterType === 'coach') {
      let coachList = coachCharacters.map(c => {
        let details = c.name;
        if (c.job) {
          details += ` (${c.job})`;
        }
        return details;
      }).join('\n');
      
      if (coachList.length > 1024) {
        coachList = coachList.substring(0, 1021) + '...';
      }
      
      if (coachList.length === 0) coachList = 'None';
      
      embed.addFields({ name: 'Coaches', value: coachList });
    }
    
    // Add staff section if there are staff or if showing all types
    if ((staffCharacters.length > 0 && filterType === 'all') || filterType === 'staff') {
      let staffList = staffCharacters.map(s => {
        let details = s.name;
        if (s.job) {
          details += ` (${s.job})`;
        }
        return details;
      }).join('\n');
      
      if (staffList.length > 1024) {
        staffList = staffList.substring(0, 1021) + '...';
      }
      
      if (staffList.length === 0) staffList = 'None';
      
      embed.addFields({ name: 'Staff', value: staffList });
    }
    
    // Add civilians section if there are civilians or if showing all types
    if ((civilianCharacters.length > 0 && filterType === 'all') || filterType === 'civilian') {
      let civilianList = civilianCharacters.map(c => {
        let details = c.name;
        if (c.job) {
          details += ` (${c.job})`;
        }
        return details;
      }).join('\n');
      
      if (civilianList.length > 1024) {
        civilianList = civilianList.substring(0, 1021) + '...';
      }
      
      if (civilianList.length === 0) civilianList = 'None';
      
      embed.addFields({ name: 'Civilians', value: civilianList });
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in teamRoster command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = teamRoster;