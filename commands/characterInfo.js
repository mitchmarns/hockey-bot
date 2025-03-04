// Character Info command handler
const { EmbedBuilder } = require('discord.js');
const characterModel = require('../database/models/characterModel');

async function characterInfo(interaction) {
  try {
    const characterName = interaction.options.getString('name');
    const guildId = interaction.guildId;
    
    // Find character
    const character = await characterModel.getCharacterByName(characterName, guildId);
    
    if (!character) {
      return interaction.reply(`Character "${characterName}" not found.`);
    }
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Character Profile: ${character.name}`)
      .setDescription(`${character.character_type.charAt(0).toUpperCase() + character.character_type.slice(1)} for the ${character.team_city} ${character.team_name}`)
      .addFields(
        { name: 'Name', value: character.name, inline: true },
        { name: 'Team', value: character.team_id ? `${character.team_city} ${character.team_name}` : 'No Team', inline: true },
        { name: 'Role', value: character.role, inline: true }
      )
      .setTimestamp();
    
    // Add type-specific fields
    if (character.character_type === 'player') {
      if (character.position) embed.addFields({ name: 'Position', value: character.position, inline: true });
      if (character.jersey_number) embed.addFields({ name: 'Jersey #', value: character.jersey_number.toString(), inline: true });
      if (character.height) embed.addFields({ name: 'Height', value: character.height, inline: true });
      if (character.weight) embed.addFields({ name: 'Weight', value: character.weight, inline: true });
    } else if (character.character_type === 'coach') {
      if (character.specialty) embed.addFields({ name: 'Specialty', value: character.specialty, inline: true });
      if (character.experience) embed.addFields({ name: 'Experience', value: character.experience, inline: true });
    }
    
    // Add face claim if available
    if (character.face_claim) {
      embed.addFields({ name: 'Face Claim', value: character.face_claim, inline: true });
    }
    
    // Add biography if available
    if (character.biography) {
      embed.addFields({ name: 'Biography', value: character.biography });
    }
    
    // Add character image if available
    if (character.image_url) {
      embed.setThumbnail(character.image_url);
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in characterInfo command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = characterInfo;