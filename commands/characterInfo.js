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
    
    // Create hockey card style embed
    const embed = new EmbedBuilder()
      .setTimestamp();
    
    // Different styling based on character type
    if (character.character_type === 'player') {
      // Player card styling - use hockey colors
      embed
        .setColor('#C8102E') // Hockey red
        .setTitle(`🏒 ${character.name.toUpperCase()}`)
        .setDescription(`**${character.team_city?.toUpperCase() || ''} ${character.team_name?.toUpperCase() || ''}**`);
      
      // Main player info section
      const playerInfo = [];
      if (character.position) {
        const pos = character.position.replace(/_/g, ' ').toUpperCase();
        playerInfo.push(`**POS:** ${pos}`);
      }
      if (character.jersey_number) {
        playerInfo.push(`**#${character.jersey_number}**`);
      }
      if (character.height) {
        playerInfo.push(`**HT:** ${character.height}`);
      }
      if (character.weight) {
        playerInfo.push(`**WT:** ${character.weight}`);
      }
      
      if (playerInfo.length > 0) {
        embed.addFields({ 
          name: '📊 PLAYER INFO', 
          value: playerInfo.join('  •  '), 
          inline: false 
        });
      }
      
      // Career stats section (if available)
      if (character.games_played || character.goals || character.assists) {
        const stats = [];
        if (character.games_played) stats.push(`**GP:** ${character.games_played}`);
        if (character.goals) stats.push(`**G:** ${character.goals}`);
        if (character.assists) stats.push(`**A:** ${character.assists}`);
        if (character.goals && character.assists) {
          stats.push(`**PTS:** ${character.goals + character.assists}`);
        }
        
        if (stats.length > 0) {
          embed.addFields({ 
            name: '🎯 CAREER STATS', 
            value: stats.join('  •  '), 
            inline: false 
          });
        }
      }
      
    } else if (character.character_type === 'coach') {
      // Coach card styling
      embed
        .setColor('#003087') // Professional blue
        .setTitle(`👔 COACH ${character.name.toUpperCase()}`)
        .setDescription(`**${character.team_city?.toUpperCase() || ''} ${character.team_name?.toUpperCase() || ''}**`);
      
      // Coach info section
      const coachInfo = [];
      if (character.job) coachInfo.push(`**ROLE:** ${character.job.toUpperCase()}`);
      if (character.specialty) coachInfo.push(`**SPECIALTY:** ${character.specialty}`);
      if (character.experience) coachInfo.push(`**EXPERIENCE:** ${character.experience}`);
      
      if (coachInfo.length > 0) {
        embed.addFields({ 
          name: '📋 COACHING INFO', 
          value: coachInfo.join('\n'), 
          inline: false 
        });
      }
      
    } else {
      // Staff/Civilian card styling
      embed
        .setColor('#FFB81C') // Gold/yellow for staff
        .setTitle(`👤 ${character.name.toUpperCase()}`)
        .setDescription(`**${character.team_city?.toUpperCase() || ''} ${character.team_name?.toUpperCase() || ''}**`);
      
      if (character.job) {
        embed.addFields({ 
          name: '💼 ROLE', 
          value: `**${character.job.toUpperCase()}**`, 
          inline: false 
        });
      }
    }
    
    // Personal details section (for all character types)
    const personalDetails = [];
    if (character.face_claim) {
      personalDetails.push(`**FACE CLAIM:** ${character.face_claim}`);
    }
    
    if (personalDetails.length > 0) {
      embed.addFields({ 
        name: '👨‍🦱 PERSONAL', 
        value: personalDetails.join('\n'), 
        inline: false 
      });
    }
    
    // Biography section
    if (character.biography) {
      const bio = character.biography.length > 200 ? 
        character.biography.substring(0, 197) + '...' : 
        character.biography;
      
      embed.addFields({ 
        name: '📝 BIOGRAPHY', 
        value: bio, 
        inline: false 
      });
    }
    
    // Add character image as main image (hockey card style)
    if (character.image_url) {
      embed.setThumbnail(character.image_url);
    }
    
    // Add footer with character type
    embed.setFooter({ 
      text: `${character.character_type.charAt(0).toUpperCase() + character.character_type.slice(1)} Card • Created by ${interaction.user.username}` 
    });
    
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