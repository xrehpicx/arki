import { config } from '../../config/config';
import type { 
  OpenProjectCollection, 
  OpenProjectProject, 
  OpenProjectUser, 
  OpenProjectWorkPackage, 
  OpenProjectType, 
  OpenProjectStatus, 
  OpenProjectPriority,
  CreateWorkPackageRequest,
  UpdateWorkPackageRequest,
  WorkPackageFilters
} from './types';

/**
 * OpenProject API Client
 * Handles all HTTP communication with the OpenProject API v3
 */
export class OpenProjectApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.openProject.baseUrl;
    this.apiKey = config.openProject.apiKey;
  }

  /**
   * Make authenticated request to OpenProject API
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v3${endpoint}`;
    
    const headers = {
      'Authorization': `Basic ${Buffer.from(`apikey:${this.apiKey}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenProject API error (${response.status}): ${errorText}`);
    }

    return response.json() as T;
  }

  /**
   * Build filter query string for work packages
   */
  private buildFilterQuery(filters: WorkPackageFilters): string {
    const filterArray: any[] = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Multiple values - use "=" operator with multiple values
          filterArray.push({
            [key]: {
              operator: "=",
              values: value.map(v => String(v))
            }
          });
        } else {
          const stringValue = String(value);
          
          // Handle different types of filters
          if (key === 'subject' || key === 'description') {
            // Text search filters use "**" (contains) operator
            filterArray.push({
              [key]: {
                operator: "**", 
                values: [stringValue]
              }
            });
          } else if (key === 'createdAt' || key === 'updatedAt' || key === 'startDate' || key === 'dueDate') {
            // Date filters - parse the special format created by the tool
            if (stringValue.includes('<>d:')) {
              // Date range format: "<>d:start_date,end_date"
              const parts = stringValue.split('<>d:');
              if (parts.length === 2 && parts[1]) {
                const [startDate, endDate] = parts[1].split(',');
                if (startDate && endDate) {
                  filterArray.push({
                    [key]: {
                      operator: "<>d",
                      values: [startDate, endDate]
                    }
                  });
                }
              }
            } else if (stringValue.includes('>=') && stringValue.includes('<')) {
              // Handle malformed concatenated strings from old implementation
              // Extract start and end dates from strings like ">=2023-01-01T00:00:00Z<2023-12-31T23:59:59Z"
              const match = stringValue.match(/>=(.+?)T\d{2}:\d{2}:\d{2}Z<(.+?)T\d{2}:\d{2}:\d{2}Z/);
              if (match) {
                const [, startDate, endDate] = match;
                filterArray.push({
                  [key]: {
                    operator: "<>d",
                    values: [`${startDate}T00:00:00Z`, `${endDate}T23:59:59Z`]
                  }
                });
              }
            } else if (stringValue.startsWith('>=')) {
              // Single "greater than or equal" date
              const dateValue = stringValue.substring(2);
              filterArray.push({
                [key]: {
                  operator: ">=",
                  values: [dateValue]
                }
              });
            } else if (stringValue.startsWith('<')) {
              // Single "less than" date
              const dateValue = stringValue.substring(1);
              filterArray.push({
                [key]: {
                  operator: "<",
                  values: [dateValue]
                }
              });
            } else {
              // Exact date match
              filterArray.push({
                [key]: {
                  operator: "=d",
                  values: [stringValue]
                }
              });
            }
          } else {
            // Regular filters (project, status, type, etc.) use "=" operator
            filterArray.push({
              [key]: {
                operator: "=",
                values: [stringValue]
              }
            });
          }
        }
      }
    });

    if (filterArray.length === 0) {
      return '';
    }

    // Encode the filter array as JSON and return as URL parameter
    const params = new URLSearchParams();
    const filtersJson = JSON.stringify(filterArray);
    console.log(`[OpenProjectAPI] Building filter query:`, filtersJson);
    params.append('filters', filtersJson);
    return params.toString();
  }

  // Project operations
  async listProjects(): Promise<OpenProjectCollection<OpenProjectProject>> {
    return this.makeRequest<OpenProjectCollection<OpenProjectProject>>('/projects');
  }

  async getProject(id: number): Promise<OpenProjectProject> {
    return this.makeRequest<OpenProjectProject>(`/projects/${id}`);
  }

  // User operations
  async listUsers(): Promise<OpenProjectCollection<OpenProjectUser>> {
    return this.makeRequest<OpenProjectCollection<OpenProjectUser>>('/users');
  }

  async getUser(id: number): Promise<OpenProjectUser> {
    return this.makeRequest<OpenProjectUser>(`/users/${id}`);
  }

  async searchUsers(name: string): Promise<OpenProjectCollection<OpenProjectUser>> {
    // Use the same filter format as work packages for consistency
    const filterArray = [
      {
        name: {
          operator: "~", // Use '~' (contains) operator for user name search
          values: [name]
        }
      }
    ];
    
    const params = new URLSearchParams();
    params.append('filters', JSON.stringify(filterArray));
    return this.makeRequest<OpenProjectCollection<OpenProjectUser>>(`/users?${params}`);
  }

  // Work package operations
  async listWorkPackages(filters?: WorkPackageFilters): Promise<OpenProjectCollection<OpenProjectWorkPackage>> {
    const query = filters ? this.buildFilterQuery(filters) : '';
    const endpoint = query ? `/work_packages?${query}` : '/work_packages';
    return this.makeRequest<OpenProjectCollection<OpenProjectWorkPackage>>(endpoint);
  }

  async getWorkPackage(id: number): Promise<OpenProjectWorkPackage> {
    return this.makeRequest<OpenProjectWorkPackage>(`/work_packages/${id}`);
  }

  async createWorkPackage(data: CreateWorkPackageRequest): Promise<OpenProjectWorkPackage> {
    return this.makeRequest<OpenProjectWorkPackage>('/work_packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkPackage(id: number, data: UpdateWorkPackageRequest): Promise<OpenProjectWorkPackage> {
    return this.makeRequest<OpenProjectWorkPackage>(`/work_packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkPackage(id: number): Promise<void> {
    await this.makeRequest<void>(`/work_packages/${id}`, {
      method: 'DELETE',
    });
  }

  // Metadata operations (for getting available types, statuses, priorities)
  async listTypes(): Promise<OpenProjectCollection<OpenProjectType>> {
    return this.makeRequest<OpenProjectCollection<OpenProjectType>>('/types');
  }

  async listStatuses(): Promise<OpenProjectCollection<OpenProjectStatus>> {
    return this.makeRequest<OpenProjectCollection<OpenProjectStatus>>('/statuses');
  }

  async listPriorities(): Promise<OpenProjectCollection<OpenProjectPriority>> {
    return this.makeRequest<OpenProjectCollection<OpenProjectPriority>>('/priorities');
  }

  // Form endpoint for getting available options when creating work packages
  async getWorkPackageForm(projectId?: number): Promise<any> {
    const endpoint = projectId 
      ? `/projects/${projectId}/work_packages/form`
      : '/work_packages/form';
    return this.makeRequest(endpoint, { method: 'POST' });
  }

  // Helper methods to extract IDs and build hrefs
  buildProjectHref(projectId: number): string {
    return `${this.baseUrl}/api/v3/projects/${projectId}`;
  }

  buildUserHref(userId: number): string {
    return `${this.baseUrl}/api/v3/users/${userId}`;
  }

  buildTypeHref(typeId: number): string {
    return `${this.baseUrl}/api/v3/types/${typeId}`;
  }

  buildStatusHref(statusId: number): string {
    return `${this.baseUrl}/api/v3/statuses/${statusId}`;
  }

  buildPriorityHref(priorityId: number): string {
    return `${this.baseUrl}/api/v3/priorities/${priorityId}`;
  }

  buildWorkPackageUrl(workPackageId: number): string {
    return `${this.baseUrl}/work_packages/${workPackageId}`;
  }

  buildProjectUrl(projectId: number): string {
    return `${this.baseUrl}/projects/${projectId}`;
  }

  buildUserUrl(userId: number): string {
    return `${this.baseUrl}/users/${userId}`;
  }
} 