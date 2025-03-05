// Create Bot Team command handler (Fixed for simulation compatibility)
const { EmbedBuilder } = require('discord.js');
const teamModel = require('../database/models/teamModel');
const playerModel = require('../database/models/playerModel');
const skillsModel = require('../database/models/skillsModel');
const { POSITIONS } = require('../config/config');

// Lists of realistic fictional hockey player first names
const firstNames = [
  // North American style
  'Mike', 'Chris', 'Scott', 'Steve', 'Kevin', 'Dave', 'Jason', 'Brian', 'Brandon',
  'Eric', 'Keith', 'Jeff', 'Justin', 'Mark', 'Matt', 'Ryan', 'Adam', 'Shane',
  'Cody', 'Travis', 'Brett', 'Greg', 'Derek', 'Jordan', 'Josh', 'Brad', 'Drew',
  
  // European/Scandinavian style
  'Anders', 'Erik', 'Niklas', 'Jonas', 'Fredrik', 'Mattias', 'Lars', 'Mikael', 
  'Peter', 'Thomas', 'Jakub', 'Josef', 'Karel', 'Lukas', 'Martin', 'Jan', 'Pavel', 
  'Michal', 'Igor', 'Viktor', 'Anton', 'Dmitri', 'Sergei', 'Nikolai', 'Mikhail',
  
  // Canadian/French style
  'Jean', 'Marc', 'Pierre', 'Michel', 'Andre', 'Claude', 'Francois', 'Louis', 
  'Denis', 'Gilbert', 'Yves', 'Guy', 'Alain', 'Benoit', 'Patrice', 'Stephane', 
  'Richard', 'Philippe', 'Daniel', 'Vincent', 'Luc', 'Christian', 'Robert', 'Pascal'
];

// Lists of realistic fictional hockey player last names
const lastNames = [
  // North American style
  'Wilson', 'Johnson', 'Brown', 'Miller', 'Davis', 'Thompson', 'White', 'Clark', 
  'Allen', 'Harris', 'King', 'Lewis', 'Walker', 'Young', 'Hall', 'Roberts', 'Baker', 
  'Ross', 'Parker', 'Cook', 'Cooper', 'Ward', 'Fisher', 'Kelly', 'Mitchell', 'Wood',
  
  // European/Scandinavian style
  'Lindgren', 'Andersson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Johansson',
  'Koivu', 'Virtanen', 'Lehtonen', 'Salomaki', 'Kovalchuk', 'Volkov', 'Petrov', 
  'Makarov', 'Ivanov', 'Novak', 'Svoboda', 'Holzer', 'Mueller', 'Wagner', 'Fischer',
  
  // Canadian/French style
  'Tremblay', 'Gagnon', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 
  'Gagne', 'Pelletier', 'Beaulieu', 'Deschamps', 'Poirier', 'Demers', 'Leclerc', 
  'Dubois', 'Marchand', 'Richard', 'Lapierre', 'Belanger', 'Boucher', 'Lefebvre'
];

