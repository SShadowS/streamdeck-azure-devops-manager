/**
 * Enhanced tests for Azure DevOps Client
 * 
 * This file contains additional tests to improve coverage of complex scenarios:
 * 1. Retry mechanism
 * 2. Cache management
 * 3. Error handling
 * 4. Edge cases
 */

import { azureDevOpsClient } from '../azureDevOpsClient';
import { IAzureDevOpsAuthSettings } from '../../types/ado';
import { ApiError, ApiErrorType } from '../apiError';

// Mock the global fetch function
global.fetch = jest.fn();

// Mock setTimeout to avoid waiting in tests
jest.mock('node:timers', () => ({
  setTimeout: jest.fn((callback) => callback())
}));

// Mock console methods to reduce noise in test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Mock streamDeck logger (for testConnection method)
jest.mock('@elgato/streamdeck', () => ({
  streamDeck: {
    logger: {
      info: jest.fn(),
      error: jest.fn()
    }
  }
}));

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
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data))
  } as unknown as Response;
};

describe('AzureDevOpsClient - Enhanced Tests', () => {
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
    
    // Enable test mode to skip delays in retry logic
    // @ts-ignore - Access private method for testing
    azureDevOpsClient.setTestMode(true);
  });

  describe('Retry Mechanism', () => {
    it('should retry on server errors (5xx)', async () => {
      // First request fails with 503, second succeeds
      mockFetch
        .mockResolvedValueOnce(createMockResponse(503, { message: 'Service Unavailable' }))
        .mockResolvedValueOnce(createMockResponse(200, []));

      const result = await azureDevOpsClient.getPipelineDefinitions('test-project');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it('should retry on rate limit errors (429)', async () => {
      // First request fails with 429, second succeeds
      mockFetch
        .mockResolvedValueOnce(createMockResponse(429, { message: 'Too Many Requests' }))
        .mockResolvedValueOnce(createMockResponse(200, []));

      const result = await azureDevOpsClient.getPipelineDefinitions('test-project');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it('should stop retrying after max retries', async () => {
      // Set private property
      // @ts-ignore - Access private property
      const originalMaxRetries = azureDevOpsClient.maxRetries;
      // @ts-ignore - Set private property
      azureDevOpsClient.maxRetries = 2;

      try {
        // All attempts fail with 503
        mockFetch
          .mockResolvedValueOnce(createMockResponse(503, { message: 'Service Unavailable' }))
          .mockResolvedValueOnce(createMockResponse(503, { message: 'Service Unavailable' }))
          .mockResolvedValueOnce(createMockResponse(200, [])); // This one should never be reached

        await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
          .rejects.toThrow('API request failed (503)');
        
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry = 2
      } finally {
        // Restore original max retries
        // @ts-ignore - Set private property
        azureDevOpsClient.maxRetries = originalMaxRetries;
      }
    });

    it('should not retry on non-retryable errors', async () => {
      // Fail with 401, which is not retryable
      mockFetch.mockResolvedValueOnce(createMockResponse(401, { message: 'Unauthorized' }));

      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow('API request failed (401)');
      
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Cache Management', () => {
    it('should respect cacheTtl setting', async () => {
      // @ts-ignore - Set private property
      const originalCacheTtl = azureDevOpsClient.cacheTtl;
      
      try {
        // Set a very short TTL
        // @ts-ignore - Set private property
        azureDevOpsClient.cacheTtl = 50; // 50 ms
        
        mockFetch.mockResolvedValue(createMockResponse(200, []));

        // First call should make a fetch request
        await azureDevOpsClient.getPipelineDefinitions('test-project');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        
        // Second call should use cached data
        await azureDevOpsClient.getPipelineDefinitions('test-project');
        expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1
        
        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // This call should make a new fetch request
        await azureDevOpsClient.getPipelineDefinitions('test-project');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      } finally {
        // Restore original TTL
        // @ts-ignore - Set private property
        azureDevOpsClient.cacheTtl = originalCacheTtl;
      }
    });

    it('should cache different endpoints separately', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200, []));

      // Fetch pipeline definitions
      await azureDevOpsClient.getPipelineDefinitions('test-project');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Fetch project list (different endpoint)
      await azureDevOpsClient.getProjects();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Fetch both again - should use cache
      await azureDevOpsClient.getPipelineDefinitions('test-project');
      await azureDevOpsClient.getProjects();
      expect(mockFetch).toHaveBeenCalledTimes(2); // Still 2
    });

    it('should not cache when skipCache option is used', async () => {
      // Mock testConnection which uses skipCache option
      mockFetch.mockResolvedValue(createMockResponse(200, { count: 1 }));

      // First call
      await azureDevOpsClient.testConnection();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second call
      await azureDevOpsClient.testConnection();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should categorize errors correctly', async () => {
      // Return different error types
      mockFetch.mockResolvedValueOnce(createMockResponse(401, { message: 'Unauthorized' }));

      // Test 401 - Authentication Error
      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow('API request failed (401)');
      
      const error401 = await azureDevOpsClient.getPipelineDefinitions('test-project').catch(e => e);
      expect(error401).toBeInstanceOf(ApiError);
      expect(error401.type).toBe(ApiErrorType.Authentication);
      expect(error401.retryable).toBe(false);

      // Test 404 - Not Found Error
      mockFetch.mockResolvedValueOnce(createMockResponse(404, { message: 'Not Found' }));
      
      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow('API request failed (404)');
      
      const error404 = await azureDevOpsClient.getPipelineDefinitions('test-project').catch(e => e);
      expect(error404).toBeInstanceOf(ApiError);
      expect(error404.type).toBe(ApiErrorType.NotFound);
      expect(error404.retryable).toBe(false);

      // Test 429 - Rate Limit Error
      // @ts-ignore - Set private property
      azureDevOpsClient.maxRetries = 0; // Disable retries for this test
      mockFetch.mockResolvedValueOnce(createMockResponse(429, { message: 'Too Many Requests' }));
      
      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow('API request failed (429)');
      
      const error429 = await azureDevOpsClient.getPipelineDefinitions('test-project').catch(e => e);
      expect(error429).toBeInstanceOf(ApiError);
      expect(error429.type).toBe(ApiErrorType.RateLimit);
      expect(error429.retryable).toBe(true);

      // Test 500 - Server Error
      mockFetch.mockResolvedValueOnce(createMockResponse(500, { message: 'Internal Server Error' }));
      
      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow('API request failed (500)');
      
      const error500 = await azureDevOpsClient.getPipelineDefinitions('test-project').catch(e => e);
      expect(error500).toBeInstanceOf(ApiError);
      expect(error500.type).toBe(ApiErrorType.ServerError);
      expect(error500.retryable).toBe(true);
    });

    it('should handle network errors', async () => {
      // Simulate network failure
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow('Failed to fetch');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON responses', async () => {
      // Create a response with a json method that throws
      const invalidJsonResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
      } as unknown as Response;

      mockFetch.mockResolvedValueOnce(invalidJsonResponse);

      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow('Unexpected token');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(invalidJsonResponse.json).toHaveBeenCalled();
    });
  });

  describe('testConnection method', () => {
    it('should report detailed connection failure information', async () => {
      // Return an error response
      mockFetch.mockResolvedValueOnce(createMockResponse(401, { error: 'Unauthorized' }));

      const result = await azureDevOpsClient.testConnection();
      
      expect(result).toBe(false);
      // Check that the streamDeck logger was used
      const { streamDeck } = await import('@elgato/streamdeck');
      expect(streamDeck.logger.error).toHaveBeenCalled();
    });
    
    it('should handle network errors during connection testing', async () => {
      // Simulate network failure
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await azureDevOpsClient.testConnection();
      
      expect(result).toBe(false);
      const { streamDeck } = await import('@elgato/streamdeck');
      expect(streamDeck.logger.error).toHaveBeenCalled();
    });
    
    it('should provide detailed success information', async () => {
      // Successful response
      mockFetch.mockResolvedValueOnce(createMockResponse(200, { count: 1 }));

      const result = await azureDevOpsClient.testConnection();
      
      expect(result).toBe(true);
      const { streamDeck } = await import('@elgato/streamdeck');
      expect(streamDeck.logger.info).toHaveBeenCalled();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle invalid organization URL', async () => {
      // Initialize with invalid URL
      azureDevOpsClient.initialize({
        organizationUrl: 'invalid-url',
        personalAccessToken: 'test-token'
      });
      
      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow(); // Any error is fine here, as long as it throws
    });
    
    it('should handle empty organization URL', async () => {
      // Initialize with empty URL
      azureDevOpsClient.initialize({
        organizationUrl: '',
        personalAccessToken: 'test-token'
      });
      
      await expect(azureDevOpsClient.getPipelineDefinitions('test-project'))
        .rejects.toThrow(); // Any error is fine here, as long as it throws
    });
    
    it('should handle unexpected API response structures', async () => {
      // Return a structure not matching expected format
      mockFetch.mockResolvedValueOnce(createMockResponse(200, {
        unexpectedStructure: true,
        // No 'value' array as expected by some methods
      }));
      
      // This should handle the unexpected structure gracefully
      const projects = await azureDevOpsClient.getProjects();
      
      // TypeScript will still allow this to pass as unknown[]
      expect(projects).toBeDefined();
    });
  });
});
