const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');

async function setTeamColor(interaction) {
  try {
    const teamName = interaction.options.getString('team');
    const color = interaction.options.getString('color');
    const guildId = interaction.guildId;
    
    // Find team
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return interaction.reply(`Team "${teamName}" doesn't exist.`);
    }
    
    // Validate color format
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return interaction.reply('Invalid color format. Use hex format like #FF0000 or #F00');
    }
    
    // Update team color
    await teamModel.updateTeamColor(team.id, color, guildId);
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Team Color Updated')
      .setDescription(`${team.city} ${team.name} team color has been updated!`)
      .addFields(
        { name: 'Team', value: `${team.city} ${team.name}`, inline: true },
        { name: 'New Color', value: color, inline: true }
      )
      .setTimestamp();
    
    // Add team logo if available
    if (team.logo) {
      embed.setThumbnail(team.logo);
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in setTeamColor command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = setTeamColor;
