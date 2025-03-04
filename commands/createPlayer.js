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
    // Defer the reply immediately to prevent interaction timeout
    await interaction.deferReply({ ephemeral: false });

    const name = interaction.options.getString('name');
    const position = interaction.options.getString('position');
    const number = interaction.options.getInteger('number');
    const teamName = interaction.options.getString('team');
    const imageUrl = interaction.options.getString('image') || null;
    const guildId = interaction.guildId;
    
    console.log('Create Player Parameters:', { name, position, number, teamName, imageUrl, guildId });
    
    // Check if the team exists
    const team = await teamModel.getTeamByName(teamName, guildId);
    if (!team) {
      return interaction.editReply(`Team "${teamName}" doesn't exist. Create it first with /createteam.`);
    }
    
    // Create player
    console.log('Inserting player into database...');
    const playerResult = await playerModel.createPlayer(
      name, 
      position, 
      number, 
      team.id, 
      interaction.user.id, 
      imageUrl,
      guildId
    );
    console.log('Player created successfully');
    
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('New Player Created')
      .setDescription(`${name} has been added to ${teamName} as a ${position.replace('_', ' ')}!`)
      .addFields(
        { name: 'Name', value: name, inline: true },
        { name: 'Position', value: position.replace('_', ' '), inline: true },
        { name: 'Number', value: number.toString(), inline: true }
      )
      .setTimestamp();
      
    // Add player image if provided
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
    
    try {
      // Attempt to edit the reply with the error
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: `An error occurred: ${error.message}`, 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: `An error occurred: ${error.message}`, 
          ephemeral: true 
        });
      }
    } catch (replyError) {
      console.error('Error sending error reply:', replyError);
      // As a last resort, log the error
      console.error('Could not send error message to user');
    }
  }
}

module.exports = createPlayer;