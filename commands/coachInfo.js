// Coach Info command handler
const { EmbedBuilder } = require('discord.js');
const coachModel = require('../database/models/coachModel');

async function coachInfo(interaction) {
  try {
    const coachName = interaction.options.getString('name');
    const guildId = interaction.guildId;
    
    // Find coach
    const coach = await coachModel.getCoachByName(coachName, guildId);
    
    if (!coach) {
      return interaction.reply(`Coach "${coachName}" doesn't exist.`);
    }
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#8dd2f0')
      .setTitle(`Coach Profile: ${coach.name}`)
      .setDescription(`${coach.coach_type.charAt(0).toUpperCase() + coach.coach_type.slice(1)} Coach of the ${coach.team_city} ${coach.team_name}`)
      .addFields(
        { name: 'Name', value: coach.name, inline: true },
        { name: 'Team', value: coach.team_id ? `${coach.team_city} ${coach.team_name}` : 'No Team', inline: true },
        { name: 'Position', value: coach.coach_type.charAt(0).toUpperCase() + coach.coach_type.slice(1) + ' Coach', inline: true }
      )
      .setTimestamp();
    
    // Add face claim if available
    if (coach.face_claim) {
      embed.addFields({ name: 'Face Claim', value: coach.face_claim, inline: true });
    }
    
    // Add biography if available
    if (coach.biography) {
      embed.addFields({ name: 'Biography', value: coach.biography });
    }
    
    // Add coach image if available
    if (coach.image_url) {
      embed.setThumbnail(coach.image_url);
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in coachInfo command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = coachInfo;