// Simulate Game command handler - Fixed for compatibility with both character and player models
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const gameModel = require('../database/models/gameModel');
const seasonModel = require('../database/models/seasonModel');

// Import the updated helpers
const {
  getCharacterWithSkills,
  getTeamPlayers,
  calculateTeamStrength,
  simulateGameScore,
  selectGoalScorer,
  selectAssist
} = require('./simulateGameHelpers');

async function simulateGame(interaction) {
  try {
    const homeTeamName = interaction.options.getString('hometeam');
    const awayTeamName = interaction.options.getString('awayteam');
    const guildId = interaction.guildId;
    
    // Find teams
    const homeTeam = await teamModel.getTeamByName(homeTeamName, guildId);
    const awayTeam = await teamModel.getTeamByName(awayTeamName, guildId);
    
    if (!homeTeam || !awayTeam) {
      return interaction.reply('One or both teams don\'t exist.');
    }

    const isPlayoff = interaction.options.getBoolean('playoff') || false;

    // Check for active season
    const activeSeason = await seasonModel.getActiveSeason(guildId);
    if (!activeSeason) {
      return interaction.reply('There is no active season. Start a season first with /startseason.');
    }

    // If simulating a playoff game, check if playoffs have started
    if (isPlayoff && !activeSeason.playoffs_started) {
      return interaction.reply('Playoffs haven\'t started yet. Use /startplayoffs first.');
    }
    
    // Start with a "loading" message
    await interaction.deferReply();
    
    // Get players - using improved helper that works with both models
    let homePlayers = await getTeamPlayers(homeTeam.id, guildId);
    let awayPlayers = await getTeamPlayers(awayTeam.id, guildId);
    
    if (homePlayers.length < 6 || awayPlayers.length < 6) {
      return interaction.editReply('Both teams need at least 6 players to simulate a game.');
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
    
    // Create game record with season context
    const gameResult = await gameModel.recordGameResultWithSeason(
      homeTeam.id, 
      awayTeam.id, 
      homeScore, 
      awayScore,
      activeSeason.id,
      isPlayoff,
      guildId
    );

    // Initialize game stats
    const gameStats = {
      home: {
        shots: 0,
        hits: 0,
        blockedShots: 0,
        penaltyMinutes: 0
      },
      away: {
        shots: 0,
        hits: 0,
        blockedShots: 0,
        penaltyMinutes: 0
      }
    };
    
    // Store all game events
    const allEvents = [];
    const scoreEvents = [];
    
    // Generate hockey events for each period
    for (let period = 1; period <= 3; period++) {
      // Generate about 15-20 events per period for each team
      const homeEventsCount = Math.floor(Math.random() * 5) + 15;
      const awayEventsCount = Math.floor(Math.random() * 5) + 15;
      
      // Home team events
      for (let i = 0; i < homeEventsCount; i++) {
        const event = generateHockeyEvent(period, homePlayers, awayPlayers, true);
        allEvents.push(event);
        
        // Update stats based on event type
        switch (event.type) {
          case 'shot':
            gameStats.home.shots++;
            await updatePlayerStats(event.player.id, { shots: 1 }, guildId);
            break;
          case 'hit':
            gameStats.home.hits++;
            await updatePlayerStats(event.player.id, { hits: 1 }, guildId);
            break;
          case 'blocked_shot':
            gameStats.home.blockedShots++;
            await updatePlayerStats(event.player.id, { blocks: 1 }, guildId);
            break;
          case 'penalty':
            gameStats.home.penaltyMinutes += event.minutes;
            await updatePlayerStats(event.player.id, { penalty_minutes: event.minutes }, guildId);
            break;
        }
        
        // Record the event in the database
        await gameModel.recordGameEvent(
          gameResult.lastID,
          event.type,
          event.player.id,
          period,
          event.time,
          event.description,
          guildId
        );
      }
      
      // Away team events
      for (let i = 0; i < awayEventsCount; i++) {
        const event = generateHockeyEvent(period, homePlayers, awayPlayers, false);
        allEvents.push(event);
        
        // Update stats based on event type
        switch (event.type) {
          case 'shot':
            gameStats.away.shots++;
            await updatePlayerStats(event.player.id, { shots: 1 }, guildId);
            break;
          case 'hit':
            gameStats.away.hits++;
            await updatePlayerStats(event.player.id, { hits: 1 }, guildId);
            break;
          case 'blocked_shot':
            gameStats.away.blockedShots++;
            await updatePlayerStats(event.player.id, { blocks: 1 }, guildId);
            break;
          case 'penalty':
            gameStats.away.penaltyMinutes += event.minutes;
            await updatePlayerStats(event.player.id, { penalty_minutes: event.minutes }, guildId);
            break;
        }
        
        // Record the event in the database
        await gameModel.recordGameEvent(
          gameResult.lastID,
          event.type,
          event.player.id,
          period,
          event.time,
          event.description,
          guildId
        );
      }
    }
    
    // Generate goal events for home team
    const homeSkaters = homePlayers.filter(p => p.position !== 'goalie');
    
    for (let i = 0; i < homeScore; i++) {
      const scorer = selectGoalScorer(homeSkaters);
      const assist = Math.random() > 0.3 ? selectAssist(homeSkaters, scorer.id) : null;
      
      // Update stats for scorer
      await updatePlayerStats(scorer.id, { goals: 1, shots: 1, plus_minus: 1 }, guildId);
      await incrementGamesPlayed(scorer.id, guildId);
      
      // Update stats for assist if there is one
      if (assist) {
        await updatePlayerStats(assist.id, { assists: 1, plus_minus: 1 }, guildId);
        await incrementGamesPlayed(assist.id, guildId);
      }
      
      // Record the goal event
      const period = Math.min(3, Math.floor(i / 2) + 1); // Distribute goals across periods
      const minute = Math.floor(Math.random() * 20) + 1;
      const second = Math.floor(Math.random() * 60);
      const timeString = `${period}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
      
      scoreEvents.push({
        team: homeTeam.name,
        scorer: scorer.name,
        assist: assist ? assist.name : null,
        time: timeString
      });
      
      // Add to all events
      allEvents.push({
        type: 'goal',
        player: scorer,
        assist: assist,
        period: period,
        time: `${minute}:${second.toString().padStart(2, '0')}`,
        isHomeTeam: true,
        description: assist ? 
          `Goal by ${scorer.name}, assisted by ${assist.name}` : 
          `Unassisted goal by ${scorer.name}`
      });
      
      // Record the goal in database
      await gameModel.recordGameEvent(
        gameResult.lastID, 
        'goal', 
        scorer.id, 
        period, 
        `${minute}:${second}`, 
        assist ? `Goal by ${scorer.name}, assisted by ${assist.name}` : `Unassisted goal by ${scorer.name}`,
        guildId
      );
      
      // Update opposing goalie stats
      const awayGoalie = awayPlayers.find(p => p.position === 'goalie');
      if (awayGoalie) {
        await updatePlayerStats(awayGoalie.id, { 
          goals_against: 1,
          plus_minus: -1
        }, guildId);
      }
    }
    
    // Generate goal events for away team
    const awaySkaters = awayPlayers.filter(p => p.position !== 'goalie');
    
    for (let i = 0; i < awayScore; i++) {
      const scorer = selectGoalScorer(awaySkaters);
      const assist = Math.random() > 0.3 ? selectAssist(awaySkaters, scorer.id) : null;
      
      // Update stats for scorer
      await updatePlayerStats(scorer.id, { goals: 1, shots: 1, plus_minus: 1 }, guildId);
      await incrementGamesPlayed(scorer.id, guildId);
      
      // Update stats for assist if there is one
      if (assist) {
        await updatePlayerStats(assist.id, { assists: 1, plus_minus: 1 }, guildId);
        await incrementGamesPlayed(assist.id, guildId);
      }
      
      // Record the goal event
      const period = Math.min(3, Math.floor(i / 2) + 1); // Distribute goals across periods
      const minute = Math.floor(Math.random() * 20) + 1;
      const second = Math.floor(Math.random() * 60);
      const timeString = `${period}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
      
      scoreEvents.push({
        team: awayTeam.name,
        scorer: scorer.name,
        assist: assist ? assist.name : null,
        time: timeString
      });
      
      // Add to all events
      allEvents.push({
        type: 'goal',
        player: scorer,
        assist: assist,
        period: period,
        time: `${minute}:${second.toString().padStart(2, '0')}`,
        isHomeTeam: false,
        description: assist ? 
          `Goal by ${scorer.name}, assisted by ${assist.name}` : 
          `Unassisted goal by ${scorer.name}`
      });
      
      // Record the goal in database
      await gameModel.recordGameEvent(
        gameResult.lastID, 
        'goal', 
        scorer.id, 
        period, 
        `${minute}:${second}`, 
        assist ? `Goal by ${scorer.name}, assisted by ${assist.name}` : `Unassisted goal by ${scorer.name}`,
        guildId
      );
      
      // Update opposing goalie stats
      const homeGoalie = homePlayers.find(p => p.position === 'goalie');
      if (homeGoalie) {
        await updatePlayerStats(homeGoalie.id, { 
          goals_against: 1,
          plus_minus: -1
        }, guildId);
      }
    }
    
    // Update player games played
    for (const player of [...homePlayers, ...awayPlayers]) {
      await incrementGamesPlayed(player.id, guildId);
    }
    
    // Calculate goalie save percentages and update shutout stat
    const homeGoalie = homePlayers.find(p => p.position === 'goalie');
    const awayGoalie = awayPlayers.find(p => p.position === 'goalie');
    
    if (homeGoalie) {
      // Calculate saves (shots against minus goals against)
      const savesCount = gameStats.away.shots - awayScore;
      await updatePlayerStats(homeGoalie.id, { saves: savesCount }, guildId);
      
      // If shutout
      if (awayScore === 0) {
        await updatePlayerStats(homeGoalie.id, { shutouts: 1 }, guildId);
      }
    }
    
    if (awayGoalie) {
      // Calculate saves (shots against minus goals against)
      const savesCount = gameStats.home.shots - homeScore;
      await updatePlayerStats(awayGoalie.id, { saves: savesCount }, guildId);
      
      // If shutout
      if (homeScore === 0) {
        await updatePlayerStats(awayGoalie.id, { shutouts: 1 }, guildId);
      }
    }
    
    // Sort score events by time
    scoreEvents.sort((a, b) => {
      const [aPeriod, aMin, aSec] = a.time.split(':').map(Number);
      const [bPeriod, bMin, bSec] = b.time.split(':').map(Number);
      
      if (aPeriod !== bPeriod) return aPeriod - bPeriod;
      if (aMin !== bMin) return aMin - bMin;
      return aSec - bSec;
    });
    
    // Update team records for display
    const updatedHomeTeam = await teamModel.getTeamById(homeTeam.id, guildId);
    const updatedAwayTeam = await teamModel.getTeamById(awayTeam.id, guildId);
    
    // Create embed for game result
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Game Result: ${homeTeam.city} ${homeTeam.name} vs ${awayTeam.city} ${awayTeam.name}`)
      .setDescription(`Final Score: ${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}`)
      .addFields(
        { name: 'Team Strengths', value: 
          `${homeTeam.name}: Overall ${homeStrength.overall.toFixed(1)}, Offense ${homeStrength.offense.toFixed(1)}, Defense ${homeStrength.defense.toFixed(1)}\n` +
          `${awayTeam.name}: Overall ${awayStrength.overall.toFixed(1)}, Offense ${awayStrength.offense.toFixed(1)}, Defense ${awayStrength.defense.toFixed(1)}`
        },
        { name: 'Team Records', value: 
          `${homeTeam.name}: ${updatedHomeTeam.wins}-${updatedHomeTeam.losses}-${updatedHomeTeam.ties}\n` +
          `${awayTeam.name}: ${updatedAwayTeam.wins}-${updatedAwayTeam.losses}-${updatedAwayTeam.ties}`
        },
        { name: 'Game Stats', value:
          `**Shots**: ${homeTeam.name} ${gameStats.home.shots}, ${awayTeam.name} ${gameStats.away.shots}\n` +
          `**Hits**: ${homeTeam.name} ${gameStats.home.hits}, ${awayTeam.name} ${gameStats.away.hits}\n` +
          `**Blocked Shots**: ${homeTeam.name} ${gameStats.home.blockedShots}, ${awayTeam.name} ${gameStats.away.blockedShots}\n` +
          `**PIM**: ${homeTeam.name} ${gameStats.home.penaltyMinutes}, ${awayTeam.name} ${gameStats.away.penaltyMinutes}`
        },
        { name: 'Season', value: activeSeason.name, inline: true },
        { name: 'Game Type', value: isPlayoff ? '🏆 Playoff' : 'Regular Season', inline: true }
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
    
    // If it's a playoff game, check if it's part of a series
    if (isPlayoff) {
      // Check if this game is part of an active playoff series
      const seriesId = interaction.options.getInteger('series');
      
      if (seriesId) {
        const winningTeamId = homeScore > awayScore ? homeTeam.id : awayTeam.id;
        
        try {
          // Record the playoff series result
          const seriesResult = await seasonModel.recordPlayoffGame(seriesId, winningTeamId, guildId);
          
          if (seriesResult.isComplete) {
            const winningTeam = winningTeamId === homeTeam.id ? 
              `${homeTeam.city} ${homeTeam.name}` : 
              `${awayTeam.city} ${awayTeam.name}`;
              
            embed.addFields({ 
              name: '🎊 Series Update 🎊', 
              value: seriesResult.isChampionship ? 
                `${winningTeam} WINS THE CHAMPIONSHIP!` :
                `${winningTeam} wins the series and advances!`
            });
          } else {
            // Series continues
            embed.addFields({
              name: 'Series Update',
              value: `Series score: ${seriesResult.team1Wins}-${seriesResult.team2Wins}`
            });
          }
        } catch (error) {
          console.error('Error updating playoff series:', error);
        }
      }
    }
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in simulateGame command:', error);
    
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

// Helper function to update player stats
async function updatePlayerStats(playerId, stats, guildId) {
  try {
    // Try updating characters table first
    const characterResult = await updateTableStats('characters', playerId, stats, guildId);
    if (characterResult) return characterResult;
    
    // If that fails, try updating players table
    const playerResult = await updateTableStats('players', playerId, stats, guildId);
    if (playerResult) return playerResult;
    
    return null;
  } catch (error) {
    console.error(`Error updating player stats: ${error.message}`);
    return null;
  }
}

// Helper function to update stats in specific table
async function updateTableStats(tableName, entityId, stats, guildId) {
  try {
    const db = require('../database/db').getDb(guildId);
    
    // Build the SQL dynamically based on provided stats
    let updateFields = [];
    let values = [];
    
    for (const [key, value] of Object.entries(stats)) {
      if (value !== undefined && value !== null) {
        updateFields.push(`${key} = COALESCE(${key}, 0) + ?`);
        values.push(value);
      }
    }
    
    if (updateFields.length === 0) return null;
    
    // Add the entity ID to values
    values.push(entityId);
    
    return await db.run(
      `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
  } catch (error) {
    console.error(`Error updating ${tableName} stats: ${error.message}`);
    return null;
  }
}

// Helper function to increment games played
async function incrementGamesPlayed(entityId, guildId) {
  return await updatePlayerStats(entityId, { games_played: 1 }, guildId);
}

// Generate hockey event
function generateHockeyEvent(period, homePlayers, awayPlayers, isHomeTeam) {
  // Get the relevant team's players
  const teamPlayers = isHomeTeam ? homePlayers : awayPlayers;
  const opposingPlayers = isHomeTeam ? awayPlayers : homePlayers;
  
  // Get skaters (non-goalies)
  const skaters = teamPlayers.filter(p => p.position !== 'goalie');
  
  // Different types of events with their probabilities
  const eventTypes = [
    { type: 'shot', probability: 0.6 },
    { type: 'hit', probability: 0.2 },
    { type: 'blocked_shot', probability: 0.1 },
    { type: 'penalty', probability: 0.1 }
  ];
  
  // Randomly select an event type based on probability
  const random = Math.random();
  let cumulativeProbability = 0;
  let selectedEvent;
  
  for (const event of eventTypes) {
    cumulativeProbability += event.probability;
    if (random <= cumulativeProbability) {
      selectedEvent = event.type;
      break;
    }
  }
  
  // Format timestamp for the event
  const minute = Math.floor(Math.random() * 20) + 1;
  const second = Math.floor(Math.random() * 60);
  const timeString = `${minute}:${second.toString().padStart(2, '0')}`;
  
  // Generate the event details
  let eventDetails = {
    type: selectedEvent,
    period: period,
    time: timeString,
    isHomeTeam: isHomeTeam
  };
  
  // Handle case where there are no skaters
  if (!skaters.length) {
    return {
      type: 'shot',
      period: period,
      time: timeString,
      isHomeTeam: isHomeTeam,
      player: { id: 0, name: 'Unknown Player' },
      description: 'Shot on goal'
    };
  }
  
  // Pick a random player for the event if we can't find one with the right skill
  const randomPlayer = skaters[Math.floor(Math.random() * skaters.length)];
  const randomOpposingPlayer = opposingPlayers.filter(p => p.position !== 'goalie').length > 0 ?
    opposingPlayers.filter(p => p.position !== 'goalie')[Math.floor(Math.random() * opposingPlayers.filter(p => p.position !== 'goalie').length)] :
    { id: 0, name: 'Unknown Player' };
  
  // Fill in player details based on event type
  switch (selectedEvent) {
    case 'shot':
      // Select player with preference for high shooting skill
      const shooter = selectPlayerBySkill(skaters, 'shooting') || randomPlayer;
      const opposingGoalie = opposingPlayers.find(p => p.position === 'goalie');
      
      eventDetails.player = shooter;
      eventDetails.description = `Shot by ${shooter.name}${opposingGoalie ? ` saved by ${opposingGoalie.name}` : ''}`;
      break;
      
    case 'hit':
      // Select player with preference for high physical skill
      const hitter = selectPlayerBySkill(skaters, 'physical') || randomPlayer;
      const hitTarget = randomOpposingPlayer;
      
      eventDetails.player = hitter;
      eventDetails.targetPlayer = hitTarget;
      eventDetails.description = `${hitter.name} hits ${hitTarget.name} along the boards`;
      break;
      
    case 'blocked_shot':
    // Defender blocks a shot
    const defender = selectPlayerBySkill(skaters, 'defense') || randomPlayer;
    const shotTaker = randomOpposingPlayer;
    
    eventDetails.player = defender;
    eventDetails.targetPlayer = shotTaker;
    eventDetails.description = `${defender.name} blocks a shot from ${shotTaker.name}`;
    break;
      
    case 'penalty':
      // Penalty - preference for high physical skill players
      const penaltyPlayer = selectPlayerBySkill(skaters, 'physical') || randomPlayer;
      const penalties = ['Tripping', 'Holding', 'Interference', 'Slashing', 'High-sticking', 'Hooking'];
      const penaltyType = penalties[Math.floor(Math.random() * penalties.length)];
      const minutes = Math.random() < 0.9 ? 2 : 4; // 90% are 2 minutes, 10% are 4 minutes
      
      eventDetails.player = penaltyPlayer;
      eventDetails.penaltyType = penaltyType;
      eventDetails.minutes = minutes;
      eventDetails.description = `${minutes} minute ${penaltyType} penalty to ${penaltyPlayer.name}`;
      break;
  }
  
  return eventDetails;
}


module.exports = simulateGame;