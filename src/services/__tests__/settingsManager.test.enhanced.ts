/**
 * Enhanced tests for Settings Manager
 * 
 * This file contains additional tests to improve coverage of:
 * 1. Error handling
 * 2. Edge cases
 * 3. Action-specific settings
 * 4. Project management
 */

import { SettingsManager } from '../settingsManager';
import streamDeck from '@elgato/streamdeck';
import { azureDevOpsClient } from '../azureDevOpsClient';
import { IAzureDevOpsAuthSettings } from '../../types/ado';
import { IGlobalSettings, IProjectSettings, IPipelineMonitorSettings, IPullRequestMonitorSettings } from '../../types/settings';

// Define a mock action type to avoid typescript errors with any
type MockAction = {
  getSettings: jest.Mock;
  setSettings: jest.Mock;
};

// Mock console methods to reduce noise in test output and spy on them
let consoleLogSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;
let consoleWarnSpy: jest.SpyInstance;

beforeAll(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});

// Mock the Stream Deck SDK
jest.mock('@elgato/streamdeck', () => ({
  settings: {
    getGlobalSettings: jest.fn(),
    setGlobalSettings: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock the Azure DevOps client
jest.mock('../azureDevOpsClient', () => ({
  azureDevOpsClient: {
    initialize: jest.fn(),
    testConnection: jest.fn(),
    getProjects: jest.fn().mockResolvedValue({
      count: 1,
      value: [
        {
          id: 'project1',
          name: 'Test Project'
        }
      ]
    }),
  },
}));

describe('SettingsManager - Enhanced Tests', () => {
  let settingsManager: SettingsManager;
  let mockGlobalSettings: IGlobalSettings;
  
  // Define the initial settings outside so we can reset it properly
  const initialSettings: IGlobalSettings = {
    auth: {
      organizationUrl: 'https://dev.azure.com/testorg',
      personalAccessToken: 'test-pat-123'
    },
    projects: [{
      id: 'project1',
      name: 'Test Project',
      favorite: true,
      monitorPipelines: true,
      monitorPullRequests: true,
      pipelineIds: [1, 2, 3],
      repositoryIds: ['repo1', 'repo2']
    }],
    refreshInterval: 30
  };

  beforeEach(() => {
    // Create a fresh copy of the initial settings for each test
    mockGlobalSettings = JSON.parse(JSON.stringify(initialSettings));
    jest.clearAllMocks();
    
    // Reset the singleton instance before each test
    // This is a hack to reset the singleton for testing purposes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SettingsManager as any).instance = undefined;
    
    // Get a new instance
    settingsManager = SettingsManager.getInstance();
    
    // Setup mocks
    (streamDeck.settings.getGlobalSettings as jest.Mock).mockResolvedValue(mockGlobalSettings);
    (streamDeck.settings.setGlobalSettings as jest.Mock).mockResolvedValue(undefined);
    (azureDevOpsClient.initialize as jest.Mock).mockImplementation(() => {});
    (azureDevOpsClient.testConnection as jest.Mock).mockResolvedValue(true);
  });

  describe('Error Handling', () => {
    it('should handle errors when loading global settings', async () => {
      // Mock getGlobalSettings to throw an error
      (streamDeck.settings.getGlobalSettings as jest.Mock).mockRejectedValue(
        new Error('Failed to load settings')
      );
      
      // Should use default settings when loading fails
      await settingsManager.initialize();
      
      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Should still be initialized with default settings
      expect(settingsManager.getGlobalSettings()).toBeDefined();
      expect(settingsManager.getGlobalSettings().projects).toEqual([]);
    });
    
    it('should handle errors when saving global settings', async () => {
      // Mock setGlobalSettings to throw an error
      (streamDeck.settings.setGlobalSettings as jest.Mock).mockRejectedValue(
        new Error('Failed to save settings')
      );
      
      await settingsManager.initialize();
      
      // Should throw an error when saving fails
      await expect(settingsManager.updateAuthSettings({
        organizationUrl: 'https://dev.azure.com/neworg',
        personalAccessToken: 'new-pat'
      })).rejects.toThrow('Failed to save settings');
      
      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('should handle errors when fetching projects from Azure DevOps', async () => {
      // Mock testConnection to throw an error
      (azureDevOpsClient.testConnection as jest.Mock).mockRejectedValue(
        new Error('Connection failed')
      );
      
      await settingsManager.initialize();
      
      // Should throw an error when connection test fails
      await expect(settingsManager.fetchAndAddProjects()).rejects.toThrow('Connection failed');
      
      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('should handle invalid response formats when fetching projects', async () => {
      // Mock getProjects to return invalid response
      (azureDevOpsClient.getProjects as jest.Mock).mockResolvedValue({
        // missing 'value' property
        count: 2
      });
      
      await settingsManager.initialize();
      
      // Should throw a specific error
      await expect(settingsManager.fetchAndAddProjects()).rejects.toThrow('Invalid response format');
      
      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('should handle errors when loading action settings', async () => {
      const mockAction: MockAction = {
        getSettings: jest.fn().mockRejectedValue(new Error('Failed to load action settings')),
        setSettings: jest.fn()
      };
      
      await settingsManager.initialize();
      
      // Should not throw, but return default settings
      const settings = await settingsManager.loadPipelineMonitorSettings(
        // @ts-expect-error Mock doesn't implement full interface
        mockAction, 
        'mock-context'
      );
      
      expect(settings).toBeDefined();
      // Default projectId is '', not undefined
      expect(settings.projectId).toBe(''); 
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    it('should handle errors when saving action settings', async () => {
      const mockAction: MockAction = {
        getSettings: jest.fn(),
        setSettings: jest.fn().mockRejectedValue(new Error('Failed to save action settings'))
      };
      
      await settingsManager.initialize();
      
      // Should throw when saving fails
      await expect(settingsManager.savePipelineMonitorSettings(
        // @ts-expect-error Mock doesn't implement full interface
        mockAction,
        'mock-context',
        { 
          projectId: 'test', 
          pipelineId: 1, 
          showNotifications: false,
          showStatus: true
        }
      )).rejects.toThrow('Failed to save action settings');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty project data', async () => {
      // Mock getProjects to return empty array
      (azureDevOpsClient.getProjects as jest.Mock).mockResolvedValue({
        count: 0,
        value: []
      });
      
      await settingsManager.initialize();
      
      // Should not add any projects but not throw
      const projects = await settingsManager.fetchAndAddProjects();
      
      expect(projects).toEqual(mockGlobalSettings.projects);
      expect(consoleLogSpy).toHaveBeenCalledWith('No new projects found to add');
    });
    
    it('should skip projects with missing required properties', async () => {
      // Mock getProjects to return projects with missing properties
      (azureDevOpsClient.getProjects as jest.Mock).mockResolvedValue({
        count: 2,
        value: [
          { id: 'valid-id', name: 'Valid Project' },
          { id: null, name: 'Invalid Project' }, // missing required id property
          { id: 'missing-name' }, // missing required name property
          { } // missing all properties
        ]
      });
      
      await settingsManager.initialize();
      
      // Should only add the valid project
      const projects = await settingsManager.fetchAndAddProjects();
      
      // Should have the original project plus the new valid one
      expect(projects).toHaveLength(2);
      expect(projects[1].id).toBe('valid-id');
      expect(projects[1].name).toBe('Valid Project');
      
      // Should log warnings about skipped projects
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
    
    it('should enforce minimum refresh interval', async () => {
      await settingsManager.initialize();
      
      // Try to set too low a refresh interval
      await settingsManager.updateRefreshInterval(5);
      
      // Should enforce minimum of 10 seconds
      expect(settingsManager.getGlobalSettings().refreshInterval).toBe(10);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
    
    it('should initialize even with no previous settings', async () => {
      // Mock getGlobalSettings to return null (no saved settings)
      (streamDeck.settings.getGlobalSettings as jest.Mock).mockResolvedValue(null);
      
      await settingsManager.initialize();
      
      // Should initialize with defaults
      const settings = settingsManager.getGlobalSettings();
      expect(settings).toBeDefined();
      expect(settings.projects).toEqual([]);
      expect(settings.refreshInterval).toBeDefined();
    });
    
    it('should check if the client is already initialized', async () => {
      // Initialize once
      await settingsManager.initialize();
      
      // Reset the mock to check it's not called again
      jest.clearAllMocks();
      
      // Initialize again - should be a no-op
      await settingsManager.initialize();
      
      // Should not call any methods again
      expect(streamDeck.settings.getGlobalSettings).not.toHaveBeenCalled();
    });
  });
  
  describe('Project Management', () => {
    it('should properly merge with existing projects', async () => {
      // Add different projects in the response
      (azureDevOpsClient.getProjects as jest.Mock).mockResolvedValue({
        count: 2,
        value: [
          { id: 'project1', name: 'Existing Project' }, // Already exists
          { id: 'project2', name: 'New Project' }       // New project
        ]
      });
      
      await settingsManager.initialize();
      
      // Fetch and add projects
      const projects = await settingsManager.fetchAndAddProjects();
      
      // Should have both projects, with the existing one unchanged
      expect(projects).toHaveLength(2);
      
      // First project should be unchanged (keep favorite=true, etc.)
      expect(projects[0].id).toBe('project1');
      expect(projects[0].favorite).toBe(true);
      expect(projects[0].pipelineIds).toEqual([1, 2, 3]);
      
      // New project should have default settings
      expect(projects[1].id).toBe('project2');
      expect(projects[1].favorite).toBe(false);
      expect(projects[1].pipelineIds).toEqual([]);
    });
    
    it('should update an existing project preserving custom fields', async () => {
      await settingsManager.initialize();
      
      // Create an updated version of the first project with some changed fields
      const updatedProject: IProjectSettings = {
        ...mockGlobalSettings.projects[0],
        name: 'Updated Project Name',
        favorite: false
      };
      
      await settingsManager.addOrUpdateProject(updatedProject);
      
      // Get the updated project
      const project = settingsManager.getProject('project1');
      
      // Name and favorite should be updated
      expect(project?.name).toBe('Updated Project Name');
      expect(project?.favorite).toBe(false);
      
      // Other fields should be preserved
      expect(project?.pipelineIds).toEqual([1, 2, 3]);
      expect(project?.repositoryIds).toEqual(['repo1', 'repo2']);
    });
    
    it('should get favorite projects only', async () => {
      // Add a non-favorite project
      const nonFavoriteProject: IProjectSettings = {
        id: 'project2',
        name: 'Non-Favorite Project',
        favorite: false,
        monitorPipelines: true,
        monitorPullRequests: true,
        pipelineIds: [],
        repositoryIds: []
      };
      
      await settingsManager.initialize();
      await settingsManager.addOrUpdateProject(nonFavoriteProject);
      
      // Get only favorite projects
      const favoriteProjects = settingsManager.getFavoriteProjects();
      
      // Should only contain the first project
      expect(favoriteProjects).toHaveLength(1);
      expect(favoriteProjects[0].id).toBe('project1');
    });
    
    it('should toggle project favorite status correctly', async () => {
      await settingsManager.initialize();
      
      // Initially the project is a favorite
      expect(settingsManager.getProject('project1')?.favorite).toBe(true);
      
      // Toggle favorite status
      await settingsManager.toggleProjectFavorite('project1');
      
      // Should now be false
      expect(settingsManager.getProject('project1')?.favorite).toBe(false);
      
      // Toggle again
      await settingsManager.toggleProjectFavorite('project1');
      
      // Should be back to true
      expect(settingsManager.getProject('project1')?.favorite).toBe(true);
    });
    
    it('should handle toggling favorite for unknown project', async () => {
      await settingsManager.initialize();
      
      // Attempt to toggle a non-existent project
      await settingsManager.toggleProjectFavorite('unknown-project');
      
      // Should not throw or change anything
      const projects = settingsManager.getProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('project1');
    });
  });
  
  describe('Action Settings', () => {
    it('should load and save Pipeline Monitor settings', async () => {
      const mockSettings: IPipelineMonitorSettings = {
        projectId: 'test-project',
        pipelineId: 123,
        showNotifications: true,
        showStatus: true
      };
      
      const mockAction: MockAction = {
        getSettings: jest.fn().mockResolvedValue(mockSettings),
        setSettings: jest.fn().mockResolvedValue(undefined)
      };
      
      await settingsManager.initialize();
      
      // Load settings
      const settings = await settingsManager.loadPipelineMonitorSettings(
        // @ts-expect-error Mock doesn't implement full interface
        mockAction, 
        'mock-context'
      );
      
      expect(settings).toEqual(mockSettings);
      
      // Save settings
      await settingsManager.savePipelineMonitorSettings(
        // @ts-expect-error Mock doesn't implement full interface
        mockAction,
        'mock-context',
        settings
      );
      
      expect(mockAction.setSettings).toHaveBeenCalledWith(mockSettings);
    });
    
    it('should load and save Pull Request Monitor settings', async () => {
      const mockSettings: IPullRequestMonitorSettings = {
        projectId: 'test-project',
        repositoryId: 'test-repo',
        showNotifications: true,
        showCount: true,
        onlyAssignedToMe: false
      };
      
      const mockAction: MockAction = {
        getSettings: jest.fn().mockResolvedValue(mockSettings),
        setSettings: jest.fn().mockResolvedValue(undefined)
      };
      
      await settingsManager.initialize();
      
      // Load settings
      const settings = await settingsManager.loadPullRequestMonitorSettings(
        // @ts-expect-error Mock doesn't implement full interface
        mockAction, 
        'mock-context'
      );
      
      expect(settings).toEqual(mockSettings);
      
      // Save settings
      await settingsManager.savePullRequestMonitorSettings(
        // @ts-expect-error Mock doesn't implement full interface
        mockAction,
        'mock-context',
        settings
      );
      
      expect(mockAction.setSettings).toHaveBeenCalledWith(mockSettings);
    });
    
    it('should merge action settings with defaults', async () => {
      // Partial settings
      const partialSettings = {
        projectId: 'test-project'
        // Missing pipelineId and showNotifications
      };
      
      const mockAction: MockAction = {
        getSettings: jest.fn().mockResolvedValue(partialSettings),
        setSettings: jest.fn().mockResolvedValue(undefined)
      };
      
      await settingsManager.initialize();
      
      // Load settings
      const settings = await settingsManager.loadPipelineMonitorSettings(
        // @ts-expect-error Mock doesn't implement full interface
        mockAction, 
        'mock-context'
      );
      
      // Should have merged with defaults
      expect(settings.projectId).toBe('test-project');
      // Default pipelineId is 0, not undefined
      expect(settings.pipelineId).toBe(0); 
      expect(settings.showNotifications).toBeTruthy(); // Default is true, and partialSettings doesn't override it
    });
  });
  
  describe('Authentication Settings', () => {
    it('should validate auth settings correctly', async () => {
      await settingsManager.initialize();
      
      // Valid settings
      expect(settingsManager.hasValidAuthSettings()).toBe(true);
      
      // Update with invalid settings
      await settingsManager.updateAuthSettings({
        organizationUrl: '',
        personalAccessToken: 'test-token'
      });
      
      // Should be invalid
      expect(settingsManager.hasValidAuthSettings()).toBe(false);
      
      // Update with empty PAT
      await settingsManager.updateAuthSettings({
        organizationUrl: 'https://dev.azure.com/org',
        personalAccessToken: ''
      });
      
      // Should be invalid
      expect(settingsManager.hasValidAuthSettings()).toBe(false);
      
      // Update with spaces only
      await settingsManager.updateAuthSettings({
        organizationUrl: '   ',
        personalAccessToken: '   '
      });
      
      // Should be invalid
      expect(settingsManager.hasValidAuthSettings()).toBe(false);
    });
    
    it('should initialize Azure DevOps client after updating settings', async () => {
      await settingsManager.initialize();
      
      // Reset the mock
      jest.clearAllMocks();
      
      // Update auth settings
      const newSettings: IAzureDevOpsAuthSettings = {
        organizationUrl: 'https://dev.azure.com/neworg',
        personalAccessToken: 'new-token'
      };
      
      await settingsManager.updateAuthSettings(newSettings);
      
      // Should initialize the client with new settings
      expect(azureDevOpsClient.initialize).toHaveBeenCalledWith(newSettings);
    });
    
    it('should not initialize Azure DevOps client with invalid settings', async () => {
      // Start with valid settings
      await settingsManager.initialize();
      
      // Reset the mock
      jest.clearAllMocks();
      
      // Update with invalid settings
      await settingsManager.updateAuthSettings({
        organizationUrl: '',
        personalAccessToken: ''
      });
      
      // Should not initialize the client
      expect(azureDevOpsClient.initialize).not.toHaveBeenCalled();
    });
  });
});
