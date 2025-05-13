/**
 * Azure DevOps API Client
 * 
 * This service handles communication with the Azure DevOps REST API.
 * It provides methods for fetching pipeline statuses, pull requests,
 * and other Azure DevOps resources.
 * 
 * Features:
 * - Singleton pattern for consistent configuration
 * - Authentication with Personal Access Tokens
 * - Automatic retries for transient errors
 * - API response caching to reduce API calls
 * - Comprehensive error handling
 */

import { streamDeck } from '@elgato/streamdeck';
import {
  IAzureDevOpsAuthSettings,
  IBuild,
  IPipelineDefinition,
  IPullRequest,
  PullRequestStatus,
  IRepository
} from '../types/ado';
import { ApiError, ApiErrorType } from './apiError';

/**
 * Azure DevOps API client options
 */
interface IAzureDevOpsClientOptions {
  /**
   * Base URL for API requests (default: 'https://dev.azure.com/')
   */
  baseUrl?: string;
  
  /**
   * API version string (default: '7.0')
   */
  apiVersion?: string;

  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;

  /**
   * Cache TTL in milliseconds (default: 5 minutes)
   */
  cacheTtl?: number;
}

/**
 * HTTP request options interface
 */
interface IRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  skipCache?: boolean;
}

/**
 * Cache entry structure
 */
interface ICacheEntry<T> {
  data: T;
  expiry: number;
}


/**
 * Service for interacting with the Azure DevOps REST API
 */
export class AzureDevOpsClient {
  private static instance: AzureDevOpsClient;
  private authSettings: IAzureDevOpsAuthSettings | null = null;
  private baseUrl: string;
  private apiVersion: string;
  private headers: Record<string, string> = {};
  private maxRetries: number;
  private cacheTtl: number;
  private cache: Map<string, ICacheEntry<unknown>> = new Map();
  private testMode = false;

