import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';

export interface ToolContext {
  prisma: PrismaClient;
  redis: Redis;
  logger: FastifyBaseLogger;
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export interface ToolDefinition {
  description: string;
  inputSchema: z.ZodSchema<any>;
  handler: (params: any, context: ToolContext) => Promise<any>;
}

export interface MCPMessage {
  tool?: string;
  parameters?: any;
  content?: string;
  type?: string;
}

export interface MCPResponse {
  success: boolean;
  tool?: string;
  result?: any;
  error?: string;
  availableTools?: string[];
}