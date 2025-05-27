import type { Tool, ToolParams } from '../../tools-registry';
import { OpenProjectApiClient } from '../api-client';

interface SearchUsersParams {
  search_term?: string;
  name?: string;
  email?: string;
  list_all?: boolean;
}

export const searchUsersTool: Tool = {
  name: 'search_users',
  description: 'Search for users by name or email in OpenProject to find their user IDs and details. Use this tool when you only have a user\'s name or email but need their ID for assignments or other operations.',
  parameters: {
    type: 'object',
    properties: {
      search_term: {
        type: 'string',
        description: 'General search term that will match against user names, logins, and emails',
      },
      name: {
        type: 'string',
        description: 'Search specifically by user name (first name, last name, or full name)',
      },
      email: {
        type: 'string',
        description: 'Search specifically by email address',
      },
      list_all: {
        type: 'boolean',
        description: 'Set to true to list all users instead of searching (useful when you don\'t know any user details)',
      },
    },
    required: [],
  },

  execute: async (args: ToolParams): Promise<string> => {
    const params = args as unknown as SearchUsersParams;
    
    try {
      const client = new OpenProjectApiClient();

      let users;
      let searchDescription = '';

      if (params.list_all) {
        console.log('[OpenProjectAgent] Fetching all users...');
        const usersResponse = await client.listUsers();
        users = usersResponse._embedded.elements;
        searchDescription = 'All users';
      } else {
        // Determine search term
        const searchTerm = params.search_term || params.name || params.email;
        
        if (!searchTerm) {
          return 'Please provide a search_term, name, email, or set list_all to true to see all users.';
        }

        console.log(`[OpenProjectAgent] Searching for users with term: "${searchTerm}"`);
        const usersResponse = await client.searchUsers(searchTerm);
        users = usersResponse._embedded.elements;
        searchDescription = `Search results for "${searchTerm}"`;

        // If no results from API search, try listing all and filtering locally
        if (users.length === 0) {
          console.log('[OpenProjectAgent] No results from search API, trying local filtering...');
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
        return params.list_all 
          ? 'No users found in OpenProject.'
          : `No users found matching your search criteria. Try using list_all: true to see all available users.`;
      }

      // Sort users by relevance when there's a search term
      if (!params.list_all && (params.search_term || params.name)) {
        const searchTerm = (params.search_term || params.name || '').toLowerCase();
        users.sort((a, b) => {
          // Priority 1: Exact first name match
          const aFirstMatch = a.firstName.toLowerCase() === searchTerm;
          const bFirstMatch = b.firstName.toLowerCase() === searchTerm;
          if (aFirstMatch && !bFirstMatch) return -1;
          if (!aFirstMatch && bFirstMatch) return 1;
          
          // Priority 2: Exact last name match
          const aLastMatch = a.lastName.toLowerCase() === searchTerm;
          const bLastMatch = b.lastName.toLowerCase() === searchTerm;
          if (aLastMatch && !bLastMatch) return -1;
          if (!aLastMatch && bLastMatch) return 1;
          
          // Priority 3: First name starts with search term
          const aFirstStarts = a.firstName.toLowerCase().startsWith(searchTerm);
          const bFirstStarts = b.firstName.toLowerCase().startsWith(searchTerm);
          if (aFirstStarts && !bFirstStarts) return -1;
          if (!aFirstStarts && bFirstStarts) return 1;
          
          // Default: alphabetical order
          return a.name.localeCompare(b.name);
        });
      }

      let result = `**${searchDescription} (${users.length} found)**\n\n`;
      
      // Add smart matching hint for first result if it's clearly the best match
      if (!params.list_all && users.length > 1 && (params.search_term || params.name)) {
        const searchTerm = (params.search_term || params.name || '').toLowerCase();
        const firstUser = users[0];
        if (firstUser && firstUser.firstName.toLowerCase() === searchTerm) {
          result += `🎯 **Best Match (exact first name):** ${firstUser.name} (User ID: ${firstUser.id})\n\n`;
        }
      }
      
      users.forEach((user, index) => {
        result += `**${index + 1}. ${user.name}**\n`;
        result += `   • **User ID:** ${user.id} ⭐ (use this ID in other tools)\n`;
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
        
        result += `   • 🔗 **Profile:** ${client.buildUserUrl(user.id)}\n\n`;
      });

      result += `\n💡 **Tip:** Use the User ID (highlighted with ⭐) in other tools like \`assign_user\` or \`create_work_package\` when you need to assign users to work packages.`;

      console.log(`[OpenProjectAgent] Successfully found ${users.length} users`);
      return result;

    } catch (error) {
      console.error('[OpenProjectAgent] Error searching users:', error);
      return `Error searching users: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
}; 