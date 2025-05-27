import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { OpenProjectApiClient } from '../tools/openproject-agent/api-client';

export const data = new SlashCommandBuilder()
  .setName('op-search-users')
  .setDescription('Search for users in OpenProject by name or email')
  .addStringOption(option =>
    option.setName('search_term')
      .setDescription('Search term (name, email, or login)')
      .setRequired(false))
  .addBooleanOption(option =>
    option.setName('list_all')
      .setDescription('List all users instead of searching')
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const client = new OpenProjectApiClient();
    const searchTerm = interaction.options.getString('search_term');
    const listAll = interaction.options.getBoolean('list_all') || false;

    let users;
    let searchDescription = '';

    if (listAll) {
      console.log('[OpenProjectCommand] Fetching all users...');
      const usersResponse = await client.listUsers();
      users = usersResponse._embedded.elements;
      searchDescription = 'All users';
    } else {
      if (!searchTerm) {
        await interaction.editReply({ 
          content: 'Please provide a search term or set list_all to true to see all users.' 
        });
        return;
      }

      console.log(`[OpenProjectCommand] Searching for users with term: "${searchTerm}"`);
      const usersResponse = await client.searchUsers(searchTerm);
      users = usersResponse._embedded.elements;
      searchDescription = `Search results for "${searchTerm}"`;

      // If no results from API search, try listing all and filtering locally
      if (users.length === 0) {
        console.log('[OpenProjectCommand] No results from search API, trying local filtering...');
        const allUsersResponse = await client.listUsers();
        const allUsers = allUsersResponse._embedded.elements;
        
        const searchTermLower = searchTerm.toLowerCase();
        users = allUsers.filter(user => 
          user.name.toLowerCase().includes(searchTermLower) ||
          user.firstName.toLowerCase().includes(searchTermLower) ||
          user.lastName.toLowerCase().includes(searchTermLower) ||
          user.login.toLowerCase().includes(searchTermLower) ||
          user.email.toLowerCase().includes(searchTermLower)
        );
        
        if (users.length > 0) {
          searchDescription = `Local search results for "${searchTerm}"`;
        }
      }
    }

    if (users.length === 0) {
      const message = listAll 
        ? 'No users found in OpenProject.'
        : `No users found matching your search criteria. Try using list_all option to see all available users.`;
      await interaction.editReply({ content: message });
      return;
    }

    let result = `**${searchDescription} (${users.length} found)**\n\n`;
    
    users.forEach((user, index) => {
      result += `**${index + 1}. ${user.name}**\n`;
      result += `   • **User ID:** ${user.id} ⭐ (use this ID in other commands)\n`;
      result += `   • Login: ${user.login}\n`;
      result += `   • Email: ${user.email}\n`;
      result += `   • First Name: ${user.firstName}\n`;
      result += `   • Last Name: ${user.lastName}\n`;
      result += `   • Status: ${user.status}\n`;
      result += `   • Language: ${user.language}\n`;
      
      if (user.admin) {
        result += `   • Role: Administrator 👑\n`;
      }
      
      result += `   • Created: ${new Date(user.createdAt).toLocaleDateString()}\n`;
      result += `   • Last Updated: ${new Date(user.updatedAt).toLocaleDateString()}\n`;
      
      if (user.avatar) {
        result += `   • Avatar: ${user.avatar}\n`;
      }
      
      result += '\n';
    });

    result += `\n💡 **Tip:** Use the User ID (highlighted with ⭐) in other OpenProject commands when you need to assign users to work packages.`;

    // Split message if too long for Discord
    if (result.length > 2000) {
      const chunks = [];
      let currentChunk = '';
      const lines = result.split('\n');
      
      for (const line of lines) {
        if (currentChunk.length + line.length + 1 > 2000) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
      
      await interaction.editReply({ content: chunks[0] });
      
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i] });
      }
    } else {
      await interaction.editReply({ content: result });
    }

    console.log(`[OpenProjectCommand] Successfully found ${users.length} users`);

  } catch (error) {
    console.error('[OpenProjectCommand] Error searching users:', error);
    await interaction.editReply({ 
      content: `Error searching users: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
} 