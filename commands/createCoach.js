// Create Coach command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const coachModel = require('../database/models/coachModel');

async function createCoach(interaction) {
  try {
    // Defer the reply first to give more time for processing
    await interaction.deferReply();
    
    const name = interaction.options.getString('name');
    const teamName = interaction.options.getString('team');
    const coachType = interaction.options.getString('type') || 'head';
    const imageUrl = interaction.options.getString('image') || null;
    const biography = interaction.options.getString('bio') || null;
    const guildId = interaction.guildId;
    
    // Find team
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return await interaction.editReply(`Team "${teamName}" doesn't exist.`);
    }
    
    // Check if a head coach already exists for this team (if creating a head coach)
    if (coachType === 'head') {
      const coaches = await coachModel.getCoachesByTeamId(team.id, guildId);
      const headCoach = coaches.find(c => c.coach_type === 'head');
      
      if (headCoach) {
        return await interaction.editReply(`${team.city} ${team.name} already has a head coach: ${headCoach.name}. You can create an assistant coach instead.`);
      }
    }
    
    // Create the coach
    await coachModel.createCoach(
      name,
      team.id,
      interaction.user.id,
      coachType,
      imageUrl,
      biography,
      guildId
    );
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('New Coach Created')
      .setDescription(`${name} has been hired as the ${coachType} coach of the ${team.city} ${team.name}!`)
      .addFields(
        { name: 'Name', value: name, inline: true },
        { name: 'Team', value: `${team.city} ${team.name}`, inline: true },
        { name: 'Position', value: coachType.charAt(0).toUpperCase() + coachType.slice(1) + ' Coach', inline: true }
      )
      .setTimestamp();
    
    // Add biography if provided
    if (biography) {
      embed.addFields({ name: 'Biography', value: biography });
    }
    
    // Add coach image if provided
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      embed.setThumbnail(imageUrl);
    }
    
    // Use editReply instead of reply since we deferred earlier
    return await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in createCoach command:', error);
    
    // Check if interaction has been replied to or deferred
    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({ 
          content: `An error occurred: ${error.message}`
        });
      } else if (!interaction.replied) {
        await interaction.reply({ 
          content: `An error occurred: ${error.message}`, 
          ephemeral: true 
        });
      }
    } catch (followUpError) {
      console.error('Error sending error message:', followUpError);
    }
  }
}

module.exports = createCoach;