  /**
   * Creates a new instance of the Azure DevOps client
   */
  private constructor(options: IAzureDevOpsClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://dev.azure.com/';
    this.apiVersion = options.apiVersion || '7.1';
    this.maxRetries = options.maxRetries || 3;
    this.cacheTtl = options.cacheTtl || 5 * 60 * 1000; // Default: 5 minutes
    
    // Default headers for all requests
    this.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Gets the singleton instance of the AzureDevOpsClient
   */
  public static getInstance(options: IAzureDevOpsClientOptions = {}): AzureDevOpsClient {
    if (!AzureDevOpsClient.instance) {
      AzureDevOpsClient.instance = new AzureDevOpsClient(options);
    }
    return AzureDevOpsClient.instance;
  }

  /**
   * Initialize the client with authentication settings
   */
  public initialize(authSettings: IAzureDevOpsAuthSettings): void {
    this.authSettings = authSettings;
    
    // Set up the authentication header with the PAT
    const base64Token = Buffer.from(`:${authSettings.personalAccessToken}`).toString('base64');
    this.headers['Authorization'] = `Basic ${base64Token}`;
    
    // Clear the cache when re-initializing with new settings
    this.clearCache();
  }

  /**
   * Check if the client is initialized with auth settings
   */
  private ensureInitialized(): void {
    if (!this.authSettings) {
      throw new Error('AzureDevOpsClient is not initialized. Call initialize() first.');
    }
  }

  /**
   * Extract the organization name from the organization URL
   */
  public getOrganizationName(): string {
    this.ensureInitialized();
    // Extract organization name from URL
    // Example: "https://dev.azure.com/myorganization" -> "myorganization"
    const url = new URL(this.authSettings!.organizationUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    return pathParts[0] || '';
  }

  /**
   * Build the URL for an API request
   */
  private buildUrl(path: string): string {
    const organization = this.getOrganizationName();
    return `${this.baseUrl}${organization}/${path}?api-version=${this.apiVersion}`;
  }

  /**
   * Generate a cache key for a request
   */
  private getCacheKey(path: string, options: IRequestOptions = {}): string {
    // Create a key based on the path and the request body if it exists
    const bodyKey = options.body ? `-${JSON.stringify(options.body)}` : '';
    return `${path}${bodyKey}`;
  }

  /**
   * Get a value from the cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    // Return null if not in cache or expired
    if (!entry || entry.expiry < Date.now()) {
      if (entry) {
        // Clean up expired entries
        this.cache.delete(key);
      }
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Store a value in the cache
   */
  private setInCache<T>(key: string, data: T): void {
    const expiry = Date.now() + this.cacheTtl;
    this.cache.set(key, { data, expiry });
  }

  /**
   * Clear the entire cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Network errors are retryable
    if (error instanceof ApiError) {
      return error.retryable;
    }
    
    // Unknown errors are not retryable by default
    return false;
  }

  /**
   * Handle API response and extract appropriate error
   */
  private async handleApiResponse(response: Response): Promise<unknown> {
    if (response.ok) {
      // Success response, return the JSON data
      return await response.json();
    }
    
    // Error response, handle different status codes
    let errorType: ApiErrorType = ApiErrorType.Unknown;
    let retryable = false;
    
    switch (response.status) {
    case 401:
    case 403:
      errorType = ApiErrorType.Authentication;
      retryable = false;
      break;
    case 404:
      errorType = ApiErrorType.NotFound;
      retryable = false;
      break;
    case 429:
      errorType = ApiErrorType.RateLimit;
      retryable = true;
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      errorType = ApiErrorType.ServerError;
      retryable = true;
      break;
    default:
      errorType = ApiErrorType.Unknown;
      retryable = response.status >= 500; // Generally, 5xx errors are retryable
      break;
    }
    
    // Try to parse error response if available
    let errorDetails = '';
    try {
      const errorData = await response.json();
      errorDetails = JSON.stringify(errorData);
    } catch {
      // If we can't parse the JSON, just use the status text
      errorDetails = response.statusText;
    }
    
    throw new ApiError(
      `API request failed (${response.status}): ${errorDetails}`,
      errorType,
      response.status,
      retryable
    );
  }

  /**
   * Enable test mode to skip delays in retry logic
   * This is only for use in unit tests
   */
  public setTestMode(enabled: boolean): void {
    this.testMode = enabled;
  }

  /**
   * Make an authenticated request to the Azure DevOps API with retries and caching
   */
  private async request<T>(path: string, options: IRequestOptions = {}): Promise<T> {
    this.ensureInitialized();
    
    const url = this.buildUrl(path);
    const requestOptions: IRequestOptions = {
      ...options,
      headers: {
        ...this.headers,
        ...(options.headers || {})
      }
    };
    
    // Generate cache key and check cache if not explicitly skipped
    const cacheKey = this.getCacheKey(path, options);
    if (!options.skipCache && (options.method === undefined || options.method === 'GET')) {
      const cachedData = this.getFromCache<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Retry loop
    let attempt = 0;
    while (true) {
      try {
        const response = await fetch(url, requestOptions);
        const data = await this.handleApiResponse(response) as T;
        
        // Cache successful GET responses
        if (!options.skipCache && (options.method === undefined || options.method === 'GET')) {
          this.setInCache<T>(cacheKey, data);
        }
        
        return data;
      } catch (error) {
        attempt++;
        
        // Log the error
        streamDeck.logger.error(`API request error (attempt ${attempt}/${this.maxRetries}):`, error);
        
        // Check if we should retry
        if (attempt >= this.maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        // Calculate backoff time (exponential with jitter)
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000) * (0.75 + Math.random() * 0.5);
        streamDeck.logger.info(`Retrying in ${Math.round(backoffMs / 1000)} seconds...`);
        
        // Wait before retrying (skip in test mode)
        if (!this.testMode) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  /**
   * Get a list of pipeline definitions
   */
  public async getPipelineDefinitions(project: string): Promise<IPipelineDefinition[]> {
    try {
      streamDeck.logger.info(`Fetching pipeline definitions for project: ${project}`);
      
      const response = await this.request<IPipelineDefinition[]>(
        `${project}/_apis/build/definitions`
      );
      
      return response;
    } catch (error) {
      streamDeck.logger.error(`Error fetching pipeline definitions for ${project}:`, error);
      throw error;
    }
  }

  /**
   * Get the status of a pipeline
   */
  public async getPipelineStatus(project: string, pipelineId: number): Promise<IBuild | null> {
    try {
      streamDeck.logger.info(`Fetching status for pipeline ${pipelineId} in project ${project}`);
      
      const response = await this.request<IBuild[]>(
        `${project}/_apis/build/builds?definitions=${pipelineId}&$top=1`
      );
      
      // If no builds found, return null
      if (!response || response.length === 0) {
        return null;
      }
      
      return response[0];
    } catch (error) {
      streamDeck.logger.error(`Error fetching pipeline status for ${project} pipeline ${pipelineId}:`, error);
      
      // If the pipeline doesn't exist or we get a 404, return null
      if (error instanceof ApiError && error.type === ApiErrorType.NotFound) {
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Get a list of pull requests
   */
  public async getPullRequests(project: string, repository: string, status: PullRequestStatus = PullRequestStatus.Active): Promise<IPullRequest[]> {
    try {
      streamDeck.logger.info(`Fetching ${status} pull requests for ${repository} in ${project}`);
      
      const response = await this.request<{ value: IPullRequest[] }>(
        `${project}/_apis/git/repositories/${repository}/pullrequests?searchCriteria.status=${status}`
      );
      
      return response.value;
    } catch (error) {
      streamDeck.logger.error(`Error fetching pull requests for ${project} repository ${repository}:`, error);
      
      // If the repository doesn't exist or we get a 404, return empty array
      if (error instanceof ApiError && error.type === ApiErrorType.NotFound) {
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Test the connection to Azure DevOps
   */
  public async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();
      
      streamDeck.logger.info('🔍 TEST CONNECTION: Testing connection to Azure DevOps API');
      streamDeck.logger.info(`🔍 TEST CONNECTION: Organization URL = ${this.authSettings?.organizationUrl}`);
      streamDeck.logger.info(`🔍 TEST CONNECTION: PAT length = ${this.authSettings?.personalAccessToken?.length || 0}`);
      
      streamDeck.logger.info('🔍 TEST CONNECTION: Building URL and options for test request');
      const testUrl = this.buildUrl('_apis/projects?$top=1&$skip=0&stateFilter=All');
      streamDeck.logger.info(`🔍 TEST CONNECTION: Test URL = ${testUrl}`);
      
      // Make a lightweight API call to validate the connection
      streamDeck.logger.info('🔍 TEST CONNECTION: Sending API request...');
      const startTime = Date.now();
      
      try {
        // Use direct fetch instead of request to avoid retry logic for connection test
        const requestOptions = {
          method: 'GET',
          headers: {...this.headers}
        };
        
        streamDeck.logger.info('🔍 TEST CONNECTION: Using direct fetch for immediate feedback');
        const response = await fetch(testUrl, requestOptions);
        
        const endTime = Date.now();
        streamDeck.logger.info(`🔍 TEST CONNECTION: API request completed in ${endTime - startTime}ms`);
        
        if (response.ok) {
          await response.json(); // Parse response but we don't need the actual data
          streamDeck.logger.info('✅ TEST CONNECTION: Connection successful');
          return true;
        } else {
          const status = response.status;
          const statusText = response.statusText;
          streamDeck.logger.error(`❌ TEST CONNECTION: Request failed with status ${status}: ${statusText}`);
          
          // Try to parse error details
          try {
            const errorBody = await response.text();
            streamDeck.logger.error(`❌ TEST CONNECTION: Error response body: ${errorBody}`);
          } catch {
            // Just log that we couldn't parse the error body
            streamDeck.logger.error('❌ TEST CONNECTION: Could not parse error response body');
          }
          
          return false;
        }
      } catch (fetchError) {
        streamDeck.logger.error('❌ TEST CONNECTION: Fetch error:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      streamDeck.logger.error('❌ TEST CONNECTION: Connection test failed:', error);
      
      // Add more diagnostic information
      if (error instanceof Error) {
        streamDeck.logger.error(`❌ TEST CONNECTION: Error type: ${error.name}, Message: ${error.message}`);
        streamDeck.logger.error(`❌ TEST CONNECTION: Stack trace: ${error.stack || 'No stack trace available'}`);
        
        // Check for network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          streamDeck.logger.error('❌ TEST CONNECTION: This appears to be a network error. Check your network connection and URL.');
        }
      }
      
      return false;
    }
  }

  /**
   * Get a list of projects from Azure DevOps
   * @param top Maximum number of projects to return (default: 100)
   * @param skip Number of projects to skip (default: 0)
   * @returns List of projects with count and value properties
   */
  public async getProjects(top: number = 100, skip: number = 0): Promise<{ count: number, value: unknown[] }> {
    try {
      streamDeck.logger.info(`Fetching projects (top=${top}, skip=${skip})`);
      
      return await this.request<{ count: number, value: unknown[] }>(
        `_apis/projects?$top=${top}&$skip=${skip}&stateFilter=All`
      );
    } catch (error) {
      streamDeck.logger.error('Error fetching projects:', error);
      throw error;
    }
  }

  /**
   * Get a list of repositories from Azure DevOps
   * @param project The name or ID of the project
   * @returns List of repositories in the project
   */
  public async getRepositories(project: string): Promise<IRepository[]> {
    try {
      streamDeck.logger.info(`Fetching repositories for project: ${project}`);
      
      const response = await this.request<{ value: IRepository[] }>(
        `${project}/_apis/git/repositories`
      );
      
      return response.value;
    } catch (error) {
      streamDeck.logger.error(`Error fetching repositories for ${project}:`, error);
      
      // If the project doesn't exist or we get a 404, return empty array
      if (error instanceof ApiError && error.type === ApiErrorType.NotFound) {
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Get the web URL of the latest run for a pipeline
   * @param project The name or ID of the project
   * @param pipelineId The ID of the pipeline definition
   * @returns The web URL of the latest pipeline run or null if no runs exist
   */
  public async getLatestPipelineRunUrl(project: string, pipelineId: number): Promise<string | null> {
    try {
      streamDeck.logger.info(`Fetching latest run URL for pipeline ${pipelineId} in project ${project}`);
      
      // First get the latest build
      const latestBuild = await this.getPipelineStatus(project, pipelineId);
      
      // If no builds found, return null
      if (!latestBuild) {
        return null;
      }
      
      // Return the URL from the build
      return latestBuild.url;
    } catch (error) {
      streamDeck.logger.error(`Error fetching latest run URL for ${project} pipeline ${pipelineId}:`, error);
      
      // If the pipeline doesn't exist or we get a 404, return null
      if (error instanceof ApiError && error.type === ApiErrorType.NotFound) {
        return null;
      }
      
      throw error;
    }
  }
  
  /**
   * Get the URL for a pull request list view
   * @param options Options for generating the URL
   * @returns The URL for viewing pull requests in the browser
   */
  public getPullRequestListUrl(options: {
    projectId: string;
    repositoryId?: string;
    organizationUrl: string;
    repositoryName?: string;
  }): string {
    const { projectId, repositoryId, organizationUrl, repositoryName } = options;
    
    // Base URL for all PRs in a project
    let url = `${organizationUrl}/${projectId}/_pulls?state=active`;
    
    // If a specific repository is specified and we have the name, use the git-specific URL
    if (repositoryId && repositoryId !== 'all' && repositoryName) {
      url = `${organizationUrl}/${projectId}/_git/${repositoryName}/pullrequests?state=active`;
    }
    
    return url;
  }

  /**
   * Queue a new pipeline run
   * @param project The name or ID of the project
   * @param pipelineId The ID of the pipeline definition
   * @param branch Optional branch to build (defaults to the default branch)
   * @returns The queued build
   */
  public async queuePipelineRun(
    project: string, 
    pipelineId: number, 
    branch?: string
  ): Promise<IBuild> {
    try {
      streamDeck.logger.info(`Queueing pipeline run for ${pipelineId} in project ${project}`);
      
      // Prepare the request body
      const body: Record<string, unknown> = {
        definition: {
          id: pipelineId
        }
      };
      
      // Add branch if provided
      if (branch) {
        body.sourceBranch = branch;
      }
      
      // Queue the build
      const response = await this.request<IBuild>(
        `${project}/_apis/build/builds`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          skipCache: true // Always skip cache for POST requests
        }
      );
      
      return response;
    } catch (error) {
      streamDeck.logger.error(`Error queueing pipeline run for ${project} pipeline ${pipelineId}:`, error);
      throw error;
    }
  }
}

// Export a default instance
export const azureDevOpsClient = AzureDevOpsClient.getInstance();
