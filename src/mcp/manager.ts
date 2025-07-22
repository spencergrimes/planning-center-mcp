import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { FastifyBaseLogger } from 'fastify';
import { tools } from './tools';
import { ToolContext, MCPMessage, MCPResponse } from './types';

export class MCPManager {
  private server: Server;
  private transport?: StdioServerTransport;

  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private logger: FastifyBaseLogger
  ) {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'planning-center-mcp',
        version: process.env.MCP_SERVER_VERSION || '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    }));

    // Execute tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = tools[name];
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      // This will be called with proper context when invoked through handleMessage
      const context = (request as any).context as ToolContext;
      
      try {
        const result = await tool.handler(args, context);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        this.logger.error({ error, tool: name }, 'Tool execution failed');
        throw error;
      }
    });
  }

  async initialize() {
    try {
      // For now, we'll skip stdio transport as it's for CLI mode
      // The WebSocket handles the communication
      this.logger.info('MCP server initialized');
    } catch (error) {
      this.logger.error(error, 'Failed to initialize MCP server');
      throw error;
    }
  }

  async handleMessage(message: MCPMessage, user: any): Promise<MCPResponse> {
    // Create context for tool execution
    const context: ToolContext = {
      prisma: this.prisma,
      redis: this.redis,
      logger: this.logger,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        role: user.role
      }
    };

    // Parse message and determine tool to execute
    const { tool, parameters } = this.parseMessage(message);

    if (!tools[tool]) {
      return {
        success: false,
        error: `Unknown tool: ${tool}`,
        availableTools: Object.keys(tools)
      };
    }

    try {
      const result = await tools[tool].handler(parameters, context);
      return {
        success: true,
        tool,
        result
      };
    } catch (error: any) {
      this.logger.error({ error, tool, user: user.id }, 'Tool execution failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  private parseMessage(message: MCPMessage) {
    // Simple parsing - enhance based on your chat UI needs
    if (message.tool && message.parameters) {
      return {
        tool: message.tool,
        parameters: message.parameters
      };
    }

    // Natural language parsing would go here
    // For now, return a help message
    return {
      tool: 'help',
      parameters: {}
    };
  }

  isHealthy(): boolean {
    return true;
  }

  async close() {
    if (this.transport) {
      await this.server.close();
    }
  }
}