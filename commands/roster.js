const teamModel = require('../database/models/teamModel');
const playerModel = require('../database/models/playerModel');
const { createTeamEmbed } = require('../utils/embedBuilder');

async function roster(interaction) {
  const teamName = interaction.options.getString('team');
  const guildId = interaction.guildId;
  
  // Find team
  const team = await teamModel.getTeamByName(teamName, guildId);
  if (!team) {
    return interaction.reply(`Team "${teamName}" doesn't exist.`);
  }
  
  // Get roster
  const roster = await playerModel.getPlayersByTeamId(team.id, guildId);
  if (roster.length === 0) {
    return interaction.reply(`Team "${teamName}" has no players yet.`);
  }
  
  // Create and send team embed with roster
  const embed = createTeamEmbed(team, roster);
  await interaction.reply({ embeds: [embed] });
}

module.exports = roster;