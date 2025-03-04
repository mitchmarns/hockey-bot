// Command registration
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('discord.js');
const { TOKEN, CLIENT_ID, POSITIONS } = require('../config/config');

// Define commands
const commands = [
  new SlashCommandBuilder()
    .setName('createplayer')
    .setDescription('Create a new hockey player character')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Player name')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('position')
        .setDescription('Player position')
        .setRequired(true)
        .addChoices(...POSITIONS))
    .addIntegerOption(option => 
      option.setName('number')
        .setDescription('Jersey number')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('team')
        .setDescription('Team name')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('image')
        .setDescription('URL to player image')
        .setRequired(false))
    .addStringOption(option => 
    option.setName('faceclaim')
      .setDescription('Face claim')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('updateplayerimage')
    .setDescription('Update a player\'s image')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Player name')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('image')
        .setDescription('URL to new player image')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('createteam')
    .setDescription('Create a new hockey team')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Team name')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('city')
        .setDescription('Team city')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('logo')
        .setDescription('Team logo URL')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('schedulegame')
    .setDescription('Schedule a game between two teams')
    .addStringOption(option => 
      option.setName('hometeam')
        .setDescription('Home team name')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('awayteam')
        .setDescription('Away team name')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('date')
        .setDescription('Game date (YYYY-MM-DD)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('time')
        .setDescription('Game time (HH:MM)')
        .setRequired(true))
    .addBooleanOption(option => 
      option.setName('playoff')
        .setDescription('Is this a playoff game?')
        .setRequired(false)),
  
  new SlashCommandBuilder()
    .setName('simulategame')
    .setDescription('Simulate a hockey game between two teams')
    .addStringOption(option => 
      option.setName('hometeam')
        .setDescription('Home team name')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('awayteam')
        .setDescription('Away team name')
        .setRequired(true))
    .addBooleanOption(option => 
      option.setName('playoff')
        .setDescription('Is this a playoff game?')
        .setRequired(false))
    .addIntegerOption(option => 
      option.setName('series')
        .setDescription('Playoff series ID (if applicable)')
        .setRequired(false)),
  
  new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Display a team\'s roster')
    .addStringOption(option => 
      option.setName('team')
        .setDescription('Team name')
        .setRequired(true)),
        
  new SlashCommandBuilder()
    .setName('standings')
    .setDescription('Display the league standings'),
    
  new SlashCommandBuilder()
    .setName('playerinfo')
    .setDescription('Get information about a player')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Player name')
        .setRequired(true)),
    
  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice for skill checks')
    .addIntegerOption(option => 
      option.setName('skill')
        .setDescription('Skill level (1-100)')
        .setRequired(true)),

  new SlashCommandBuilder()
  .setName('setskills')
  .setDescription('Set or update a player\'s skills')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('Player name')
      .setRequired(true))
  .addIntegerOption(option => 
    option.setName('skating')
      .setDescription('Skating skill (1-100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('shooting')
      .setDescription('Shooting skill (1-100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('passing')
      .setDescription('Passing skill (1-100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('defense')
      .setDescription('Defense skill (1-100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('physical')
      .setDescription('Physical skill (1-100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('goaltending')
      .setDescription('Goaltending skill (1-100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false)),
  new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Display player statistics leaderboards')
  .addStringOption(option => 
    option.setName('stattype')
      .setDescription('Type of stats to display')
      .setRequired(false)
      .addChoices(
        { name: 'Points (Goals + Assists)', value: 'points' },
        { name: 'Goals', value: 'goals' },
        { name: 'Assists', value: 'assists' },
        { name: 'Games Played', value: 'games' },
        { name: 'Points Per Game', value: 'ppg' }
      ))
  .addStringOption(option => 
    option.setName('team')
      .setDescription('Filter by team (leave empty for league-wide stats)')
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('limit')
      .setDescription('Number of players to show (default: 10)')
      .setMinValue(1)
      .setMaxValue(50)
      .setRequired(false)),

  new SlashCommandBuilder()
  .setName('removeplayer')
  .setDescription('Permanently remove a player character')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('Player name')
      .setRequired(true)),
  new SlashCommandBuilder()
  .setName('gamehistory')
  .setDescription('View history of played games')
  .addStringOption(option => 
    option.setName('team')
      .setDescription('Filter by team name (leave empty for all games)')
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('limit')
      .setDescription('Number of games to show (default: 10)')
      .setMinValue(1)
      .setMaxValue(30)
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('gamedetails')
    .setDescription('View detailed information about a specific game')
    .addIntegerOption(option => 
      option.setName('id')
        .setDescription('Game ID')
        .setRequired(true)),
  new SlashCommandBuilder()
  .setName('matchup')
  .setDescription('View head-to-head history between two teams')
  .addStringOption(option => 
    option.setName('team1')
      .setDescription('First team name')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('team2')
      .setDescription('Second team name')
      .setRequired(true)),
  new SlashCommandBuilder()
  .setName('trade')
  .setDescription('Trade a player to a different team')
  .addStringOption(option => 
    option.setName('player')
      .setDescription('Player name')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('team')
      .setDescription('New team name')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('notes')
      .setDescription('Optional notes about the trade')
      .setRequired(false)),
  new SlashCommandBuilder()
  .setName('tradehistory')
  .setDescription('View trade history')
  .addStringOption(option => 
    option.setName('player')
      .setDescription('View trades for a specific player')
      .setRequired(false))
  .addStringOption(option => 
    option.setName('team')
      .setDescription('View trades for a specific team')
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('limit')
      .setDescription('Number of trades to show (default: 10)')
      .setMinValue(1)
      .setMaxValue(30)
      .setRequired(false)),
  // Season management commands
new SlashCommandBuilder()
  .setName('startseason')
  .setDescription('Start a new hockey season')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('Season name (e.g., "2025 Winter Season")')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('date')
      .setDescription('Start date (YYYY-MM-DD)')
      .setRequired(false)),

new SlashCommandBuilder()
  .setName('endseason')
  .setDescription('End the current hockey season')
  .addStringOption(option => 
    option.setName('date')
      .setDescription('End date (YYYY-MM-DD)')
      .setRequired(false)),

new SlashCommandBuilder()
  .setName('seasons')
  .setDescription('List all seasons and their status'),

// Playoff commands
new SlashCommandBuilder()
  .setName('startplayoffs')
  .setDescription('Start playoffs for the current season')
  .addIntegerOption(option => 
    option.setName('teams')
      .setDescription('Number of teams in playoffs (must be even: 2, 4, 8, 16)')
      .setRequired(false)),

new SlashCommandBuilder()
  .setName('playoffbracket')
  .setDescription('Show the current playoff bracket')
  .addIntegerOption(option => 
    option.setName('season')
      .setDescription('Season ID (default: current season)')
      .setRequired(false)),

new SlashCommandBuilder()
  .setName('recordplayoffgame')
  .setDescription('Record the result of a playoff game')
  .addIntegerOption(option => 
    option.setName('series')
      .setDescription('Playoff series ID')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('winningteam')
      .setDescription('Name of the winning team')
      .setRequired(true)),

new SlashCommandBuilder()
  .setName('playoffstats')
  .setDescription('Show playoff statistics')
  .addStringOption(option => 
    option.setName('stattype')
      .setDescription('Type of stats to display')
      .setRequired(false)
      .addChoices(
        { name: 'Points (Goals + Assists)', value: 'points' },
        { name: 'Goals', value: 'goals' },
        { name: 'Assists', value: 'assists' },
        { name: 'Games Played', value: 'games' }
      ))
  .addIntegerOption(option => 
    option.setName('season')
      .setDescription('Season ID (default: current season)')
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('limit')
      .setDescription('Number of players to show (default: 10)')
      .setMinValue(1)
      .setMaxValue(50)
      .setRequired(false)),
  new SlashCommandBuilder()
  .setName('seasonsummary')
  .setDescription('Show a summary of the current or specified season')
  .addIntegerOption(option => 
    option.setName('season')
      .setDescription('Season ID (default: current season)')
      .setRequired(false)),
  new SlashCommandBuilder()
  .setName('playoffmatchups')
  .setDescription('Show active playoff series matchups')
  .addIntegerOption(option => 
    option.setName('season')
      .setDescription('Season ID (default: current season)')
      .setRequired(false)),
  new SlashCommandBuilder()
  .setName('findseries')
  .setDescription('Find a team\'s current playoff series')
  .addStringOption(option => 
    option.setName('team')
      .setDescription('Team name')
      .setRequired(true)),
  new SlashCommandBuilder()
  .setName('simulateseries')
  .setDescription('Simulate an entire playoff series (admin only)')
  .addIntegerOption(option => 
    option.setName('series')
      .setDescription('Playoff series ID')
      .setRequired(true)),
  new SlashCommandBuilder()
  .setName('instagram')
  .setDescription('Create an Instagram post for your character')
  .addStringOption(option => 
    option.setName('player')
      .setDescription('Your player name')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('image')
      .setDescription('URL to image for the post')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('caption')
      .setDescription('Caption for your post')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('hashtags')
      .setDescription('Hashtags (comma separated)')
      .setRequired(false))
  .addStringOption(option => 
    option.setName('location')
      .setDescription('Location tag (e.g., "Hockey Arena", "Downtown", "Team Practice Facility")')
      .setRequired(false)),
  new SlashCommandBuilder()
  .setName('createbotteam')
  .setDescription('Create an AI-controlled bot team with generated players')
  .addStringOption(option => 
    option.setName('name')
      .setDescription('Team name (will be prefixed with [BOT])')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('city')
      .setDescription('Team city')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('logo')
      .setDescription('Team logo URL')
      .setRequired(false))
  .addIntegerOption(option => 
    option.setName('skill')
      .setDescription('Team skill level (1-100, default: 50)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false)),
      new SlashCommandBuilder()
  .setName('initdb')
  .setDescription('Force initialize database for this server (admin only)'),
  // Coach management commands
new SlashCommandBuilder()
.setName('createcoach')
.setDescription('Create a new coach')
.addStringOption(option => 
  option.setName('name')
    .setDescription('Coach name')
    .setRequired(true))
.addStringOption(option => 
  option.setName('team')
    .setDescription('Team name')
    .setRequired(true))
.addStringOption(option => 
  option.setName('type')
    .setDescription('Coach type')
    .setRequired(false)
    .addChoices(
      { name: 'Head Coach', value: 'head' },
      { name: 'Assistant Coach', value: 'assistant' },
      { name: 'Goalie Coach', value: 'goalie' },
      { name: 'Video Coach', value: 'video' },
      { name: 'Skills Coach', value: 'skills' }
    ))
.addStringOption(option => 
  option.setName('image')
    .setDescription('URL to coach image')
    .setRequired(false))
.addStringOption(option => 
  option.setName('bio')
    .setDescription('Coach biography')
    .setRequired(false)),

new SlashCommandBuilder()
.setName('coachinfo')
.setDescription('Get information about a coach')
.addStringOption(option => 
  option.setName('name')
    .setDescription('Coach name')
    .setRequired(true)),

new SlashCommandBuilder()
.setName('coachingstaff')
.setDescription('View a team\'s coaching staff')
.addStringOption(option => 
  option.setName('team')
    .setDescription('Team name')
    .setRequired(true)),

// Lines management commands
new SlashCommandBuilder()
.setName('setlines')
.setDescription('Set team lines (coach only)')
.addStringOption(option => 
  option.setName('team')
    .setDescription('Team name')
    .setRequired(true))
.addStringOption(option => 
  option.setName('linetype')
    .setDescription('Type of line to set')
    .setRequired(true)
    .addChoices(
      { name: 'Forward Line', value: 'forward' },
      { name: 'Defense Pair', value: 'defense' },
      { name: 'Power Play Unit', value: 'powerplay' },
      { name: 'Penalty Kill Unit', value: 'penalty_kill' },
      { name: 'Goalie Rotation', value: 'goalie' }
    ))
.addIntegerOption(option => 
  option.setName('number')
    .setDescription('Line number (1st, 2nd, 3rd, 4th line)')
    .setRequired(true)
    .setMinValue(1)
    .setMaxValue(4))
.addStringOption(option => 
  option.setName('player1')
    .setDescription('1st player (center for forwards, defense for D-pairs, starter for goalies)')
    .setRequired(true))
.addStringOption(option => 
  option.setName('player2')
    .setDescription('2nd player (left wing for forwards, defense for D-pairs, backup for goalies)')
    .setRequired(true))
.addStringOption(option => 
  option.setName('player3')
    .setDescription('3rd player (right wing for forwards, req. for PP/PK, third string goalie)')
    .setRequired(false))
.addStringOption(option => 
  option.setName('player4')
    .setDescription('4th player (only for powerplay/penalty kill units)')
    .setRequired(false))
.addStringOption(option => 
  option.setName('player5')
    .setDescription('5th player (only for powerplay/penalty kill units)')
    .setRequired(false)),

new SlashCommandBuilder()
.setName('viewlines')
.setDescription('View a team\'s lines')
.addStringOption(option => 
  option.setName('team')
    .setDescription('Team name')
    .setRequired(true))
];

async function registerCommands() {
  // Register commands
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('==== STARTED REFRESHING COMMANDS ====');
    console.log(`Attempting to register ${commands.length} commands`);
    
    // Log the names of all commands being registered
    commands.forEach(cmd => console.log(`- Registering: ${cmd.name}`));

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands },
    );

    console.log('==== SUCCESSFULLY RELOADED COMMANDS ====');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

module.exports = registerCommands;
module.exports.commands = commands;