// Generate a realistic hockey player name
function generatePlayerName(position) {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${first} ${last}`;
}

// Generate a random jersey number (1-99)
function generateNumber() {
  // Avoid duplication in a team by generating a unique set of numbers
  return Math.floor(Math.random() * 98) + 1;
}

// Generate skill levels based on position and specified team skill level
function generateSkills(position, teamSkillLevel) {
  // Base skill range depends on team skill level (1-100)
  const baseMin = Math.max(30, teamSkillLevel - 20);
  const baseMax = Math.min(95, teamSkillLevel + 20);
  
  // Function to generate a random skill value with position-specific bonuses
  const genSkill = (posBonus = 0) => {
    const base = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    return Math.min(100, Math.max(1, base + posBonus));
  };
  
  // Default skills
  const skills = {
    skating: genSkill(0),
    shooting: genSkill(0),
    passing: genSkill(0),
    defense: genSkill(0),
    physical: genSkill(0),
    goaltending: 1  // Default low for non-goalies
  };
  
  // Position-specific skill adjustments
  switch (position) {
    case 'center':
      skills.passing = genSkill(10);  // Centers are better at passing
      skills.skating = genSkill(5);   // Centers are good skaters
      break;
    case 'left_wing':
    case 'right_wing':
      skills.shooting = genSkill(10); // Wingers are better at shooting
      skills.skating = genSkill(5);   // Wingers are fast
      break;
    case 'defenseman':
      skills.defense = genSkill(15);  // Defensemen are better at defense
      skills.physical = genSkill(10); // Defensemen are more physical
      break;
    case 'goalie':
      skills.goaltending = genSkill(15); // Goalies have high goaltending
      skills.defense = genSkill(5);     // Goalies have some defense
      // Reset other skills to be lower for goalies
      skills.shooting = Math.min(50, genSkill(-20));
      skills.passing = Math.min(50, genSkill(-10));
      break;
  }
  
  return skills;
}

// Create a bot player and add to team
async function createBotPlayer(teamId, teamSkillLevel, position, botUserId, usedNumbers, guildId) {
  try {
    // Generate random player details
    const name = generatePlayerName(position);
    
    // Generate a unique number that hasn't been used yet
    let number;
    do {
      number = generateNumber();
    } while (usedNumbers.has(number));
    
    // Mark this number as used
    usedNumbers.add(number);
    
    // Initialize player with default stats
    const playerData = {
      name: name,
      position: position,
      number: number,
      team_id: teamId,
      user_id: botUserId,
      image_url: null,
      face_claim: null,
      goals: 0,
      assists: 0,
      games_played: 0,
      plus_minus: 0,
      penalty_minutes: 0,
      shots: 0,
      blocks: 0,
      hits: 0,
      faceoff_wins: 0,
      faceoff_losses: 0
    };
    
    // For goalies, add goalie specific stats
    if (position === 'goalie') {
      playerData.saves = 0;
      playerData.goals_against = 0;
      playerData.shutouts = 0;
    }
    
    // Create the player - using custom function to ensure all fields are set
    const playerId = await createFullPlayerRecord(playerData, guildId);
    
    // Generate and set skills
    const skills = generateSkills(position, teamSkillLevel);
    await skillsModel.setPlayerSkills(playerId, skills, guildId);
    
    return {
      id: playerId,
      name,
      position,
      number,
      skills
    };
  } catch (error) {
    console.error('Error creating bot player:', error);
    throw error;
  }
}

// Custom function to create a full player record with all fields required for simulation
async function createFullPlayerRecord(playerData, guildId) {
  const db = require('../database/db').getDb(guildId);
  
  // Create SQL statement with all fields needed for simulation
  const fieldNames = Object.keys(playerData).join(', ');
  const placeholders = Object.keys(playerData).map(() => '?').join(', ');
  const values = Object.values(playerData);
  
  const result = await db.run(
    `INSERT INTO players (${fieldNames}) VALUES (${placeholders})`,
    values
  );
  
  return result.lastID;
}

async function createBotTeam(interaction) {
  try {
    // Get command options
    const name = interaction.options.getString('name');
    const city = interaction.options.getString('city');
    const logo = interaction.options.getString('logo') || null;
    const skillLevel = interaction.options.getInteger('skill') || 50;
    const guildId = interaction.guildId;
    
    if (!guildId) {
      return interaction.reply({ 
        content: 'Guild ID not found. This command must be used in a server.',
        ephemeral: true 
      });
    }
    
    // Mark this user ID as the bot controller (this will be needed to identify AI teams)
    const botUserId = 'BOT_CONTROLLER_' + interaction.user.id;
    
    // Check if team already exists
    const existingTeam = await teamModel.getTeamByName(name, guildId);
    if (existingTeam) {
      return interaction.reply(`Team "${name}" already exists.`);
    }
    
    // Create team
    await interaction.deferReply();
    console.log('Creating bot team in database...');
    
    // Add BOT prefix to team name to clearly mark it as an AI team
    const teamName = `[BOT] ${name}`;
    
    try {
      // Create the team with all required fields
      const teamData = {
        name: teamName,
        city: city,
        logo: logo,
        wins: 0,
        losses: 0,
        ties: 0,
        goals_for: 0,
        goals_against: 0
      };
      
      // Use custom function to create team with all fields
      const teamResult = await createFullTeamRecord(teamData, guildId);
      const teamId = teamResult.lastID;
      console.log('Bot team created successfully with ID:', teamId);
      
      // Track used numbers to avoid duplicates
      const usedNumbers = new Set();
      
      // Create players for each position
      const players = [];
      
      // Add 2 goalies
      for (let i = 0; i < 2; i++) {
        const goalie = await createBotPlayer(teamId, skillLevel, 'goalie', botUserId, usedNumbers, guildId);
        players.push(goalie);
      }
      
      // Add 6 defensemen (3 pairs)
      for (let i = 0; i < 6; i++) {
        const defenseman = await createBotPlayer(teamId, skillLevel, 'defenseman', botUserId, usedNumbers, guildId);
        players.push(defenseman);
      }
      
      // Add 4 centers
      for (let i = 0; i < 4; i++) {
        const center = await createBotPlayer(teamId, skillLevel, 'center', botUserId, usedNumbers, guildId);
        players.push(center);
      }
      
      // Add 4 left wings
      for (let i = 0; i < 4; i++) {
        const leftWing = await createBotPlayer(teamId, skillLevel, 'left_wing', botUserId, usedNumbers, guildId);
        players.push(leftWing);
      }
      
      // Add 4 right wings
      for (let i = 0; i < 4; i++) {
        const rightWing = await createBotPlayer(teamId, skillLevel, 'right_wing', botUserId, usedNumbers, guildId);
        players.push(rightWing);
      }
      
      // Create embed for response
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Bot Team Created')
        .setDescription(`The ${city} ${teamName} have joined the league as an AI-controlled team!`)
        .addFields(
          { name: 'Team Name', value: `${city} ${teamName}`, inline: true },
          { name: 'Skill Level', value: `${skillLevel}/100`, inline: true },
          { name: 'Players', value: `${players.length} AI players created`, inline: true }
        )
        .setTimestamp();
      
      // Add logo to embed if it's a valid URL
      if (logo && (logo.startsWith('http://') || logo.startsWith('https://'))) {
        embed.addFields({ name: 'Logo', value: '[View Logo](' + logo + ')', inline: true });
        embed.setThumbnail(logo);
      }
      
      // Add example player information
      const samplePlayers = players.slice(0, 5); // Take first 5 players as examples
      let playerListText = '';
      
      samplePlayers.forEach(player => {
        const positionName = POSITIONS.find(p => p.value === player.position)?.name || player.position;
        playerListText += `${player.name} (#${player.number}) - ${positionName}\n`;
      });
      
      playerListText += `...and ${players.length - 5} more`;
      
      embed.addFields({ name: 'Sample Players', value: playerListText });
      
      // Send the response
      await interaction.editReply({ embeds: [embed] });
      console.log('Bot team creation command completed successfully');
      
    } catch (dbError) {
      console.error('Database error when creating bot team:', dbError);
      return interaction.editReply({ 
        content: `Database error: ${dbError.message}.`
      });
    }
  } catch (error) {
    // Catch any other errors
    console.error('Unhandled error in createBotTeam command:', error);
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

// Custom function to create a full team record with all fields
async function createFullTeamRecord(teamData, guildId) {
  const db = require('../database/db').getDb(guildId);
  
  // Create SQL statement with all provided fields
  const fieldNames = Object.keys(teamData).join(', ');
  const placeholders = Object.keys(teamData).map(() => '?').join(', ');
  const values = Object.values(teamData);
  
  const result = await db.run(
    `INSERT INTO teams (${fieldNames}) VALUES (${placeholders})`,
    values
  );
  
  return result;
}

module.exports = createBotTeam;