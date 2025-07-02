// Schedule Game command handler (Updated for seasons and multi-server support)
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const gameModel = require('../database/models/gameModel');
const seasonModel = require('../database/models/seasonModel');

async function scheduleGame(interaction) {
  try {
    const homeTeamName = interaction.options.getString('hometeam');
    const awayTeamName = interaction.options.getString('awayteam');
    const date = interaction.options.getString('date');
    const time = interaction.options.getString('time');
    const isPlayoff = interaction.options.getBoolean('playoff') || false;
    const guildId = interaction.guildId;
    
    // Validate input data
    if (!homeTeamName || !awayTeamName || !date || !time) {
      return interaction.reply({
        content: 'Missing required parameters. Please provide home team, away team, date, and time.',
        ephemeral: true
      });
    }
    
    console.log(`Scheduling game: ${homeTeamName} vs ${awayTeamName} on ${date} at ${time}`);
    
    // Find teams - use more robust team finding
    const homeTeam = await teamModel.getTeamByName(homeTeamName, guildId);
    const awayTeam = await teamModel.getTeamByName(awayTeamName, guildId);
    
    console.log('Teams found:', { homeTeam, awayTeam });
    
    if (!homeTeam || !awayTeam) {
      return interaction.reply('One or both teams don\'t exist. Please check the team names and try again.');
    }
    
    // Validate date format (simple validation)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!dateRegex.test(date) || !timeRegex.test(time)) {
      return interaction.reply('Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time.');
    }
    
    // Check for active season
    let activeSeason;
    try {
      activeSeason = await seasonModel.getActiveSeason(guildId);
    } catch (error) {
      console.error('Error checking active season:', error);
      // Continue without season if there's an error
    }
    
    // If no active season but trying to schedule a playoff game
    if (isPlayoff && (!activeSeason || !activeSeason.playoffs_started)) {
      return interaction.reply('Cannot schedule a playoff game: either there is no active season or playoffs haven\'t started yet.');
    }
    
    // Schedule the game
    try {
      if (activeSeason) {
        console.log('Scheduling game with season context:', activeSeason.id);
        // Schedule the game with season context
        await gameModel.scheduleGameWithSeason(
          homeTeam.id, 
          awayTeam.id, 
          date, 
          time,
          activeSeason.id,
          isPlayoff,
          guildId
        );
      } else {
        console.log('Scheduling game without season context');
        // Schedule the game without season context (legacy support)
        await gameModel.scheduleGame(
          homeTeam.id,
          awayTeam.id,
          date,
          time,
          guildId
        );
      }
    } catch (dbError) {
      console.error('Database error scheduling game:', dbError);
      return interaction.reply({
        content: `Error scheduling game: ${dbError.message}. This might be due to database schema issues.`,
        ephemeral: true
      });
    }
    
    // Create response embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(isPlayoff ? 'Playoff Game Scheduled' : 'Game Scheduled')
      .setDescription(`${homeTeam.city} ${homeTeam.name} vs ${awayTeam.city} ${awayTeam.name}`)
      .addFields(
        { name: 'Date', value: date, inline: true },
        { name: 'Time', value: time, inline: true },
        { name: 'Type', value: isPlayoff ? 'Playoff Game' : 'Regular Season Game', inline: true }
      )
      .setTimestamp();
    
    // Add season info if available
    if (activeSeason) {
      embed.addFields({ name: 'Season', value: activeSeason.name, inline: true });
    }
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in scheduleGame command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = scheduleGame;