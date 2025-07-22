import axios, { AxiosInstance } from 'axios';
import { RateLimiter } from '../../shared/utils/rate-limiter';

export interface PlanningCenterConfig {
  appId: string;
  secret: string;
  organizationId?: string;
}

export class PlanningCenterClient {
  private api: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor(config: PlanningCenterConfig) {
    this.api = axios.create({
      baseURL: 'https://api.planningcenteronline.com',
      auth: {
        username: config.appId,
        password: config.secret
      },
      headers: {
        'User-Agent': 'PlanningCenterMCP/1.0'
      }
    });

    // 100 requests per minute
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 100,
      interval: 60000,
      fireImmediately: true
    });
  }

  async testConnection() {
    try {
      const response = await this.rateLimiter.execute(() =>
        this.api.get('/people/v2')
      );

      return {
        success: true,
        organizationId: response.data.data[0]?.relationships?.organization?.data?.id,
        organizationName: response.data.data[0]?.attributes?.name
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // People endpoints
  async getPeople(params?: any) {
    return this.rateLimiter.execute(() =>
      this.api.get('/people/v2/people', { params })
    );
  }

  async getPerson(id: string) {
    return this.rateLimiter.execute(() =>
      this.api.get(`/people/v2/people/${id}`)
    );
  }

  // Services endpoints
  async getServiceTypes() {
    return this.rateLimiter.execute(() =>
      this.api.get('/services/v2/service_types')
    );
  }

  async getPlans(serviceTypeId: string, params?: any) {
    return this.rateLimiter.execute(() =>
      this.api.get(`/services/v2/service_types/${serviceTypeId}/plans`, { params })
    );
  }

  async getTeams(serviceTypeId: string) {
    return this.rateLimiter.execute(() =>
      this.api.get(`/services/v2/service_types/${serviceTypeId}/teams`)
    );
  }

  async getTeamMembers(serviceTypeId: string, teamId: string) {
    return this.rateLimiter.execute(() =>
      this.api.get(`/services/v2/service_types/${serviceTypeId}/teams/${teamId}/people`)
    );
  }

  // Songs endpoints
  async getSongs(params?: any) {
    return this.rateLimiter.execute(() =>
      this.api.get('/services/v2/songs', { params })
    );
  }

  async searchSongs(query: string) {
    return this.rateLimiter.execute(() =>
      this.api.get('/services/v2/songs', {
        params: { 
          where: { search: query }
        }
      })
    );
  }

  // Scheduling endpoints
  async createPlanPerson(planId: string, data: any) {
    return this.rateLimiter.execute(() =>
      this.api.post(`/services/v2/plans/${planId}/team_members`, { data })
    );
  }

  async updatePlanPerson(planId: string, personId: string, data: any) {
    return this.rateLimiter.execute(() =>
      this.api.patch(`/services/v2/plans/${planId}/team_members/${personId}`, { data })
    );
  }
}