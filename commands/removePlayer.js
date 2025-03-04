const { EmbedBuilder } = require('discord.js');
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');
const phoneModel = require('../database/models/phoneModel');

async function removePlayer(interaction) {
  try {
    const playerName = interaction.options.getString('name');
    const guildId = interaction.guildId;
    
    // Find player
    const player = await playerModel.getPlayerByName(playerName, guildId);
    
    if (!player) {
      return interaction.reply(`Player "${playerName}" doesn't exist.`);
    }
    
    // Check if the user is the one who created the player
    if (player.user_id !== interaction.user.id) {
      return interaction.reply({ 
        content: 'You can only remove players you created.', 
        ephemeral: true 
      });
    }

    // Get player's phone to display in confirmation
    const phone = await phoneModel.getPlayerPhone(player.id, guildId);
    
    // Create confirmation embed with player info
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(`Removing Player: ${player.name}`)
      .setDescription(`${player.name} (#${player.number}) - ${player.position.replace('_', ' ')}`)
      .addFields(
        { name: 'Team', value: player.team_name || 'No Team', inline: true },
        { name: 'Games Played', value: player.games_played.toString(), inline: true },
        { name: 'Points', value: `${player.goals + player.assists} (${player.goals}G, ${player.assists}A)`, inline: true }
      );
      
    if (phone) {
      embed.addFields({ name: 'Phone Number', value: phone.phone_number, inline: true });
    }
    
    if (player.image_url) {
      embed.setThumbnail(player.image_url);
    }
    
    embed.setFooter({ text: 'Player has been permanently removed' });
    
    // Delete player and all related data
    await playerModel.deletePlayer(player.id, guildId);
    
    // Reply with confirmation
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in removePlayer command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = removePlayer;