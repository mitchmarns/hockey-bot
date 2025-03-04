// Update playerInfo.js to display face claim
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');
const { createPlayerEmbed } = require('../utils/embedBuilder');

async function playerInfo(interaction) {
  const playerName = interaction.options.getString('name');
  const guildId = interaction.guildId;
  
  // Find player
  const player = await playerModel.getPlayerByName(playerName, guildId);
  
  if (!player) {
    return interaction.reply(`Player "${playerName}" doesn't exist.`);
  }

  // Get player skills
  const skills = await skillsModel.getPlayerSkills(player.id, guildId);
  
  // Create and send player embed
  const embed = createPlayerEmbed(player, skills);
  
  // Add face claim if available (this is added here since we don't want to modify the utility function)
  if (player.face_claim) {
    // Find where to insert the face claim field - typically after the basic info
    const fieldsCount = embed.data.fields.length;
    
    // Insert face claim after position, before stats
    if (fieldsCount >= 2) {
      // Create a new array of fields with face claim inserted at position 2
      const updatedFields = [
        ...embed.data.fields.slice(0, 2),
        { name: 'Face Claim', value: player.face_claim, inline: true },
        ...embed.data.fields.slice(2)
      ];
      
      // Replace the fields array
      embed.data.fields = updatedFields;
    } else {
      // If there aren't enough fields, just add it
      embed.addFields({ name: 'Face Claim', value: player.face_claim, inline: true });
    }
  }
  
  await interaction.reply({ embeds: [embed] });
}

module.exports = playerInfo;