// Set Lines command handler - Updated for character system compatibility
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const characterModel = require('../database/models/characterModel');
const coachModel = require('../database/models/coachModel');
const linesModel = require('../database/models/linesModel');

async function setLines(interaction) {
  try {
    const teamName = interaction.options.getString('team');
    const lineType = interaction.options.getString('linetype');
    const lineNumber = interaction.options.getInteger('number');
    const player1Name = interaction.options.getString('player1');
    const player2Name = interaction.options.getString('player2');
    const player3Name = interaction.options.getString('player3') || null;
    const player4Name = interaction.options.getString('player4') || null;
    const player5Name = interaction.options.getString('player5') || null;
    const guildId = interaction.guildId;
    
    // Find team
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return interaction.reply(`Team "${teamName}" doesn't exist.`);
    }
    
    // Check if the user is a coach for this team
    const isCoach = await coachModel.isUserCoachForTeam(interaction.user.id, team.id, guildId);
    if (!isCoach) {
      return interaction.reply({ 
        content: `You must be a coach for the ${team.city} ${team.name} to set lines.`, 
        ephemeral: true 
      });
    }
    
    // Process different line types
    let updateResult;
    
    if (lineType === 'forward') {
      // Get character IDs for the forward line
      const player1 = await getCharacterIfValid(player1Name, team.id, 'center', guildId);
      const player2 = await getCharacterIfValid(player2Name, team.id, 'left_wing', guildId);
      const player3 = await getCharacterIfValid(player3Name, team.id, 'right_wing', guildId);
      
      if (!player1 || !player2 || !player3) {
        return interaction.reply('One or more players not found or not in the correct position.');
      }
      
      // Set the forward line
      updateResult = await linesModel.setForwardLine(
        team.id, 
        lineNumber, 
        player1.id, 
        player2.id, 
        player3.id, 
        interaction.user.id,
        guildId
      );
    } 
    else if (lineType === 'defense') {
      // Get character IDs for the defense pair
      const player1 = await getCharacterIfValid(player1Name, team.id, 'defenseman', guildId);
      const player2 = await getCharacterIfValid(player2Name, team.id, 'defenseman', guildId);
      
      if (!player1 || !player2) {
        return interaction.reply('One or more players not found or not in the correct position.');
      }
      
      // Set the defense pair
      updateResult = await linesModel.setDefensePair(
        team.id, 
        lineNumber, 
        player1.id, 
        player2.id, 
        interaction.user.id,
        guildId
      );
    } 
    else if (lineType === 'powerplay' || lineType === 'penalty_kill') {
      // For special teams, we need all 5 players
      if (!player1Name || !player2Name || !player3Name || !player4Name || !player5Name) {
        return interaction.reply(`${lineType.charAt(0).toUpperCase() + lineType.slice(1).replace('_', ' ')} unit requires all 5 players to be specified.`);
      }
      
      // Get all players - for special teams, position restrictions are more flexible
      const player1 = await getCharacterIfOnTeam(player1Name, team.id, guildId);
      const player2 = await getCharacterIfOnTeam(player2Name, team.id, guildId);
      const player3 = await getCharacterIfOnTeam(player3Name, team.id, guildId);
      const player4 = await getCharacterIfOnTeam(player4Name, team.id, guildId);
      const player5 = await getCharacterIfOnTeam(player5Name, team.id, guildId);
      
      if (!player1 || !player2 || !player3 || !player4 || !player5) {
        return interaction.reply('One or more players not found or not on this team.');
      }
      
      // Set the special teams unit
      updateResult = await linesModel.setSpecialTeamsLine(
        team.id, 
        lineType, 
        lineNumber, 
        player1.id, 
        player2.id, 
        player3.id, 
        player4.id, 
        player5.id, 
        interaction.user.id,
        guildId
      );
    }
    else if (lineType === 'goalie') {
      // Get character IDs for the goalie rotation
      const starter = await getCharacterIfValid(player1Name, team.id, 'goalie', guildId);
      
      // Backup and third string are optional
      let backup = null;
      let thirdString = null;
      
      if (player2Name) {
        backup = await getCharacterIfValid(player2Name, team.id, 'goalie', guildId);
        if (!backup) {
          return interaction.reply(`Player "${player2Name}" is not a goalie on this team.`);
        }
      }
      
      if (player3Name) {
        thirdString = await getCharacterIfValid(player3Name, team.id, 'goalie', guildId);
        if (!thirdString) {
          return interaction.reply(`Player "${player3Name}" is not a goalie on this team.`);
        }
      }
      
      if (!starter) {
        return interaction.reply(`Player "${player1Name}" is not a goalie on this team.`);
      }
      
      // Set the goalie rotation
      updateResult = await linesModel.setGoalieRotation(
        team.id, 
        starter.id, 
        backup ? backup.id : null, 
        thirdString ? thirdString.id : null, 
        interaction.user.id,
        guildId
      );
    }
    else {
      return interaction.reply(`Invalid line type: ${lineType}`);
    }
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Lines Updated: ${team.city} ${team.name}`)
      .setTimestamp();
    
    // Format different line types for the embed
    if (lineType === 'forward') {
      embed.setDescription(`Forward Line ${lineNumber} has been updated.`);
      embed.addFields(
        { name: 'Left Wing', value: player2Name, inline: true },
        { name: 'Center', value: player1Name, inline: true },
        { name: 'Right Wing', value: player3Name, inline: true }
      );
    } 
    else if (lineType === 'defense') {
      embed.setDescription(`Defense Pair ${lineNumber} has been updated.`);
      embed.addFields(
        { name: 'Left Defense', value: player1Name, inline: true },
        { name: 'Right Defense', value: player2Name, inline: true }
      );
    }
    else if (lineType === 'powerplay' || lineType === 'penalty_kill') {
      const unitName = lineType === 'powerplay' ? 'Power Play' : 'Penalty Kill';
      embed.setDescription(`${unitName} Unit ${lineNumber} has been updated.`);
      embed.addFields(
        { name: 'Players', value: `${player1Name}\n${player2Name}\n${player3Name}\n${player4Name}\n${player5Name}` }
      );
    }
    else if (lineType === 'goalie') {
      embed.setDescription(`Goalie rotation has been updated.`);
      embed.addFields(
        { name: 'Starter', value: player1Name, inline: true }
      );
      
      if (player2Name) {
        embed.addFields({ name: 'Backup', value: player2Name, inline: true });
      }
      
      if (player3Name) {
        embed.addFields({ name: 'Third String', value: player3Name, inline: true });
      }
    }
    
    // Add team logo if available
    if (team.logo) {
      embed.setThumbnail(team.logo);
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in setLines command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

// Helper function to get a character if they're on the team and in the correct position
async function getCharacterIfValid(characterName, teamId, position, guildId) {
  if (!characterName) return null;
  
  try {
    // First try the new character model
    const character = await characterModel.getCharacterByName(characterName, guildId);
    
    if (character) {
      // Check if this is a player character on the right team with the right position
      if (character.character_type === 'player' && 
          character.team_id === teamId && 
          character.position === position) {
        return character;
      }
      
      return null;
    }
    
    // Fallback to old player model for backward compatibility
    const playerModel = require('../database/models/playerModel');
    const player = await playerModel.getPlayerByName(characterName, guildId);
    
    if (player && player.team_id === teamId && player.position === position) {
      return player;
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding character ${characterName}:`, error);
    return null;
  }
}

// Helper function to get a character if they're on the team (position doesn't matter)
async function getCharacterIfOnTeam(characterName, teamId, guildId) {
  if (!characterName) return null;
  
  try {
    // First try the new character model
    const character = await characterModel.getCharacterByName(characterName, guildId);
    
    if (character) {
      // Check if this is a player character on the right team
      if (character.character_type === 'player' && character.team_id === teamId) {
        return character;
      }
      
      return null;
    }
    
    // Fallback to old player model for backward compatibility
    const playerModel = require('../database/models/playerModel');
    const player = await playerModel.getPlayerByName(characterName, guildId);
    
    if (player && player.team_id === teamId) {
      return player;
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding character ${characterName}:`, error);
    return null;
  }
}

module.exports = setLines;