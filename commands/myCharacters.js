// My Characters command handler
const { EmbedBuilder } = require('discord.js');
const characterModel = require('../database/models/characterModel');

async function myCharacters(interaction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    
    // Get all characters owned by the user
    const characters = await characterModel.getCharactersByUser(userId, guildId);
    
    if (characters.length === 0) {
      return interaction.reply({ 
        content: 'You haven\'t created any characters yet.', 
        ephemeral: true 
      });
    }
    
    // Group characters by type
    const playerCharacters = characters.filter(c => c.character_type === 'player');
    const coachCharacters = characters.filter(c => c.character_type === 'coach');
    const staffCharacters = characters.filter(c => c.character_type === 'staff');
    const civilianCharacters = characters.filter(c => c.character_type === 'civilian');
    
    // Create embed for user characters
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Your Characters')
      .setDescription(`You have created ${characters.length} character(s).`)
      .setTimestamp();
    
    // Add players section if there are players
    if (playerCharacters.length > 0) {
      const playerList = playerCharacters.map(p => {
        return `**${p.name}** - ${p.team_city} ${p.team_name} ${p.position ? `(${p.position.replace(/_/g, ' ')})` : ''}`;
      }).join('\n');
      
      embed.addFields({ name: '👤 Players', value: playerList });
    }
    
    // Add coaches section if there are coaches
    if (coachCharacters.length > 0) {
      const coachList = coachCharacters.map(c => {
        return `**${c.name}** - ${c.team_city} ${c.team_name} ${c.job ? `(${c.job})` : ''}`;
      }).join('\n');
      
      embed.addFields({ name: '📋 Coaches', value: coachList });
    }
    
    // Add staff section if there are staff
    if (staffCharacters.length > 0) {
      const staffList = staffCharacters.map(s => {
        return `**${s.name}** - ${s.team_city} ${s.team_name} ${s.job ? `(${s.job})` : ''}`;
      }).join('\n');
      
      embed.addFields({ name: '🧰 Staff', value: staffList });
    }
    
    // Add civilians section if there are civilians
    if (civilianCharacters.length > 0) {
      const civilianList = civilianCharacters.map(c => {
        return `**${c.name}** - ${c.team_city} ${c.team_name} ${c.job ? `(${c.job})` : ''}`;
      }).join('\n');
      
      embed.addFields({ name: '🏙️ Civilians', value: civilianList });
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
  } catch (error) {
    console.error('Error in myCharacters command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = myCharacters;