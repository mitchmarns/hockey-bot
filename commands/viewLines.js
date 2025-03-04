// View Lines command handler
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const linesModel = require('../database/models/linesModel');

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
    
    // Add forward lines
    if (forwardLines.length > 0) {
      let forwardLinesText = '';
      forwardLines.forEach(line => {
        forwardLinesText += `**Line ${line.line_number}**\n`;
        forwardLinesText += `LW: ${line.left_wing_name || 'Not Set'} (#${line.left_wing_number || '?'})\n`;
        forwardLinesText += `C: ${line.center_name || 'Not Set'} (#${line.center_number || '?'})\n`;
        forwardLinesText += `RW: ${line.right_wing_name || 'Not Set'} (#${line.right_wing_number || '?'})\n\n`;
      });
      
      embed.addFields({ name: 'Forward Lines', value: forwardLinesText });
    }
    
    // Add defense pairs
    if (defensePairs.length > 0) {
      let defensePairsText = '';
      defensePairs.forEach(pair => {
        defensePairsText += `**Pair ${pair.line_number}**\n`;
        defensePairsText += `LD: ${pair.defense1_name || 'Not Set'} (#${pair.defense1_number || '?'})\n`;
        defensePairsText += `RD: ${pair.defense2_name || 'Not Set'} (#${pair.defense2_number || '?'})\n\n`;
      });
      
      embed.addFields({ name: 'Defense Pairs', value: defensePairsText });
    }
    
    // Add power play units
    if (powerplayUnits.length > 0) {
      let ppText = '';
      powerplayUnits.forEach(unit => {
        ppText += `**Unit ${unit.line_number}**\n`;
        
        // For PP, we usually have 3 forwards and 2 defensemen or 4 forwards and 1 defenseman
        if (unit.center_name) ppText += `${unit.center_name} (#${unit.center_number || '?'})\n`;
        if (unit.left_wing_name) ppText += `${unit.left_wing_name} (#${unit.left_wing_number || '?'})\n`;
        if (unit.right_wing_name) ppText += `${unit.right_wing_name} (#${unit.right_wing_number || '?'})\n`;
        if (unit.defense1_name) ppText += `${unit.defense1_name} (#${unit.defense1_number || '?'})\n`;
        if (unit.defense2_name) ppText += `${unit.defense2_name} (#${unit.defense2_number || '?'})\n\n`;
      });
      
      embed.addFields({ name: 'Power Play Units', value: ppText });
    }
    
    // Add penalty kill units
    if (penaltyKillUnits.length > 0) {
      let pkText = '';
      penaltyKillUnits.forEach(unit => {
        pkText += `**Unit ${unit.line_number}**\n`;
        
        // For PK, we usually have 2 forwards and 2 defensemen
        if (unit.center_name) pkText += `${unit.center_name} (#${unit.center_number || '?'})\n`;
        if (unit.left_wing_name) pkText += `${unit.left_wing_name} (#${unit.left_wing_number || '?'})\n`;
        if (unit.right_wing_name) pkText += `${unit.right_wing_name} (#${unit.right_wing_number || '?'})\n`;
        if (unit.defense1_name) pkText += `${unit.defense1_name} (#${unit.defense1_number || '?'})\n`;
        if (unit.defense2_name) pkText += `${unit.defense2_name} (#${unit.defense2_number || '?'})\n\n`;
      });
      
      embed.addFields({ name: 'Penalty Kill Units', value: pkText });
    }
    
    // Add goalie rotation
    if (goalieRotation) {
      let goalieText = '';
      
      if (goalieRotation.starter_name) {
        goalieText += `**Starter:** ${goalieRotation.starter_name} (#${goalieRotation.starter_number || '?'})\n`;
      }
      
      if (goalieRotation.backup_name) {
        goalieText += `**Backup:** ${goalieRotation.backup_name} (#${goalieRotation.backup_number || '?'})\n`;
      }
      
      if (goalieRotation.third_string_name) {
        goalieText += `**Third String:** ${goalieRotation.third_string_name} (#${goalieRotation.third_string_number || '?'})\n`;
      }
      
      if (goalieText) {
        embed.addFields({ name: 'Goalie Rotation', value: goalieText });
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