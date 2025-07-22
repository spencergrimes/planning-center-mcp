import { z } from 'zod';
import { ToolDefinition, ToolContext } from '../types';
import { PlanningCenterService } from '../../services/planning-center';

const getUpcomingServicesSchema = z.object({
  limit: z.number().optional().default(10).describe('Maximum number of services to return (default: 10)')
});

const getServiceDetailsSchema = z.object({
  serviceId: z.string().describe('Planning Center service/plan ID')
});

async function getUpcomingServices(params: z.infer<typeof getUpcomingServicesSchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.getUpcomingServices(params.limit);
}

async function getServiceDetails(params: z.infer<typeof getServiceDetailsSchema>, context: ToolContext) {
  const pcService = new PlanningCenterService(context);
  return await pcService.getServiceDetails(params.serviceId);
}

export const serviceTools: Record<string, ToolDefinition> = {
  getUpcomingServices: {
    description: 'Get a list of upcoming services/plans from Planning Center Services',
    inputSchema: getUpcomingServicesSchema,
    handler: getUpcomingServices
  },
  getServiceDetails: {
    description: 'Get detailed information about a specific service/plan',
    inputSchema: getServiceDetailsSchema,
    handler: getServiceDetails
  }
};