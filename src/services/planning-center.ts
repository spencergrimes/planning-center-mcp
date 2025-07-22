import { ToolContext } from '../mcp/types';
import { PlanningCenterClient } from '../integrations/planning-center/client';
import { EncryptionService } from '../shared/auth/encryption';
import { AppError } from '../shared/utils/error-handler';

export class PlanningCenterService {
  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  private async getClient(): Promise<PlanningCenterClient> {
    // Get the connection for this organization
    const connection = await this.context.prisma.planningCenterConnection.findUnique({
      where: { organizationId: this.context.user.organizationId }
    });

    if (!connection) {
      throw new AppError(404, 'Planning Center not connected', 'NOT_CONNECTED');
    }

    if (connection.connectionStatus !== 'ACTIVE') {
      throw new AppError(400, 'Planning Center connection is not active', 'CONNECTION_INACTIVE');
    }

    // Decrypt credentials
    const encryption = new EncryptionService();
    const appId = encryption.decrypt(connection.encryptedAppId!);
    const secret = encryption.decrypt(connection.encryptedSecret!);

    return new PlanningCenterClient({ appId, secret });
  }

  // People management methods
  async searchPeople(params: { query?: string; email?: string; phoneNumber?: string }) {
    const client = await this.getClient();
    
    const searchParams: any = {};
    if (params.query) {
      searchParams.where = { search_name_or_email: params.query };
    } else if (params.email) {
      searchParams.where = { search_email: params.email };
    } else if (params.phoneNumber) {
      searchParams.where = { search_phone_number: params.phoneNumber };
    }

    const response = await client.getPeople(searchParams);
    
    // Cache the results
    for (const person of response.data.data || []) {
      await this.context.prisma.person.upsert({
        where: {
          organizationId_pcoId: {
            organizationId: this.context.user.organizationId,
            pcoId: person.id
          }
        },
        create: {
          organizationId: this.context.user.organizationId,
          pcoId: person.id,
          firstName: person.attributes.first_name,
          lastName: person.attributes.last_name,
          email: person.attributes.email_addresses?.[0]?.address,
          phoneNumber: person.attributes.phone_numbers?.[0]?.number,
          status: person.attributes.status,
          syncedAt: new Date()
        },
        update: {
          firstName: person.attributes.first_name,
          lastName: person.attributes.last_name,
          email: person.attributes.email_addresses?.[0]?.address,
          phoneNumber: person.attributes.phone_numbers?.[0]?.number,
          status: person.attributes.status,
          syncedAt: new Date()
        }
      });
    }

    return {
      people: response.data.data.map((person: any) => ({
        id: person.id,
        name: `${person.attributes.first_name} ${person.attributes.last_name}`,
        email: person.attributes.email_addresses?.[0]?.address,
        phone: person.attributes.phone_numbers?.[0]?.number,
        status: person.attributes.status
      }))
    };
  }

  async getPersonDetails(personId: string) {
    const client = await this.getClient();
    const response = await client.getPerson(personId);
    const person = response.data.data;

    return {
      id: person.id,
      name: `${person.attributes.first_name} ${person.attributes.last_name}`,
      email: person.attributes.email_addresses?.[0]?.address,
      phone: person.attributes.phone_numbers?.[0]?.number,
      status: person.attributes.status,
      createdAt: person.attributes.created_at,
      updatedAt: person.attributes.updated_at
    };
  }

  // Team scheduling methods
  async scheduleTeam(params: { 
    serviceDate: string; 
    assignments: Array<{ personId: string; teamId: string; position: string }> 
  }) {
    // This would integrate with Planning Center's scheduling API
    // For now, return a placeholder response
    return {
      message: 'Team scheduling feature coming soon',
      serviceDate: params.serviceDate,
      assignmentCount: params.assignments.length
    };
  }

  async getAvailability(params: { startDate: string; endDate: string; teamId?: string }) {
    // This would check team member availability
    return {
      message: 'Availability check feature coming soon',
      dateRange: `${params.startDate} to ${params.endDate}`,
      teamId: params.teamId
    };
  }

  async suggestTeamMembers(params: { serviceDate: string; position: string }) {
    // This would analyze past scheduling patterns
    return {
      message: 'Team suggestion feature coming soon',
      serviceDate: params.serviceDate,
      position: params.position
    };
  }

