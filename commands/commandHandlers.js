// Import all command handlers
const createPlayer = require('./createPlayer');
const updatePlayerImage = require('./updatePlayerImage');
const createTeam = require('./createTeam');
const roster = require('./roster');
const simulateGame = require('./simulateGame');
const scheduleGame = require('./scheduleGame');
const standings = require('./standings');
const playerInfo = require('./playerInfo');
const roll = require('./roll');
const setPlayerSkills = require('./setPlayerSkills');
const stats = require('./stats');
const assignPhone = require('./assignPhone');
const sendText = require('./sendText');
const viewInbox = require('./viewInbox');
const viewConversation = require('./viewConversation');
const removePlayer = require('./removePlayer');
const gameHistory = require('./gameHistory');
const gameDetails = require('./gameDetails');
const teamMatchup = require('./teamMatchup');
const trade = require('./trade');
const tradeHistory = require('./tradeHistory');
const seasonSummary = require('./seasonSummary');
const playoffMatchups = require('./playoffMatchups');
const findSeries = require('./findSeries');
const simulateSeries = require('./simulateSeries');
const startSeason = require('./startSeason');
const instagramPost = require('./instagramPost');
const createBotTeam = require('./createBotTeam');

// Add to your commandHandlers.js file
initdb: async function(interaction) {
  try {
    const { initDatabase } = require('../database/db');
    await initDatabase(interaction.guildId);
    return interaction.reply('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    return interaction.reply({
      content: `Failed to initialize database: ${error.message}`,
      ephemeral: true
    });
  }
}


// Export all handlers as a single object
module.exports = {
  createplayer: createPlayer,
  updateplayerimage: updatePlayerImage,
  createteam: createTeam,
  roster: roster,
  simulategame: simulateGame,
  schedulegame: scheduleGame,
  standings: standings,
  playerinfo: playerInfo,
  roll: roll,
  setskills: setPlayerSkills,
  stats: stats,
  assignphone: assignPhone,
  text: sendText,
  inbox: viewInbox,
  conversation: viewConversation,
  removeplayer: removePlayer,
  gamehistory: gameHistory,
  gamedetails: gameDetails,
  matchup: teamMatchup,
  trade: trade,
  tradehistory: tradeHistory,
  seasonsummary: seasonSummary,
  playoffmatchups: playoffMatchups,
  findseries: findSeries,
  simulateseries: simulateSeries,
  startseason: startSeason,
  instagram: instagramPost,
  createbotteam: createBotTeam,
};