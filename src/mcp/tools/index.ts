import { ToolDefinition } from '../types';
import { peopleTools } from './people';
import { songTools } from './songs';
import { serviceTools } from './services';
import { schedulingTools } from './scheduling';

// Help tool
const helpTool: ToolDefinition = {
  description: 'Show available tools and their descriptions',
  inputSchema: {} as any,
  handler: async (params, context) => {
    const toolList = Object.entries(tools).map(([name, tool]) => 
      `• ${name}: ${tool.description}`
    ).join('\n');
    
    return `Available tools:
${toolList}

You can use these tools by asking questions like:
- "Show me upcoming services"
- "Find songs with the theme 'Christmas'"
- "Who's on the worship team for this Sunday?"
- "Search for John Smith in our directory"`;
  }
};

// Combine all tools into a single export
export const tools: Record<string, ToolDefinition> = {
  help: helpTool,
  ...peopleTools,
  ...songTools,
  ...serviceTools,
  ...schedulingTools
};