  // Song management methods
  async searchSongs(query: string) {
    const client = await this.getClient();
    const response = await client.searchSongs(query);
    
    // Cache the results
    for (const song of response.data.data || []) {
      await this.context.prisma.song.upsert({
        where: {
          organizationId_pcoId: {
            organizationId: this.context.user.organizationId,
            pcoId: song.id
          }
        },
        create: {
          organizationId: this.context.user.organizationId,
          pcoId: song.id,
          title: song.attributes.title,
          author: song.attributes.author,
          ccliNumber: song.attributes.ccli_number,
          themes: song.attributes.themes || [],
          lastUsedAt: song.attributes.last_scheduled_at ? new Date(song.attributes.last_scheduled_at) : null,
          syncedAt: new Date()
        },
        update: {
          title: song.attributes.title,
          author: song.attributes.author,
          ccliNumber: song.attributes.ccli_number,
          themes: song.attributes.themes || [],
          lastUsedAt: song.attributes.last_scheduled_at ? new Date(song.attributes.last_scheduled_at) : null,
          syncedAt: new Date()
        }
      });
    }

    return {
      songs: response.data.data.map((song: any) => ({
        id: song.id,
        title: song.attributes.title,
        author: song.attributes.author,
        ccli: song.attributes.ccli_number,
        themes: song.attributes.themes || [],
        lastUsed: song.attributes.last_scheduled_at
      }))
    };
  }

  async getSongsByTheme(theme: string) {
    // First check cache
    const cachedSongs = await this.context.prisma.song.findMany({
      where: {
        organizationId: this.context.user.organizationId,
        themes: { has: theme }
      }
    });

    if (cachedSongs.length > 0) {
      return {
        songs: cachedSongs.map(song => ({
          id: song.pcoId,
          title: song.title,
          author: song.author || 'Unknown',
          ccli: song.ccliNumber || '',
          themes: song.themes,
          lastUsed: song.lastUsedAt
        }))
      };
    }

    // If no cache, search Planning Center
    const client = await this.getClient();
    const response = await client.getSongs({ where: { theme } });
    
    return {
      songs: response.data.data.map((song: any) => ({
        id: song.id,
        title: song.attributes.title,
        author: song.attributes.author,
        ccli: song.attributes.ccli_number,
        themes: song.attributes.themes || [],
        lastUsed: song.attributes.last_scheduled_at
      }))
    };
  }

  // Service management methods
  async getUpcomingServices(limit: number = 10) {
    const client = await this.getClient();
    const serviceTypes = await client.getServiceTypes();
    
    const services = [];
    for (const serviceType of serviceTypes.data.data || []) {
      const plans = await client.getPlans(serviceType.id, {
        filter: 'future',
        per_page: limit
      });
      
      for (const plan of plans.data.data || []) {
        services.push({
          id: plan.id,
          title: plan.attributes.title,
          seriesTitle: plan.attributes.series_title,
          date: plan.attributes.sort_date,
          serviceType: serviceType.attributes.name
        });
      }
    }

    // Sort by date
    services.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return {
      services: services.slice(0, limit)
    };
  }

  async getServiceDetails(serviceId: string) {
    // This would get detailed service information
    return {
      message: 'Service details feature coming soon',
      serviceId
    };
  }

  async getTeamMembers() {
    // Get all teams and their members from cache first
    const teams = await this.context.prisma.team.findMany({
      where: { organizationId: this.context.user.organizationId },
      include: {
        teamMembers: {
          include: {
            person: true
          }
        }
      }
    });

    if (teams.length > 0) {
      return {
        teams: teams.map(team => ({
          id: team.pcoId,
          name: team.name,
          position: team.position,
          members: team.teamMembers.map(tm => ({
            id: tm.person.pcoId,
            name: `${tm.person.firstName} ${tm.person.lastName}`,
            email: tm.person.email,
            status: tm.status
          }))
        }))
      };
    }

    // If no cache, fetch from Planning Center
    const client = await this.getClient();
    const serviceTypes = await client.getServiceTypes();
    
    const allTeams = [];
    for (const serviceType of serviceTypes.data.data || []) {
      const teams = await client.getTeams(serviceType.id);
      
      for (const team of teams.data.data || []) {
        const members = await client.getTeamMembers(serviceType.id, team.id);
        
        allTeams.push({
          id: team.id,
          name: team.attributes.name,
          position: team.attributes.position,
          members: members.data.data.map((member: any) => ({
            id: member.id,
            name: member.attributes.name,
            email: member.attributes.email,
            status: member.attributes.status
          }))
        });
      }
    }

    return { teams: allTeams };
  }
}