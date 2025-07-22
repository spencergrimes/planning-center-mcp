import { test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build, cleanup } from '../helpers/app';
import { setupTestDb, teardownTestDb, createTestOrganization, createTestUser } from '../helpers/db';

describe('MCP Integration', () => {
  let app: FastifyInstance;
  let orgId: string;
  let user: any;

  beforeAll(async () => {
    app = await build();
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
    await cleanup(app);
  });

  beforeEach(async () => {
    await setupTestDb();
    const org = await createTestOrganization();
    orgId = org.id;
    user = await createTestUser(orgId);
  });

  test('MCP Manager should initialize successfully', async () => {
    expect(app.mcp).toBeDefined();
    expect(app.mcp.isHealthy()).toBe(true);
  });

  test('MCP Manager should handle unknown tool', async () => {
    const response = await app.mcp.handleMessage({
      tool: 'unknownTool',
      parameters: {}
    }, user);

    expect(response.success).toBe(false);
    expect(response.error).toContain('Unknown tool: unknownTool');
    expect(response.availableTools).toBeDefined();
    expect(response.availableTools).toContain('searchPeople');
  });

  test('MCP Manager should handle help tool', async () => {
    const response = await app.mcp.handleMessage({
      tool: 'help',
      parameters: {}
    }, user);

    expect(response.success).toBe(true);
    expect(response.result).toContain('Available tools:');
    expect(response.result).toContain('searchPeople');
    expect(response.result).toContain('getUpcomingServices');
  });

  test('MCP Manager should parse natural language message', async () => {
    const response = await app.mcp.handleMessage({
      content: 'Show me upcoming services'
    }, user);

    // Should default to help when no specific tool/parameters are provided
    expect(response.success).toBe(true);
    expect(response.tool).toBe('help');
  });

  test('MCP tools should be available', async () => {
    const mcpManager = app.mcp;
    
    // Test that all expected tools are available
    const helpResponse = await mcpManager.handleMessage({
      tool: 'help',
      parameters: {}
    }, user);

    expect(helpResponse.success).toBe(true);
    const toolsList = helpResponse.result;
    
    // Check for key tools
    expect(toolsList).toContain('searchPeople');
    expect(toolsList).toContain('getUpcomingServices');
    expect(toolsList).toContain('searchSongs');
    expect(toolsList).toContain('getSongsByTheme');
    expect(toolsList).toContain('getTeamMembers');
    expect(toolsList).toContain('scheduleTeam');
  });

  test('MCP should handle tool execution errors gracefully', async () => {
    const response = await app.mcp.handleMessage({
      tool: 'searchPeople',
      parameters: {} // Missing required parameters
    }, user);

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});