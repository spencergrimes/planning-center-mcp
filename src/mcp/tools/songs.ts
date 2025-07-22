import { z } from 'zod';
import { ToolDefinition, ToolContext } from '../types';
import { PlanningCenterService } from '../../services/planning-center';

const searchSongsSchema = z.object({
  query: z.string().describe('Search query for songs (title, author, etc.)')
});

const getSongsByThemeSchema = z.object({
  theme: z.string().describe('Theme or tag to search for (e.g., "Christmas", "Easter", "Worship")')
});

async function searchSongs(params: z.infer<typeof searchSongsSchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.searchSongs(params.query);
}

async function getSongsByTheme(params: z.infer<typeof getSongsByThemeSchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.getSongsByTheme(params.theme);
}

export const songTools: Record<string, ToolDefinition> = {
  searchSongs: {
    description: 'Search for songs in Planning Center by title, author, or other attributes',
    inputSchema: searchSongsSchema,
    handler: searchSongs
  },
  getSongsByTheme: {
    description: 'Find songs by theme or tag (e.g., Christmas, Easter, Worship, etc.)',
    inputSchema: getSongsByThemeSchema,
    handler: getSongsByTheme
  }
};