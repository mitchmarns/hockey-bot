// Coaching Staff command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const coachModel = require('../database/models/coachModel');

async function coachingStaff(interaction) {
  try {
    const teamName = interaction.options.getString('team');
    const guildId = interaction.guildId;
    
    // Find team
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return interaction.reply(`Team "${teamName}" doesn't exist.`);
    }
    
    // Get all coaches for this team
    const coaches = await coachModel.getCoachesByTeamId(team.id, guildId);
    
    if (coaches.length === 0) {
      return interaction.reply(`The ${team.city} ${team.name} have no coaching staff. Add coaches with /createcoach.`);
    }
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Coaching Staff: ${team.city} ${team.name}`)
      .setDescription(`Complete coaching staff for the ${team.city} ${team.name}`)
      .setTimestamp();
    
    // Add team logo if available
    if (team.logo) {
      embed.setThumbnail(team.logo);
    }
    
    // Group coaches by type
    const headCoaches = coaches.filter(c => c.coach_type === 'head');
    const assistantCoaches = coaches.filter(c => c.coach_type === 'assistant');
    const goalieCoaches = coaches.filter(c => c.coach_type === 'goalie');
    const otherCoaches = coaches.filter(c => !['head', 'assistant', 'goalie'].includes(c.coach_type));
    
    // Add head coaches
    if (headCoaches.length > 0) {
      const headCoachInfo = headCoaches.map(c => `${c.name}${c.image_url ? ' 🖼️' : ''}`).join('\n');
      embed.addFields({ name: 'Head Coach', value: headCoachInfo });
    } else {
      embed.addFields({ name: 'Head Coach', value: 'Position Vacant' });
    }
    
    // Add assistant coaches
    if (assistantCoaches.length > 0) {
      const assistantCoachInfo = assistantCoaches.map(c => `${c.name}${c.image_url ? ' 🖼️' : ''}`).join('\n');
      embed.addFields({ name: 'Assistant Coaches', value: assistantCoachInfo });
    }
    
    // Add goalie coaches
    if (goalieCoaches.length > 0) {
      const goalieCoachInfo = goalieCoaches.map(c => `${c.name}${c.image_url ? ' 🖼️' : ''}`).join('\n');
      embed.addFields({ name: 'Goalie Coaches', value: goalieCoachInfo });
    }
    
    // Add other coaching staff
    if (otherCoaches.length > 0) {
      const otherCoachInfo = otherCoaches.map(c => 
        `${c.name} (${c.coach_type.charAt(0).toUpperCase() + c.coach_type.slice(1)})${c.image_url ? ' 🖼️' : ''}`
      ).join('\n');
      embed.addFields({ name: 'Other Staff', value: otherCoachInfo });
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in coachingStaff command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = coachingStaff;