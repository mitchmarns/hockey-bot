// Edit Character command handler
const { EmbedBuilder } = require('discord.js');
const characterModel = require('../database/models/characterModel');
const teamModel = require('../database/models/teamModel');

async function editCharacter(interaction) {
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
        content: 'You can only edit characters you created.', 
        ephemeral: true 
      });
    }

    // Collect all the potential updates
    const updates = {};
    const changedFields = [];

    // Basic fields that all characters can have updated
    const teamName = interaction.options.getString('team');
    if (teamName) {
      const team = await teamModel.getTeamByName(teamName, guildId);
      if (!team) {
        return interaction.reply(`Team "${teamName}" doesn't exist.`);
      }
      updates.team_id = team.id;
      changedFields.push(`Team → ${team.city} ${team.name}`);
    }

    const job = interaction.options.getString('job');
    if (job) {
      updates.job = job;
      changedFields.push(`Job → ${job}`);
    }

    const bio = interaction.options.getString('bio');
    if (bio) {
      updates.biography = bio;
      changedFields.push(`Biography → Updated`);
    }

    const image = interaction.options.getString('image');
    if (image) {
      updates.image_url = image;
      changedFields.push(`Image → Updated`);
    }

    const faceClaim = interaction.options.getString('faceclaim');
    if (faceClaim) {
      updates.face_claim = faceClaim;
      changedFields.push(`Face Claim → ${faceClaim}`);
    }

    // Player-specific fields
    if (character.character_type === 'player') {
      const position = interaction.options.getString('position');
      if (position) {
        updates.position = position;
        changedFields.push(`Position → ${position.replace(/_/g, ' ')}`);
      }

      const jersey = interaction.options.getInteger('jersey');
      if (jersey) {
        updates.jersey_number = jersey;
        changedFields.push(`Jersey # → ${jersey}`);
      }

      const height = interaction.options.getString('height');
      if (height) {
        updates.height = height;
        changedFields.push(`Height → ${height}`);
      }

      const weight = interaction.options.getString('weight');
      if (weight) {
        updates.weight = weight;
        changedFields.push(`Weight → ${weight}`);
      }
    }

    // Coach-specific fields
    if (character.character_type === 'coach') {
      const specialty = interaction.options.getString('specialty');
      if (specialty) {
        updates.specialty = specialty;
        changedFields.push(`Specialty → ${specialty}`);
      }

      const experience = interaction.options.getString('experience');
      if (experience) {
        updates.experience = experience;
        changedFields.push(`Experience → ${experience}`);
      }
    }

    // Check if any updates were provided
    if (Object.keys(updates).length === 0) {
      return interaction.reply('No changes specified. Please provide at least one field to update.');
    }

    // Update the character
    await characterModel.updateCharacter(character.id, updates, guildId);

    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle(`Character Updated: ${character.name}`)
      .setDescription(`Successfully updated ${character.name} (${character.character_type})`)
      .addFields(
        { name: 'Changes Made', value: changedFields.join('\n') }
      )
      .setTimestamp();

    if (character.image_url || updates.image_url) {
      embed.setThumbnail(updates.image_url || character.image_url);
    }

    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in editCharacter command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = editCharacter;
