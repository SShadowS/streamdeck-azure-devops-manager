import { azureDevOpsClient } from '../azureDevOpsClient';
import { IAzureDevOpsAuthSettings, PullRequestStatus, BuildStatus, BuildResult, IPipelineDefinition } from '../../types/ado';

// Mock the global fetch function
global.fetch = jest.fn();

// Mock console methods to reduce noise in test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Type for our mocked fetch
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Helper to create mock responses
const createMockResponse = (status: number, data: unknown): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data)
  } as unknown as Response;
};

describe('AzureDevOpsClient', () => {
  const testSettings: IAzureDevOpsAuthSettings = {
    organizationUrl: 'https://dev.azure.com/test-org',
    personalAccessToken: 'test-token'
  };

  beforeEach(() => {
    // Reset any mocks and initialize with test settings
    jest.clearAllMocks();
    azureDevOpsClient.initialize(testSettings);
    
    // Also clear the cache before each test
    azureDevOpsClient.clearCache();
  });

  describe('initialization', () => {
    it('should initialize with the provided auth settings', () => {
      // This test just verifies the client initializes without errors
      expect(() => {
        azureDevOpsClient.initialize(testSettings);
      }).not.toThrow();
    });

    it('should throw an error when methods are called before initialization', () => {
      // Create a new instance to ensure it's not initialized
      const newClient = Object.create(azureDevOpsClient);
      
      // @ts-ignore - Access private method for testing
      newClient.authSettings = null;
      
      expect(() => {
        // @ts-ignore - Access private method for testing
        newClient.ensureInitialized();
      }).toThrow('AzureDevOpsClient is not initialized');
    });
  });

  describe('API methods', () => {
    it('should fetch pipeline definitions', async () => {
      const projectName = 'test-project';
      const mockDefinitions = [
        {
          id: 1,
          name: 'Test Pipeline',
          revision: 1,
          path: '\\',
          project: {
            id: 'project-id',
            name: projectName
          }
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockDefinitions));

      const definitions = await azureDevOpsClient.getPipelineDefinitions(projectName);
      
      // Verify correct URL was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain(`test-org/${projectName}/_apis/build/definitions`);
      
      // Verify response handling
      expect(definitions).toEqual(mockDefinitions);
      expect(definitions.length).toBe(1);
      expect(definitions[0].project.name).toBe(projectName);
    });

    it('should fetch pipeline status', async () => {
      const projectName = 'test-project';
      const pipelineId = 1;
      const mockStatus = [
        {
          id: 100,
          buildNumber: '20250512.1',
          status: BuildStatus.Completed,
          result: BuildResult.Succeeded,
          queueTime: '2025-05-12T10:00:00.000Z',
          startTime: '2025-05-12T10:01:00.000Z',
          finishTime: '2025-05-12T10:05:00.000Z',
          url: `https://dev.azure.com/test-org/${projectName}/_build/results?buildId=100`,
          definition: {
            id: pipelineId,
            name: 'Test Pipeline'
          },
          project: {
            id: 'project-id',
            name: projectName
          },
          requestedBy: {
            displayName: 'Test User',
            id: 'user-id',
            uniqueName: 'test@example.com'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockStatus));

      const status = await azureDevOpsClient.getPipelineStatus(projectName, pipelineId);
      
      // Verify correct URL was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain(`test-org/${projectName}/_apis/build/builds?definitions=${pipelineId}`);
      
      // Verify response handling
      expect(status).toEqual(mockStatus[0]);
      expect(status?.definition.id).toBe(pipelineId);
    });

    it('should return null when no pipeline builds are found', async () => {
      const projectName = 'test-project';
      const pipelineId = 1;
      
      // Mock an empty response
      mockFetch.mockResolvedValueOnce(createMockResponse(200, []));

      const status = await azureDevOpsClient.getPipelineStatus(projectName, pipelineId);
      
      expect(status).toBeNull();
    });

    it('should fetch pull requests', async () => {
      const projectName = 'test-project';
      const repoName = 'test-repo';
      const mockPRs = {
        value: [
          {
            pullRequestId: 123,
            title: 'Test Pull Request',
            status: PullRequestStatus.Active,
            createdBy: {
              displayName: 'Test User',
              id: 'user-id'
            },
            creationDate: '2025-05-12T09:00:00.000Z',
            repository: {
              id: 'repo-id',
              name: repoName,
              url: `https://dev.azure.com/test-org/${projectName}/_git/${repoName}`
            },
            sourceRefName: 'refs/heads/feature/test',
            targetRefName: 'refs/heads/main',
            mergeStatus: 'succeeded',
            isDraft: false
          }
        ]
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockPRs));

      const prs = await azureDevOpsClient.getPullRequests(
        projectName, 
        repoName, 
        PullRequestStatus.Active
      );
      
      // Verify correct URL was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain(`test-org/${projectName}/_apis/git/repositories/${repoName}/pullrequests`);
      expect(mockFetch.mock.calls[0][0]).toContain('searchCriteria.status=active');
      
      // Verify response handling
      expect(prs).toEqual(mockPRs.value);
      expect(prs.length).toBe(1);
      expect(prs[0].repository.name).toBe(repoName);
    });

    it('should return empty array when pull request endpoint returns 404', async () => {
      const projectName = 'test-project';
      const repoName = 'non-existent-repo';
      
      // Mock a 404 response
      mockFetch.mockResolvedValueOnce(createMockResponse(404, { message: 'Not found' }));

      const prs = await azureDevOpsClient.getPullRequests(
        projectName, 
        repoName, 
        PullRequestStatus.Active
      );
      
      expect(prs).toBeInstanceOf(Array);
      expect(prs.length).toBe(0);
    });

    it('should test connection successfully', async () => {
      // Mock a successful response for the projects API
      mockFetch.mockResolvedValueOnce(createMockResponse(200, { count: 1 }));

      const result = await azureDevOpsClient.testConnection();
      
      // Verify correct URL was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('test-org/_apis/projects');
      expect(result).toBe(true);
    });

    it('should return false when connection test fails', async () => {
      // Mock a failed response
      mockFetch.mockResolvedValueOnce(createMockResponse(401, { message: 'Unauthorized' }));

      const result = await azureDevOpsClient.testConnection();
      
      expect(result).toBe(false);
    });

    it('should fetch projects', async () => {
      // Define interface for project response type
      interface IProjectResponse {
        count: number;
        value: Array<{
          id: string;
          name: string;
          description?: string;
          state?: string;
        }>;
      }

      // Mock a successful projects response
      const mockProjects: IProjectResponse = {
        count: 2,
        value: [
          {
            id: 'project-id-1',
            name: 'Test Project 1',
            description: 'First test project',
            state: 'wellFormed'
          },
          {
            id: 'project-id-2',
            name: 'Test Project 2',
            description: 'Second test project',
            state: 'wellFormed'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockProjects));

      const projectsResponse = await azureDevOpsClient.getProjects(10, 0);
      
      // Verify correct URL was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('test-org/_apis/projects');
      expect(mockFetch.mock.calls[0][0]).toContain('$top=10');
      expect(mockFetch.mock.calls[0][0]).toContain('$skip=0');
      expect(mockFetch.mock.calls[0][0]).toContain('stateFilter=All');
      
      // Verify response handling with type assertion
      expect(projectsResponse).toEqual(mockProjects);
      
      // Type assertion to help TypeScript understand the structure
      const typedResponse = projectsResponse as IProjectResponse;
      expect(typedResponse.count).toBe(2);
      expect(typedResponse.value.length).toBe(2);
      expect(typedResponse.value[0].name).toBe('Test Project 1');
      expect(typedResponse.value[1].name).toBe('Test Project 2');
    });
  });

  describe('error handling', () => {
    it('should throw an error for authentication issues', async () => {
      const projectName = 'test-project';
      
      // Mock a 401 Unauthorized response
      mockFetch.mockResolvedValueOnce(createMockResponse(401, { message: 'Unauthorized' }));

      await expect(azureDevOpsClient.getPipelineDefinitions(projectName))
        .rejects.toThrow('API request failed (401)');
    });
  });

  describe('error categorization', () => {
    it('should handle not found errors by returning empty results', async () => {
      const testProjectName = 'test-project';
      
      // Test with a 404 Not Found error
      mockFetch.mockResolvedValueOnce(createMockResponse(404, { message: 'Not Found' }));
      
      // Use the PR method because it handles 404s by returning an empty array instead of throwing
      const notFoundResult = await azureDevOpsClient.getPullRequests(testProjectName, 'non-existent-repo');
      expect(notFoundResult).toEqual([]);
    });
    
    it('should throw on authentication errors', async () => {
      const projectName = 'test-project';
      
      // Test with a 401 Unauthorized error
      mockFetch.mockResolvedValueOnce(createMockResponse(401, { message: 'Unauthorized' }));
      
      await expect(azureDevOpsClient.getPipelineDefinitions(projectName))
        .rejects.toThrow('API request failed (401)');
    });
    
    it('should recognize rate limit errors', async () => {
      const projectName = 'test-project';
      
      // For this test, we need to disable retries completely
      // @ts-ignore - Access private property
      const originalMaxRetries = azureDevOpsClient.maxRetries;
      // @ts-ignore - Set private property
      azureDevOpsClient.maxRetries = 0;
      
      try {
        // Test with a 429 Too Many Requests error
        mockFetch.mockResolvedValueOnce(createMockResponse(429, { message: 'Too Many Requests' }));
        
        await expect(azureDevOpsClient.getPipelineDefinitions(projectName))
          .rejects.toThrow('API request failed (429)');
      } finally {
        // Restore original max retries
        // @ts-ignore - Set private property
        azureDevOpsClient.maxRetries = originalMaxRetries;
      }
    });
  });

  describe('caching', () => {
    it('should cache API responses', async () => {
      const projectName = 'test-project';
      const mockData: IPipelineDefinition[] = [];
      
      // Mock a successful response
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockData));

      // First call should make a fetch request
      await azureDevOpsClient.getPipelineDefinitions(projectName);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second call should use cached data and not make a fetch request
      await azureDevOpsClient.getPipelineDefinitions(projectName);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should skip cache when requested', async () => {
      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, { count: 1 }))
        .mockResolvedValueOnce(createMockResponse(200, { count: 1 }));

      // First call
      await azureDevOpsClient.testConnection();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second call - testConnection uses skipCache option
      await azureDevOpsClient.testConnection();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on re-initialization', async () => {
      const projectName = 'test-project';
      const mockData: IPipelineDefinition[] = [];
      
      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, mockData))
        .mockResolvedValueOnce(createMockResponse(200, mockData));

      // First call to cache the data
      await azureDevOpsClient.getPipelineDefinitions(projectName);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Re-initialize the client
      azureDevOpsClient.initialize(testSettings);
      
      // This call should make a new fetch request since cache was cleared
      await azureDevOpsClient.getPipelineDefinitions(projectName);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
