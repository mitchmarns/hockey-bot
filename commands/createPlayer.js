const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

function findModels() {
  const modelDirs = [
    '../database/models',
    './database/models',
    '../../database/models',
    './models',
    '../models'
  ];
  
  console.log('Current directory for createPlayer.js:', __dirname);
  
  // Try to find team model
  let teamModel = null;
  let playerModel = null;
  
  for (const dir of modelDirs) {
    try {
      const teamPath = path.join(dir, 'teamModel');
      const playerPath = path.join(dir, 'playerModel');
      
      if (fs.existsSync(require.resolve(teamPath))) {
        console.log('Found teamModel at:', teamPath);
        teamModel = require(teamPath);
      }
      
      if (fs.existsSync(require.resolve(playerPath))) {
        console.log('Found playerModel at:', playerPath);
        playerModel = require(playerPath);
      }
      
      if (teamModel && playerModel) {
        break; // Found both models
      }
    } catch (error) {
      // Continue to next directory
    }
  }
  
  // If can't find the models, use direct DB access as fallback
  if (!teamModel || !playerModel) {
    console.log('Could not find models, using direct DB access');
    const { getDb } = require('../database/db');
    
    if (!teamModel) {
      teamModel = {
        getTeamByName: async (name, guildId) => {
          const db = getDb(guildId);
          return await db.get('SELECT * FROM teams WHERE name = ? COLLATE NOCASE', [name]);
        }
      };
    }
    
    if (!playerModel) {
      playerModel = {
        createPlayer: async (name, position, number, teamId, userId, imageUrl, guildId) => {
          const db = getDb(guildId);
          return await db.run(
            'INSERT INTO players (name, position, number, team_id, user_id, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, position, number, teamId, userId, imageUrl]
          );
        }
      };
    }
  }
  
  return { teamModel, playerModel };
}

const { teamModel, playerModel } = findModels();

async function createPlayer(interaction) {
  try {
    await interaction.deferReply({ ephemeral: false });

    const name = interaction.options.getString('name');
    const position = interaction.options.getString('position');
    const number = interaction.options.getInteger('number');
    const teamName = interaction.options.getString('team');
    const imageUrl = interaction.options.getString('image') || null;
    const faceClaim = interaction.options.getString('faceclaim') || null;
    const guildId = interaction.guildId;
    
// Validate required fields
    if (!name || !position || !number || !teamName) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Missing Required Fields',
            'Name, position, number, and team are required.'
          )
        ]
      });
    }

    // Validate image URL format
    if (imageUrl && !/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(imageUrl)) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Invalid Image URL',
            'Image URL must be a valid link to an image.'
          )
        ]
      });
    }

    // Check if the team exists
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return await interaction.editReply({
        embeds: [
          require('../utils/embedBuilder').createErrorEmbed(
            'Team Not Found',
            `Team "${teamName}" doesn't exist.`
          )
        ]
      });
    }

    // Check for duplicate player name or number on the same team
    const existingPlayers = await playerModel.getPlayersByTeamId?.(team.id, guildId);
    if (existingPlayers) {
      if (existingPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        return await interaction.editReply({
          embeds: [
            require('../utils/embedBuilder').createErrorEmbed(
              'Duplicate Name',
              `A player named "${name}" already exists on this team.`
            )
          ]
        });
      }
      if (existingPlayers.some(p => p.number === number)) {
        return await interaction.editReply({
          embeds: [
            require('../utils/embedBuilder').createErrorEmbed(
              'Duplicate Number',
              `Jersey number ${number} is already taken on this team.`
            )
          ]
        });
      }
    }
    
    // Use team color for embed if available
    const embedColor = team.team_color || '#0099ff';

    // Create player
    await playerModel.createPlayer(
      name,
      position,
      number,
      team.id,
      interaction.user.id,
      imageUrl,
      faceClaim,
      guildId
    );

    // Format fields for readability
    function formatField(val) {
      return val ? val.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
    }
    
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('New Player Created')
      .setDescription(`${formatField(name)} has been added to ${formatField(teamName)} as a ${formatField(position)}!`)
      .addFields(
        { name: 'Name', value: formatField(name), inline: true },
        { name: 'Position', value: formatField(position), inline: true },
        { name: 'Number', value: number.toString(), inline: true }
      )
      .setTimestamp();

    if (faceClaim) {
      embed.addFields({ name: 'Face Claim', value: formatField(faceClaim), inline: true });
    }

    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      try {
        embed.setThumbnail(imageUrl);
      } catch (error) {
        console.error('Error setting thumbnail:', error);
      }
    }
    
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Full error in createPlayer command:', error);
    await interaction.editReply({
      embeds: [
        require('../utils/embedBuilder').createErrorEmbed(
          'Error',
          `An error occurred: ${error.message}`
        )
      ]
    });
  }
}

module.exports = createPlayer;