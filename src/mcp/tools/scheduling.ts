import { z } from 'zod';
import { ToolDefinition, ToolContext } from '../types';
import { PlanningCenterService } from '../../services/planning-center';

const scheduleTeamSchema = z.object({
  serviceDate: z.string().describe('Date of the service (YYYY-MM-DD format)'),
  assignments: z.array(
    z.object({
      personId: z.string().describe('Planning Center person ID'),
      teamId: z.string().describe('Planning Center team ID'),
      position: z.string().describe('Position/role name')
    })
  ).describe('Array of team assignments')
});

const checkAvailabilitySchema = z.object({
  startDate: z.string().describe('Start date for availability check (YYYY-MM-DD)'),
  endDate: z.string().describe('End date for availability check (YYYY-MM-DD)'),
  teamId: z.string().optional().describe('Specific team ID to check (optional)')
});

const suggestTeamMembersSchema = z.object({
  serviceDate: z.string().describe('Date of the service (YYYY-MM-DD format)'),
  position: z.string().describe('Position/role to fill')
});

async function scheduleTeam(params: z.infer<typeof scheduleTeamSchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.scheduleTeam(params);
}

async function checkAvailability(params: z.infer<typeof checkAvailabilitySchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.getAvailability(params);
}

async function suggestTeamMembers(params: z.infer<typeof suggestTeamMembersSchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.suggestTeamMembers(params);
}

async function getTeamMembers(_params: {}, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.getTeamMembers();
}

export const schedulingTools: Record<string, ToolDefinition> = {
  scheduleTeam: {
    description: 'Schedule team members for a specific service date with their positions',
    inputSchema: scheduleTeamSchema,
    handler: scheduleTeam
  },
  checkAvailability: {
    description: 'Check team member availability for a date range, optionally filtered by team',
    inputSchema: checkAvailabilitySchema,
    handler: checkAvailability
  },
  suggestTeamMembers: {
    description: 'Get AI-powered suggestions for team members based on past scheduling patterns',
    inputSchema: suggestTeamMembersSchema,
    handler: suggestTeamMembers
  },
  getTeamMembers: {
    description: 'Get all teams and their members from the organization',
    inputSchema: z.object({}),
    handler: getTeamMembers
  }
};