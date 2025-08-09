const { EmbedBuilder } = require('discord.js');

async function stats(interaction) {
  const statType = interaction.options.getString('stattype') || 'points';
  const teamName = interaction.options.getString('team');
  const limit = interaction.options.getInteger('limit') || 10;
  const guildId = interaction.guildId;
  
  if (!guildId) {
    return await interaction.reply({
      embeds: [
        require('../utils/embedBuilder').createErrorEmbed(
          'Missing Guild ID',
          'This command must be used in a server. Guild ID is required.'
        )
      ],
      ephemeral: true
    });
  }

  let players;
  let title;
  
  try {
    // Get the database connection
    const db = require('../database/db').getDb(guildId);
    
    // Build the base query
    let query = `
      SELECT c.*, t.name as team_name 
      FROM characters c
      JOIN teams t ON c.team_id = t.id
      WHERE c.character_type = 'player' AND c.games_played > 0
    `;
    
    let params = [];
    
    // Add team filter if specified
    if (teamName) {
      query += ` AND t.name = ? COLLATE NOCASE`;
      params.push(teamName);
      title = `${teamName} ${statType.charAt(0).toUpperCase() + statType.slice(1)} Leaders`;
    } else {
      title = `League ${statType.charAt(0).toUpperCase() + statType.slice(1)} Leaders`;
    }
    
    // Add ordering based on stat type
    switch (statType) {
      case 'goals':
        query += ` ORDER BY c.goals DESC, c.assists DESC`;
        break;
      case 'assists':
        query += ` ORDER BY c.assists DESC, c.goals DESC`;
        break;
      case 'games':
        query += ` ORDER BY c.games_played DESC`;
        break;
      case 'ppg': // Points per game
        query += ` ORDER BY (c.goals + c.assists) / CASE WHEN c.games_played > 0 THEN c.games_played ELSE 1 END DESC`;
        break;
      case 'points':
      default:
        query += ` ORDER BY (c.goals + c.assists) DESC, c.goals DESC`;
        break;
    }
    
    // Add limit
    query += ` LIMIT ?`;
    params.push(limit);
    
    // Execute the query
    players = await db.all(query, params);
    
    if (!players || players.length === 0) {
      return await interaction.reply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'No Data',
            'No player statistics found. Try playing some games first!'
          )
        ],
        ephemeral: true
      });
    }
    
    // Create embed response
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(title)
      .setTimestamp();
    
    let leaderboardText = '';
    
    // Format stat display based on type
    players.forEach((player, index) => {
      let statDisplay = '';
      
      if (statType === 'points') {
        statDisplay = `${player.goals + player.assists}pts (${player.goals}G, ${player.assists}A)`;
      } else if (statType === 'goals') {
        statDisplay = `${player.goals} goals`;
      } else if (statType === 'assists') {
        statDisplay = `${player.assists} assists`;
      } else if (statType === 'games') {
        statDisplay = `${player.games_played} games`;
      } else if (statType === 'ppg') {
        const ppg = player.games_played > 0 ? 
          ((player.goals + player.assists) / player.games_played).toFixed(2) : 
          '0.00';
        statDisplay = `${ppg} points per game`;
      }
      
      // Format position and jersey number
      const positionDisplay = player.position ? player.position.replace(/_/g, ' ') : '';
      const jerseyDisplay = player.jersey_number ? `(#${player.jersey_number})` : '';
      leaderboardText += `${index + 1}. **${player.name}** ${jerseyDisplay} ${positionDisplay ? `, ${positionDisplay}` : ''} - ${statDisplay} - ${player.team_name}\n`;
    });
    
    embed.setDescription(leaderboardText);
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in stats command:', error);
    await interaction.reply({
      embeds: [
        require('../utils/embedBuilder').createErrorEmbed(
          'Error',
          `An error occurred: ${error.message}`
        )
      ],
      ephemeral: true
    });
  }
}

module.exports = stats;