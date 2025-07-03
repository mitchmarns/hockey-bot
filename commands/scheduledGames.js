const { EmbedBuilder } = require('discord.js');
const gameModel = require('../database/models/gameModel');
const teamModel = require('../database/models/teamModel');
const seasonModel = require('../database/models/seasonModel');

// Import simulation helpers
const {
  getCharacterWithSkills,
  getTeamPlayers,
  calculateTeamStrength,
  simulateGameScore,
  selectGoalScorer,
  selectAssist
} = require('./simulateGameHelpers');

async function scheduledGames(interaction) {
  try {
    const action = interaction.options.getString('action') || 'list';
    const gameId = interaction.options.getInteger('gameid');
    const guildId = interaction.guildId;

    if (action === 'list') {
      // List all upcoming scheduled games
      const upcomingGames = await gameModel.getUpcomingGames(guildId);
      
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Scheduled Games')
        .setTimestamp();

      if (upcomingGames.length === 0) {
        embed.setDescription('No games are currently scheduled.');
      } else {
        let gamesList = '';
        for (const game of upcomingGames) {
          gamesList += `**Game ID: ${game.id}**\n`;
          gamesList += `${game.home_team_city} ${game.home_team_name} vs ${game.away_team_city} ${game.away_team_name}\n`;
          gamesList += `${game.scheduled_date} at ${game.scheduled_time}\n`;
          if (game.is_playoff_game) {
            gamesList += `*Playoff Game*\n`;
          }
          gamesList += `\n`;
        }
        
        embed.setDescription(gamesList);
        embed.addFields({
          name: 'How to Play',
          value: 'Use `/scheduledgames action:play gameid:[ID]` to simulate a scheduled game'
        });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'play') {
      if (!gameId) {
        return interaction.reply({
          content: 'Please provide a game ID to play. Use `/scheduledgames action:list` to see available games.',
          ephemeral: true
        });
      }

      // Get the scheduled game
      const upcomingGames = await gameModel.getUpcomingGames(guildId);
      const scheduledGame = upcomingGames.find(g => g.id === gameId);

      if (!scheduledGame) {
        return interaction.reply({
          content: 'Game not found or already played.',
          ephemeral: true
        });
      }

      // Start simulation
      await interaction.deferReply();

      // Get teams
      const homeTeam = await teamModel.getTeamById(scheduledGame.home_team_id, guildId);
      const awayTeam = await teamModel.getTeamById(scheduledGame.away_team_id, guildId);

      // Simulate the game using existing simulation logic
      const result = await simulateScheduledGame(scheduledGame, homeTeam, awayTeam, guildId);

      await interaction.editReply({ embeds: [result.embed] });
    }

  } catch (error) {
    console.error('Error in scheduledGames command:', error);
    
    if (interaction.deferred) {
      return interaction.editReply({
        content: `An error occurred: ${error.message}`
      });
    } else {
      return interaction.reply({
        content: `An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  }
}

async function simulateScheduledGame(scheduledGame, homeTeam, awayTeam, guildId) {
  // Get players for both teams
  let homePlayers = await getTeamPlayers(homeTeam.id, guildId);
  let awayPlayers = await getTeamPlayers(awayTeam.id, guildId);
  
  if (homePlayers.length < 6 || awayPlayers.length < 6) {
    throw new Error('Both teams need at least 6 players to simulate a game.');
  }
  
  // Fetch skills for each player
  homePlayers = await Promise.all(homePlayers.map(player => getCharacterWithSkills(player, guildId)));
  awayPlayers = await Promise.all(awayPlayers.map(player => getCharacterWithSkills(player, guildId)));

  // Calculate team strengths
  const homeStrength = calculateTeamStrength(homePlayers);
  const awayStrength = calculateTeamStrength(awayPlayers);
  
  // Simulate game scores
  const { homeScore, awayScore } = simulateGameScore(homeStrength, awayStrength);
  
  // Update team records
  if (homeScore > awayScore) {
    await teamModel.updateTeamRecord(homeTeam.id, 'win', guildId);
    await teamModel.updateTeamRecord(awayTeam.id, 'loss', guildId);
  } else if (awayScore > homeScore) {
    await teamModel.updateTeamRecord(awayTeam.id, 'win', guildId);
    await teamModel.updateTeamRecord(homeTeam.id, 'loss', guildId);
  } else {
    await teamModel.updateTeamRecord(homeTeam.id, 'tie', guildId);
    await teamModel.updateTeamRecord(awayTeam.id, 'tie', guildId);
  }

  // Update the scheduled game to mark it as played
  const db = require('../database/db').getDb(guildId);
  await db.run(
    'UPDATE games SET is_played = 1, home_score = ?, away_score = ?, played_at = CURRENT_TIMESTAMP WHERE id = ?',
    [homeScore, awayScore, scheduledGame.id]
  );

  // Generate scoring events and stats (simplified version)
  const scoreEvents = [];
  
  // Generate goal events for home team
  const homeSkaters = homePlayers.filter(p => p.position !== 'goalie');
  for (let i = 0; i < homeScore; i++) {
    const scorer = selectGoalScorer(homeSkaters);
    const assist = Math.random() > 0.3 ? selectAssist(homeSkaters, scorer.id) : null;
    
    const period = Math.min(3, Math.floor(i / 2) + 1);
    const minute = Math.floor(Math.random() * 20) + 1;
    const second = Math.floor(Math.random() * 60);
    const timeString = `${period}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    
    scoreEvents.push({
      team: homeTeam.name,
      scorer: scorer.name,
      assist: assist ? assist.name : null,
      time: timeString
    });
  }
  
  // Generate goal events for away team
  const awaySkaters = awayPlayers.filter(p => p.position !== 'goalie');
  for (let i = 0; i < awayScore; i++) {
    const scorer = selectGoalScorer(awaySkaters);
    const assist = Math.random() > 0.3 ? selectAssist(awaySkaters, scorer.id) : null;
    
    const period = Math.min(3, Math.floor(i / 2) + 1);
    const minute = Math.floor(Math.random() * 20) + 1;
    const second = Math.floor(Math.random() * 60);
    const timeString = `${period}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    
    scoreEvents.push({
      team: awayTeam.name,
      scorer: scorer.name,
      assist: assist ? assist.name : null,
      time: timeString
    });
  }

  // Sort score events by time
  scoreEvents.sort((a, b) => {
    const [aPeriod, aMin, aSec] = a.time.split(':').map(Number);
    const [bPeriod, bMin, bSec] = b.time.split(':').map(Number);
    
    if (aPeriod !== bPeriod) return aPeriod - bPeriod;
    if (aMin !== bMin) return aMin - bMin;
    return aSec - bSec;
  });

  // Get updated team records
  const updatedHomeTeam = await teamModel.getTeamById(homeTeam.id, guildId);
  const updatedAwayTeam = await teamModel.getTeamById(awayTeam.id, guildId);

  // Create result embed
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Game Result: ${homeTeam.city} ${homeTeam.name} vs ${awayTeam.city} ${awayTeam.name}`)
    .setDescription(`Final Score: ${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}`)
    .addFields(
      { name: 'Scheduled Date', value: `${scheduledGame.scheduled_date} at ${scheduledGame.scheduled_time}`, inline: true },
      { name: 'Game Type', value: scheduledGame.is_playoff_game ? 'Playoff' : 'Regular Season', inline: true },
      { name: 'Team Records', value: 
        `${homeTeam.name}: ${updatedHomeTeam.wins}-${updatedHomeTeam.losses}-${updatedHomeTeam.ties}\n` +
        `${awayTeam.name}: ${updatedAwayTeam.wins}-${updatedAwayTeam.losses}-${updatedAwayTeam.ties}`
      }
    )
    .setTimestamp();

  // Add scoring summary if there are goals
  if (scoreEvents.length > 0) {
    let scoringSummary = '';
    for (const event of scoreEvents) {
      scoringSummary += `${event.time} - ${event.team}: ${event.scorer}` + 
        (event.assist ? ` (Assist: ${event.assist})` : ' (Unassisted)') + '\n';
    }
    embed.addFields({ name: 'Scoring Summary', value: scoringSummary });
  }

  return { embed };
}

module.exports = scheduledGames;
