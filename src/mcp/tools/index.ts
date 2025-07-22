import { ToolDefinition } from '../types';
import { peopleTools } from './people';
import { songTools } from './songs';
import { serviceTools } from './services';
import { schedulingTools } from './scheduling';

// Combine all tools into a single export
export const tools: Record<string, ToolDefinition> = {
  ...peopleTools,
  ...songTools,
  ...serviceTools,
  ...schedulingTools
};