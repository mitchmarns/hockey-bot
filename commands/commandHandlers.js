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
const createCoach = require('./createCoach');
const coachInfo = require('./coachInfo');
const coachingStaff = require('./coachingStaff');
const setLines = require('./setLines');
const viewLines = require('./viewLines');
const createCharacter = require('./createCharacter');
const characterInfo = require('./characterInfo');
const teamRoster = require('./teamRoster');
const myCharacters = require('./myCharacters');
const deleteCharacter = require('./deleteCharacter');
const editCharacter = require('./editCharacter');

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
  createcoach: createCoach,
  coachinfo: coachInfo,
  coachingstaff: coachingStaff,
  setlines: setLines,
  viewlines: viewLines,
  createcharacter: createCharacter,
  characterinfo: characterInfo,
  teamroster: teamRoster,
  mycharacters: myCharacters,
  deletecharacter: deleteCharacter,
  editcharacter: editCharacter,
};