// Create Coach command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const coachModel = require('../database/models/coachModel');

async function createCoach(interaction) {
  try {
    await interaction.deferReply();
    
    const name = interaction.options.getString('name');
    const teamName = interaction.options.getString('team');
    const coachType = interaction.options.getString('type') || 'head';
    const imageUrl = interaction.options.getString('image') || null;
    const biography = interaction.options.getString('bio') || null;
    const faceClaim = interaction.options.getString('faceclaim') || null;
    const guildId = interaction.guildId;

    // Validate required fields
    if (!name || !teamName) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Missing Required Fields',
            'Coach name and team are required.'
          )
        ]
      });
    }

    // Validate image URL format
    if (imageUrl && !/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(imageUrl)) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Invalid Image URL',
            'Image URL must be a valid link to an image.'
          )
        ]
      });
    }
    
    // Find team
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Team Not Found',
            `Team "${teamName}" doesn't exist.`
          )
        ]
      });
    }

    // Check for duplicate coach name
    const existingCoach = await coachModel.getCoachByName(name, guildId);
    if (existingCoach && existingCoach.team_id === team.id) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Duplicate Name',
            `A coach named "${name}" already exists for this team.`
          )
        ]
      });
    }

    // Check if a head coach already exists for this team (if creating a head coach)
    if (coachType === 'head') {
      const coaches = await coachModel.getCoachesByTeamId(team.id, guildId);
      const headCoach = coaches.find(c => c.coach_type === 'head');
      if (headCoach) {
        return await interaction.editReply({
          embeds: [
            require('../utils/embedBuilder').createErrorEmbed(
              'Head Coach Exists',
              `${team.city} ${team.name} already has a head coach: ${headCoach.name}. You can create an assistant coach instead.`
            )
          ]
        });
      }
    }

    // Use team color for embed if available
    const embedColor = team.team_color || '#0099ff';
    
    // Create the coach
    await coachModel.createCoach(
      name,
      team.id,
      interaction.user.id,
      coachType,
      imageUrl,
      biography,
      faceClaim,
      guildId
    );

    // Format fields for readability
    function formatField(val) {
      return val ? val.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
    }
    
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
    
    // Add face claim if provided
    if (faceClaim) {
      embed.addFields({ name: 'Face Claim', value: faceClaim, inline: true });
    }
    
    // Add biography if provided
    if (biography) {
      embed.addFields({ name: 'Biography', value: biography });
    }
    
    // Add coach image if provided
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      embed.setThumbnail(imageUrl);
    }
    
    return await interaction.editReply({ embeds: [embed] });
    
  
  } catch (error) {
    console.error('Error in createCoach command:', error);
    await interaction.editReply({
      embeds: [
        require('../utils/embedBuilder').createErrorEmbed(
          'Error',
          `An error occurred: ${error.message}`
        )
      ]
    });
  }
}

module.exports = createCoach;