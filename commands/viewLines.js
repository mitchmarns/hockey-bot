// View Lines command handler - Updated for character system compatibility
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const linesModel = require('../database/models/linesModel');
const characterModel = require('../database/models/characterModel');

async function viewLines(interaction) {
  try {
    const teamName = interaction.options.getString('team');
    const guildId = interaction.guildId;
    
    // Find team
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return interaction.reply(`Team "${teamName}" doesn't exist.`);
    }
    
    // Get all line types
    const forwardLines = await linesModel.getForwardLines(team.id, guildId);
    const defensePairs = await linesModel.getDefensePairs(team.id, guildId);
    const powerplayUnits = await linesModel.getSpecialTeamsLines(team.id, 'powerplay', guildId);
    const penaltyKillUnits = await linesModel.getSpecialTeamsLines(team.id, 'penalty_kill', guildId);
    const goalieRotation = await linesModel.getGoalieRotation(team.id, guildId);
    
    if (forwardLines.length === 0 && defensePairs.length === 0 && 
        powerplayUnits.length === 0 && penaltyKillUnits.length === 0 && !goalieRotation) {
      return interaction.reply(`The ${team.city} ${team.name} have no lines set up yet. A coach can set them with /setlines.`);
    }
    
    // Create embed for response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Team Lines: ${team.city} ${team.name}`)
      .setDescription(`Current line combinations for the ${team.city} ${team.name}`)
      .setTimestamp();
    
    // Add team logo if available
    if (team.logo) {
      embed.setThumbnail(team.logo);
    }
    
    // Process forward lines - handle null values that may exist in older entries
    if (forwardLines.length > 0) {
      let forwardLinesText = '';
      for (const line of forwardLines) {
        // Skip incomplete lines
        if (!line.left_wing_name && !line.center_name && !line.right_wing_name) {
          continue;
        }
        
        forwardLinesText += `**Line ${line.line_number}**\n`;
        forwardLinesText += `LW: ${line.left_wing_name || 'Not Set'} ${line.left_wing_number ? `(#${line.left_wing_number})` : ''}\n`;
        forwardLinesText += `C: ${line.center_name || 'Not Set'} ${line.center_number ? `(#${line.center_number})` : ''}\n`;
        forwardLinesText += `RW: ${line.right_wing_name || 'Not Set'} ${line.right_wing_number ? `(#${line.right_wing_number})` : ''}\n\n`;
      }
      
      // Only add if there are valid forward lines
      if (forwardLinesText) {
        embed.addFields({ name: '# Forward Lines', value: forwardLinesText });
      }
    }
    
    // Process defense pairs - handle null values that may exist in older entries
    if (defensePairs.length > 0) {
      let defensePairsText = '';
      for (const pair of defensePairs) {
        // Skip incomplete pairs
        if (!pair.defense1_name && !pair.defense2_name) {
          continue;
        }
        
        defensePairsText += `**Pair ${pair.line_number}**\n`;
        defensePairsText += `LD: ${pair.defense1_name || 'Not Set'} ${pair.defense1_number ? `(#${pair.defense1_number})` : ''}\n`;
        defensePairsText += `RD: ${pair.defense2_name || 'Not Set'} ${pair.defense2_number ? `(#${pair.defense2_number})` : ''}\n\n`;
      }
      
      // Only add if there are valid defense pairs
      if (defensePairsText) {
        embed.addFields({ name: '# Defense Pairs', value: defensePairsText });
      }
    }
    
    // Process power play units - handle null values that may exist in older entries
    if (powerplayUnits.length > 0) {
      let ppText = '';
      for (const unit of powerplayUnits) {
        // Check if this unit has any players
        const hasPlayers = unit.center_name || unit.left_wing_name || unit.right_wing_name || 
                         unit.defense1_name || unit.defense2_name;
                         
        if (!hasPlayers) continue;
        
        ppText += `**Unit ${unit.line_number}**\n`;
        
        // For PP, we usually have 3 forwards and 2 defensemen or 4 forwards and 1 defenseman
        if (unit.center_name) ppText += `${unit.center_name} ${unit.center_number ? `(#${unit.center_number})` : ''}\n`;
        if (unit.left_wing_name) ppText += `${unit.left_wing_name} ${unit.left_wing_number ? `(#${unit.left_wing_number})` : ''}\n`;
        if (unit.right_wing_name) ppText += `${unit.right_wing_name} ${unit.right_wing_number ? `(#${unit.right_wing_number})` : ''}\n`;
        if (unit.defense1_name) ppText += `${unit.defense1_name} ${unit.defense1_number ? `(#${unit.defense1_number})` : ''}\n`;
        if (unit.defense2_name) ppText += `${unit.defense2_name} ${unit.defense2_number ? `(#${unit.defense2_number})` : ''}\n\n`;
      }
      
      // Only add if there are valid power play units
      if (ppText) {
        embed.addFields({ name: '# Power Play Units', value: ppText });
      }
    }
    
    // Process penalty kill units - handle null values that may exist in older entries
    if (penaltyKillUnits.length > 0) {
      let pkText = '';
      for (const unit of penaltyKillUnits) {
        // Check if this unit has any players
        const hasPlayers = unit.center_name || unit.left_wing_name || unit.right_wing_name || 
                         unit.defense1_name || unit.defense2_name;
                         
        if (!hasPlayers) continue;
        
        pkText += `**Unit ${unit.line_number}**\n`;
        
        // For PK, we usually have 2 forwards and 2 defensemen
        if (unit.center_name) pkText += `${unit.center_name} ${unit.center_number ? `(#${unit.center_number})` : ''}\n`;
        if (unit.left_wing_name) pkText += `${unit.left_wing_name} ${unit.left_wing_number ? `(#${unit.left_wing_number})` : ''}\n`;
        if (unit.right_wing_name) pkText += `${unit.right_wing_name} ${unit.right_wing_number ? `(#${unit.right_wing_number})` : ''}\n`;
        if (unit.defense1_name) pkText += `${unit.defense1_name} ${unit.defense1_number ? `(#${unit.defense1_number})` : ''}\n`;
        if (unit.defense2_name) pkText += `${unit.defense2_name} ${unit.defense2_number ? `(#${unit.defense2_number})` : ''}\n\n`;
      }
      
      // Only add if there are valid penalty kill units
      if (pkText) {
        embed.addFields({ name: '# Penalty Kill Units', value: pkText });
      }
    }
    
    // Process goalie rotation - handle null values that may exist in older entries
    if (goalieRotation) {
      let goalieText = '';
      
      if (goalieRotation.starter_name) {
        goalieText += `**Starter:** ${goalieRotation.starter_name} ${goalieRotation.starter_number ? `(#${goalieRotation.starter_number})` : ''}\n`;
      }
      
      if (goalieRotation.backup_name) {
        goalieText += `**Backup:** ${goalieRotation.backup_name} ${goalieRotation.backup_number ? `(#${goalieRotation.backup_number})` : ''}\n`;
      }
      
      if (goalieRotation.third_string_name) {
        goalieText += `**Third String:** ${goalieRotation.third_string_name} ${goalieRotation.third_string_number ? `(#${goalieRotation.third_string_number})` : ''}\n`;
      }
      
      if (goalieText) {
        embed.addFields({ name: '# Goalie Rotation', value: goalieText });
      }
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in viewLines command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = viewLines;