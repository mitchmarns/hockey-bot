// Create Character command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const characterModel = require('../database/models/characterModel');

async function createCharacter(interaction) {
  try {
    await interaction.deferReply();
    
    // Get basic character information from command options
    const name = interaction.options.getString('name');
    const charType = interaction.options.getString('type');
    const teamName = interaction.options.getString('team');
    const job = interaction.options.getString('job');
    const biography = interaction.options.getString('bio') || null;
    const imageUrl = interaction.options.getString('image') || null;
    const faceClaim = interaction.options.getString('faceclaim') || null;
    const guildId = interaction.guildId;
    
    // Validate required fields
    if (!name || !charType || !teamName) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Missing Required Fields',
            'Name, type, and team are required.'
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

    // Check for duplicate character name
    if (await characterModel.getCharacterByName?.(name, guildId)) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Duplicate Name',
            `A character named "${name}" already exists.`
          )
        ]
      });
    }

    // Use team color for embed if available
    const embedColor = team.team_color || '#0099ff';
    
    // Create base character data object
    const characterData = {
      name,
      charType,
      teamId: team.id,
      job,
      userId: interaction.user.id,
      biography,
      imageUrl,
      faceClaim,
      guildId
    };
    
    // Add player-specific data if character is a player
    if (charType === 'player') {
      characterData.position = interaction.options.getString('position');
      characterData.jerseyNumber = interaction.options.getInteger('jersey');
      characterData.height = interaction.options.getString('height');
      characterData.weight = interaction.options.getString('weight');
    }
    
    // Add coach-specific data if character is a coach
    if (charType === 'coach') {
      characterData.specialty = interaction.options.getString('specialty');
      characterData.experience = interaction.options.getString('experience');
    }
    
    // Create the character with all relevant fields
    await characterModel.createCharacter(characterData);

    // Format fields for readability
    function formatField(val) {
      return val ? val.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
    }
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('New Character Created')
      .setDescription(`${name} has been created as a ${charType}!`)
      .addFields(
        { name: 'Name', value: name, inline: true },
        { name: 'Type', value: charType.charAt(0).toUpperCase() + charType.slice(1), inline: true },
        { name: 'Team', value: `${team.city} ${team.name}`, inline: true }
      )
      .setTimestamp();
    
    // Add type-specific fields to embed
    if (charType === 'player') {
      if (job) embed.addFields({ name: 'Job', value: job, inline: true });
      if (characterData.position) embed.addFields({ name: 'Position', value: characterData.position.replace(/_/g, ' '), inline: true });
      if (characterData.jerseyNumber) embed.addFields({ name: 'Jersey #', value: characterData.jerseyNumber.toString(), inline: true });
      if (characterData.height) embed.addFields({ name: 'Height', value: characterData.height, inline: true });
      if (characterData.weight) embed.addFields({ name: 'Weight', value: characterData.weight, inline: true });
    } else if (charType === 'coach') {
      if (job) embed.addFields({ name: 'Job', value: job, inline: true });
      if (characterData.specialty) embed.addFields({ name: 'Specialty', value: characterData.specialty, inline: true });
      if (characterData.experience) embed.addFields({ name: 'Experience', value: characterData.experience, inline: true });
    } else {
      embed.addFields({ name: 'Job', value: job, inline: true });
    }
    
    // Add face claim if provided
    if (faceClaim) {
      embed.addFields({ name: 'Face Claim', value: faceClaim, inline: true });
    }
    
    // Add biography if provided
    if (biography) {
      embed.addFields({ name: 'Biography', value: biography.length > 1024 ? biography.substring(0, 1021) + '...' : biography });
    }
    
    // Add character image if provided
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      embed.setThumbnail(imageUrl);
    }
    
    return await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in createCharacter command:', error);
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

module.exports = createCharacter;