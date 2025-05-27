import type { Tool } from './tools-registry';

interface DateTimeOptions {
  format?: 'iso' | 'human' | 'timestamp';
  timezone?: string;
}

/**
 * Tool for getting current date and time information
 */
export const dateTimeTool: Tool = {
  name: 'get_date_time',
  description: 'Get the current date and time, optionally in a specific format and timezone',
  parameters: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['iso', 'human', 'timestamp'],
        description: 'The format to return the date/time in',
      },
      timezone: {
        type: 'string',
        description: 'The timezone to use (IANA timezone format, e.g. "America/New_York")',
      },
    },
    required: [],
  },
  
  execute: (options: DateTimeOptions = {}): string => {
    const { format = 'human', timezone } = options;
    const now = new Date();
    
    // Format the date according to the requested format
    let result: string;
    
    if (format === 'iso') {
      result = now.toISOString();
    } else if (format === 'timestamp') {
      result = now.getTime().toString();
    } else {
      // Human-readable format
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      };
      
      // Add timezone if specified
      if (timezone) {
        dateOptions.timeZone = timezone;
      }
      
      try {
        result = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
      } catch (error) {
        return `Error: Invalid timezone "${timezone}". Using local timezone instead.\n${new Intl.DateTimeFormat('en-US', 
          { ...dateOptions, timeZone: undefined }).format(now)}`;
      }
    }
    
    return result;
  },
}; 