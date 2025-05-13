import { SettingsManager } from '../settingsManager';
import streamDeck from '@elgato/streamdeck';
import { azureDevOpsClient } from '../azureDevOpsClient';
import { IAzureDevOpsAuthSettings } from '../../types/ado';
import { IGlobalSettings, IProjectSettings } from '../../types/settings';

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

// Mock the Stream Deck SDK
jest.mock('@elgato/streamdeck', () => ({
  settings: {
    getGlobalSettings: jest.fn(),
    setGlobalSettings: jest.fn(),
  },
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

describe('SettingsManager', () => {
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

  it('should initialize and load global settings', async () => {
    await settingsManager.initialize();
    
    expect(streamDeck.settings.getGlobalSettings).toHaveBeenCalled();
    expect(azureDevOpsClient.initialize).toHaveBeenCalledWith(mockGlobalSettings.auth);
    
    const settings = settingsManager.getGlobalSettings();
    expect(settings).toEqual(mockGlobalSettings);
  });

  it('should return true for valid auth settings', async () => {
    await settingsManager.initialize();
    
    expect(settingsManager.hasValidAuthSettings()).toBe(true);
  });

  it('should return false for invalid auth settings', async () => {
    (streamDeck.settings.getGlobalSettings as jest.Mock).mockResolvedValue({
      auth: {
        organizationUrl: '',
        personalAccessToken: ''
      },
      projects: [],
      refreshInterval: 60
    });
    
    await settingsManager.initialize();
    
    expect(settingsManager.hasValidAuthSettings()).toBe(false);
  });

  it('should update auth settings and reinitialize Azure DevOps client', async () => {
    await settingsManager.initialize();
    
    const newAuthSettings: IAzureDevOpsAuthSettings = {
      organizationUrl: 'https://dev.azure.com/neworg',
      personalAccessToken: 'new-pat-456'
    };
    
    await settingsManager.updateAuthSettings(newAuthSettings);
    
    expect(streamDeck.settings.setGlobalSettings).toHaveBeenCalled();
    expect(azureDevOpsClient.initialize).toHaveBeenCalledWith(newAuthSettings);
  });

  it('should get all projects', async () => {
    await settingsManager.initialize();
    
    const projects = settingsManager.getProjects();
    
    expect(projects).toEqual(mockGlobalSettings.projects);
  });

  it('should get a specific project by ID', async () => {
    await settingsManager.initialize();
    
    const project = settingsManager.getProject('project1');
    
    expect(project).toEqual(mockGlobalSettings.projects[0]);
  });

  it('should add a new project', async () => {
    await settingsManager.initialize();
    
    const newProject: IProjectSettings = {
      id: 'project2',
      name: 'New Project',
      favorite: false,
      monitorPipelines: true,
      monitorPullRequests: false,
      pipelineIds: [4, 5],
      repositoryIds: []
    };
    
    await settingsManager.addOrUpdateProject(newProject);
    
    expect(streamDeck.settings.setGlobalSettings).toHaveBeenCalled();
    
    const projects = settingsManager.getProjects();
    expect(projects).toHaveLength(2);
    expect(projects[1]).toEqual(newProject);
  });

  it('should update an existing project', async () => {
    await settingsManager.initialize();
    
    const updatedProject: IProjectSettings = {
      ...mockGlobalSettings.projects[0],
      name: 'Updated Project Name',
      favorite: false
    };
    
    await settingsManager.addOrUpdateProject(updatedProject);
    
    expect(streamDeck.settings.setGlobalSettings).toHaveBeenCalled();
    
    const project = settingsManager.getProject('project1');
    expect(project).toEqual(updatedProject);
  });

  it('should remove a project', async () => {
    await settingsManager.initialize();
    
    await settingsManager.removeProject('project1');
    
    expect(streamDeck.settings.setGlobalSettings).toHaveBeenCalled();
    
    const projects = settingsManager.getProjects();
    expect(projects).toHaveLength(0);
  });

  it('should get only favorite projects', async () => {
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
    
    mockGlobalSettings.projects.push(nonFavoriteProject);
    
    await settingsManager.initialize();
    
    const favoriteProjects = settingsManager.getFavoriteProjects();
    
    expect(favoriteProjects).toHaveLength(1);
    expect(favoriteProjects[0].id).toBe('project1');
  });

  it('should toggle project favorite status', async () => {
    await settingsManager.initialize();
    
    await settingsManager.toggleProjectFavorite('project1');
    
    expect(streamDeck.settings.setGlobalSettings).toHaveBeenCalled();
    
    const project = settingsManager.getProject('project1');
    expect(project?.favorite).toBe(false);
  });

  it('should create default project settings', () => {
    const defaultProject = settingsManager.createDefaultProjectSettings('new-id', 'New Project');
    
    expect(defaultProject).toEqual({
      id: 'new-id',
      name: 'New Project',
      favorite: false,
      monitorPipelines: true,
      monitorPullRequests: true,
      pipelineIds: [],
      repositoryIds: []
    });
  });

  it('should fetch and add projects from Azure DevOps', async () => {
    await settingsManager.initialize();
    
    // Mocking the result since the actual API call is not implemented yet
    const projects = await settingsManager.fetchAndAddProjects();
    
    expect(azureDevOpsClient.testConnection).toHaveBeenCalled();
    expect(projects).toEqual(mockGlobalSettings.projects);
  });
});
