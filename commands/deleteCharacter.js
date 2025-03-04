// Delete Character command handler
const { EmbedBuilder } = require('discord.js');
const characterModel = require('../database/models/characterModel');

async function deleteCharacter(interaction) {
  try {
    const characterName = interaction.options.getString('name');
    const guildId = interaction.guildId;
    
    // Find character
    const character = await characterModel.getCharacterByName(characterName, guildId);
    
    if (!character) {
      return interaction.reply(`Character "${characterName}" doesn't exist.`);
    }
    
    // Check if the user is the one who created the character
    if (character.user_id !== interaction.user.id) {
      return interaction.reply({ 
        content: 'You can only remove characters you created.', 
        ephemeral: true 
      });
    }

    // Create confirmation embed with character info
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(`Removing Character: ${character.name}`)
      .setDescription(`${character.name} (${character.character_type.charAt(0).toUpperCase() + character.character_type.slice(1)})`)
      .addFields(
        { name: 'Team', value: character.team_city + ' ' + character.team_name, inline: true },
        { name: 'Role', value: character.role, inline: true }
      );
      
    if (character.image_url) {
      embed.setThumbnail(character.image_url);
    }
    
    embed.setFooter({ text: 'Character has been permanently removed' });
    
    // Delete character
    await characterModel.deleteCharacter(character.id, guildId);
    
    // Reply with confirmation
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in deleteCharacter command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = deleteCharacter;