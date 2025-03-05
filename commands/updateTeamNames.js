const { SlashCommandBuilder } = require('@discordjs/builders');

// Define the command
const data = new SlashCommandBuilder()
  .setName('fixteamnames')
  .setDescription('Fix whitespace and case issues in team names');

// Handler function
async function execute(interaction) {
  try {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    
    // Connect to the database directly
    const db = require('../database/db').getDb(guildId);
    
    // Get all teams with potential issues
    const allTeams = await db.all('SELECT id, name, city FROM teams');
    
    // Check for teams with whitespace issues
    const teamsWithIssues = allTeams.filter(team => {
      return team.name.trim() !== team.name || (team.city && team.city.trim() !== team.city);
    });
    
    let response = '';
    if (teamsWithIssues.length === 0) {
      response = '✅ No team name issues found. All team names look good!';
    } else {
      response = `Found ${teamsWithIssues.length} teams with whitespace issues. Fixing...\n\n`;
      
      // Fix each team
      for (const team of teamsWithIssues) {
        const oldName = team.name;
        const oldCity = team.city || '';
        const newName = team.name.trim();
        const newCity = team.city ? team.city.trim() : '';
        
        // Update in database
        await db.run(
          'UPDATE teams SET name = ?, city = ? WHERE id = ?',
          [newName, newCity, team.id]
        );
        
        response += `✅ Fixed team: "${oldCity} ${oldName}" → "${newCity} ${newName}"\n`;
      }
      
      // Also clean up any potential case sensitivity issues
      await db.run('UPDATE teams SET name = TRIM(name), city = TRIM(city)');
      
      response += '\nAll team names have been fixed and are ready to use! You should now be able to simulate games with all teams.';
    }
    
    // Now let's also display the list of all bot teams for reference
    const botTeams = await db.all('SELECT id, name, city FROM teams WHERE is_bot = 1 OR is_bot = "true"');
    
    if (botTeams.length > 0) {
      response += '\n\n### Available Bot Teams:\n';
      botTeams.forEach(team => {
        response += `- ${team.city || ''} ${team.name} (ID: ${team.id})\n`;
      });
      
      response += '\nYou can use these bot team names when simulating games.';
    } else {
      response += '\n\nNo bot teams found in the database.';
    }
    
    // Send the response
    await interaction.editReply({ content: response });
  } catch (error) {
    console.error('Error in fixteamnames command:', error);
    if (interaction.deferred) {
      await interaction.editReply({ content: `An error occurred: ${error.message}` });
    } else {
      await interaction.reply({ content: `An error occurred: ${error.message}` });
    }
  }
}

module.exports = {
  data,
  execute
};