import { z } from 'zod';
import { ToolDefinition, ToolContext } from '../types';
import { PlanningCenterService } from '../../services/planning-center';

const searchPeopleSchema = z.object({
  query: z.string().optional().describe('Search by name or general query'),
  email: z.string().optional().describe('Search by specific email address'),
  phoneNumber: z.string().optional().describe('Search by phone number')
}).refine(
  data => data.query || data.email || data.phoneNumber,
  { message: 'At least one search parameter (query, email, or phoneNumber) must be provided' }
);

const getPersonDetailsSchema = z.object({
  personId: z.string().describe('Planning Center person ID')
});

async function searchPeople(params: z.infer<typeof searchPeopleSchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.searchPeople(params);
}

async function getPersonDetails(params: z.infer<typeof getPersonDetailsSchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.getPersonDetails(params.personId);
}

export const peopleTools: Record<string, ToolDefinition> = {
  searchPeople: {
    description: 'Search for people in Planning Center by name, email, or phone number',
    inputSchema: searchPeopleSchema,
    handler: searchPeople
  },
  getPersonDetails: {
    description: 'Get detailed information about a specific person from Planning Center',
    inputSchema: getPersonDetailsSchema,
    handler: getPersonDetails
  }
};