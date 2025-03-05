// Create Character command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const characterModel = require('../database/models/characterModel');

async function createCharacter(interaction) {
  try {
    console.log('Deferring reply...');
    // Defer reply to give more processing time
    await interaction.deferReply();
    console.log('Reply deferred.');
    
    // Get basic character information from command options
    const name = interaction.options.getString('name');
    const charType = interaction.options.getString('type');
    const teamName = interaction.options.getString('team');
    const job = interaction.options.getString('job');
    const biography = interaction.options.getString('bio') || null;
    const imageUrl = interaction.options.getString('image') || null;
    const faceClaim = interaction.options.getString('faceclaim') || null;
    const guildId = interaction.guildId;
    
    // Find team
    console.log(`Searching for team: ${teamName}`);
    const team = await teamModel.getTeamByName(teamName, guildId);
    console.log('Team found:', team);

    if (!team) {
      return await interaction.editReply(`Team "${teamName}" doesn't exist.`);
    }
    
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
    console.log('Creating character...');
    await characterModel.createCharacter(characterData);
    console.log('Character created!');
    
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
      if (characterData.position) embed.addFields({ name: 'Position', value: characterData.position, inline: true });
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
  }
}

module.exports = createCharacter;