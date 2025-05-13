import { PipelineTrigger } from '../pipelineTrigger';
import { azureDevOpsClient } from '../../services/azureDevOpsClient';
import { settingsManager } from '../../services/settingsManager';
import { iconManager } from '../../services/iconManager';
import { IBuild, BuildResult, BuildStatus } from '../../types/ado';
import { IPipelineTriggerSettings } from '../../types/settings';
import { 
  JsonObject, 
  KeyAction, 
  WillAppearEvent, 
  KeyDownEvent,
  DidReceiveSettingsEvent,
  SendToPluginEvent,
  streamDeck
} from '@elgato/streamdeck';

// Mock the execPromise function for openUrl
jest.mock('util', () => ({
  promisify: jest.fn().mockImplementation((_fn) => {
    // Return a mock function for execPromise
    return jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
  }),
}));

// Mock child_process.exec
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// Mock dependencies
jest.mock('../../services/azureDevOpsClient', () => ({
  azureDevOpsClient: {
    queuePipelineRun: jest.fn(),
    getProjects: jest.fn(),
    getPipelineDefinitions: jest.fn(),
    testConnection: jest.fn(),
    initialize: jest.fn(),
    getOrganizationName: jest.fn(),
  },
}));

jest.mock('../../services/iconManager', () => ({
  iconManager: {
    getPipelineIcon: jest.fn(),
  },
  PipelineIcon: {
    Running: 'running.svg',
    Success: 'success.svg',
    Failed: 'failed.svg',
    Config: 'config.svg',
    Disconnected: 'disconnected.svg',
    Error: 'error.svg',
    Unknown: 'unknown.svg',
  }
}));

jest.mock('../../services/settingsManager', () => ({
  settingsManager: {
    getGlobalSettings: jest.fn(),
    hasValidAuthSettings: jest.fn(),
    updateAuthSettings: jest.fn(),
  },
}));

// Mock streamDeck logger
jest.mock('@elgato/streamdeck', () => {
  const original = jest.requireActual('@elgato/streamdeck');
  return {
    ...original,
    streamDeck: {
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      }
    }
  };
});

// Original setTimeout implementation is stored for cleanup
// but we don't need to restore it since we're mocking setTimeout with jest.spyOn

describe('PipelineTrigger', () => {
  let pipelineTrigger: PipelineTrigger;
  let mockActions: Map<string, KeyAction<JsonObject>>;
  // Extended KeyAction type to include sendToPropertyInspector
  type ExtendedKeyAction = KeyAction<JsonObject> & {
    sendToPropertyInspector: jest.Mock;
  };
  
  let mockKeyAction: ExtendedKeyAction;
  
  // Sample pipeline trigger settings
  const sampleSettings: IPipelineTriggerSettings = {
    projectId: 'testProject',
    pipelineId: 123,
    branch: 'main',
    showConfirmation: true,
    openAfterTrigger: true,
  };

  // Sample build response
  const sampleBuild: IBuild = {
    id: 456,
    buildNumber: 'Build-123',
    status: BuildStatus.InProgress,
    result: BuildResult.None,
    startTime: '2025-05-01T10:00:00Z',
    finishTime: '2025-05-01T10:10:00Z',
    url: 'https://dev.azure.com/test/project/_build/results?buildId=456',
    definition: {
      id: 123,
      name: 'Test Pipeline',
    },
    project: {
      id: 'project-id',
      name: 'Test Project'
    },
    requestedBy: {
      displayName: 'Test User',
      id: 'user-id',
      uniqueName: 'test.user@example.com'
    },
    queueTime: '2025-05-01T09:59:00Z',
  };

  // Sample pipelines response for getPipelineDefinitions
  const samplePipelines = [
    { id: 123, name: 'Pipeline 1', revision: 1, path: '\\', project: { id: 'testProject', name: 'Test Project' } },
    { id: 456, name: 'Pipeline 2', revision: 1, path: '\\', project: { id: 'testProject', name: 'Test Project' } }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Instead of mocking setTimeout, we'll spy on it
    jest.spyOn(global, 'setTimeout').mockImplementation(
      (_cb: Function, _ms?: number) => ({ unref: () => ({}) }) as unknown as NodeJS.Timeout
    );
    
    // Create a mock KeyAction with typed implementation
    mockKeyAction = {
      id: 'test-context',
      setTitle: jest.fn().mockResolvedValue(undefined),
      setState: jest.fn().mockResolvedValue(undefined),
      setImage: jest.fn().mockResolvedValue(undefined),
      showOk: jest.fn().mockResolvedValue(undefined),
      isInMultiAction: jest.fn().mockReturnValue(false),
      coordinates: { column: 0, row: 0 },
      toJSON: jest.fn().mockReturnValue({}),
      sendToPropertyInspector: jest.fn().mockResolvedValue(undefined)
    } as unknown as ExtendedKeyAction;
    
    // Setup mock actions array to match how SingletonAction.actions works
    mockActions = new Map<string, KeyAction<JsonObject>>();
    mockActions.set('test-context', mockKeyAction);
    
    // Create PipelineTrigger instance
    pipelineTrigger = new PipelineTrigger();
    
    // Mock Array.from() to return our mockActions values when used on the actions collection
    jest.spyOn(Array, 'from').mockImplementation(() => {
      return [...mockActions.values()];
    });
    
    // Mock default service responses
    (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
    (iconManager.getPipelineIcon as jest.Mock).mockReturnValue('data:image/svg+xml;base64,mockicon');
    (azureDevOpsClient.queuePipelineRun as jest.Mock).mockResolvedValue(sampleBuild);
    (azureDevOpsClient.getPipelineDefinitions as jest.Mock).mockResolvedValue(samplePipelines);
  });

  afterEach(() => {
    // Restore original setTimeout
    jest.restoreAllMocks();

    // Restore the original Array.from implementation
    jest.restoreAllMocks();
  });

  describe('onWillAppear', () => {
    it('should show configuration required when settings are missing', async () => {
      // Create event with missing settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: {} as IPipelineTriggerSettings, // Empty settings
        },
      };
      
      await pipelineTrigger.onWillAppear(ev as unknown as WillAppearEvent<JsonObject>);
      
      // Should call setTitle with configuration required message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Setup\nRequired');
      expect(mockKeyAction.setImage).toHaveBeenCalled(); 
    });
    
    it('should show disconnected when auth settings are invalid', async () => {
      // Mock invalid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(false);
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await pipelineTrigger.onWillAppear(ev as unknown as WillAppearEvent<JsonObject>);
      
      // Should call setTitle with disconnected message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('ADO\nDisconnected');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should show ready state when settings are valid', async () => {
      // Mock valid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await pipelineTrigger.onWillAppear(ev as unknown as WillAppearEvent<JsonObject>);
      
      // Should call getPipelineDefinitions for pipeline name
      expect(azureDevOpsClient.getPipelineDefinitions).toHaveBeenCalledWith(sampleSettings.projectId);
      
      // Should update button with pipeline name and ready state
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith(`Run\nPipeline 1\n${sampleSettings.branch}`);
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
  });

  describe('onDidReceiveSettings', () => {
    it('should show disconnected when auth settings are invalid', async () => {
      // Mock invalid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(false);
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await pipelineTrigger.onDidReceiveSettings(ev as unknown as DidReceiveSettingsEvent<JsonObject>);
      
      // Should call setTitle with disconnected message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('ADO\nDisconnected');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should show configuration required when settings are missing', async () => {
      // Mock valid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      
      // Create event with missing settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: { projectId: '' } as IPipelineTriggerSettings, // Missing required projectId
        },
      };
      
      await pipelineTrigger.onDidReceiveSettings(ev as unknown as DidReceiveSettingsEvent<JsonObject>);
      
      // Should call setTitle with configuration required message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Setup\nRequired');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should update to ready state when settings are valid', async () => {
      // Mock valid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await pipelineTrigger.onDidReceiveSettings(ev as unknown as DidReceiveSettingsEvent<JsonObject>);
      
      // Should update button with pipeline name from API response
      expect(azureDevOpsClient.getPipelineDefinitions).toHaveBeenCalledWith(sampleSettings.projectId);
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith(`Run\nPipeline 1\n${sampleSettings.branch}`);
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
  });

  describe('onKeyDown', () => {
    it('should do nothing when settings are missing', async () => {
      // Create event with missing settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: {} as IPipelineTriggerSettings, // Empty settings
        },
      };
      
      await pipelineTrigger.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);
      
      // Should not queue pipeline run
      expect(azureDevOpsClient.queuePipelineRun).not.toHaveBeenCalled();
    });
    
    it('should do nothing when not connected', async () => {
      // Set isConnected to false
      (pipelineTrigger as unknown as { isConnected: boolean }).isConnected = false;
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await pipelineTrigger.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);
      
      // Should not queue pipeline run
      expect(azureDevOpsClient.queuePipelineRun).not.toHaveBeenCalled();
    });
    
    it('should do nothing if already triggering a pipeline', async () => {
      // Set isTriggering to true
      (pipelineTrigger as unknown as { isTriggering: boolean }).isTriggering = true;
      (pipelineTrigger as unknown as { isConnected: boolean }).isConnected = true;
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await pipelineTrigger.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);
      
      // Should not queue pipeline run
      expect(azureDevOpsClient.queuePipelineRun).not.toHaveBeenCalled();
    });
    
    it('should show confirm state when showConfirmation is true and first press', async () => {
      // Set isTriggering to false and isConnected to true
      (pipelineTrigger as unknown as { isTriggering: boolean }).isTriggering = false;
      (pipelineTrigger as unknown as { isConnected: boolean }).isConnected = true;
      (pipelineTrigger as unknown as { queuedBuild: IBuild | null }).queuedBuild = null;
      
      // Create spy for showConfirmState
      const showConfirmStateSpy = jest.spyOn(pipelineTrigger as unknown as { 
        showConfirmState: (context: string) => Promise<void> 
      }, 'showConfirmState');
      
      // Create event with valid settings and showConfirmation=true
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: { ...sampleSettings, showConfirmation: true },
        },
      };
      
      await pipelineTrigger.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);
      
      // Should call showConfirmState
      expect(showConfirmStateSpy).toHaveBeenCalledWith('test-context');
      
      // Should set timeout to revert to ready state
      expect(global.setTimeout).toHaveBeenCalled();
      
      // Should not queue pipeline run
      expect(azureDevOpsClient.queuePipelineRun).not.toHaveBeenCalled();
      
      showConfirmStateSpy.mockRestore();
    });
    
    it('should directly trigger pipeline when showConfirmation is false', async () => {
      // Set isTriggering to false and isConnected to true
      (pipelineTrigger as unknown as { isTriggering: boolean }).isTriggering = false;
      (pipelineTrigger as unknown as { isConnected: boolean }).isConnected = true;
      
      // Create spy for triggerPipeline
      const triggerPipelineSpy = jest.spyOn(pipelineTrigger as unknown as { 
        triggerPipeline: (context: string, settings: IPipelineTriggerSettings) => Promise<void> 
      }, 'triggerPipeline');
      
      // Create event with valid settings and showConfirmation=false
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: { ...sampleSettings, showConfirmation: false },
        },
      };
      
      await pipelineTrigger.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);
      
      // Should call triggerPipeline
      expect(triggerPipelineSpy).toHaveBeenCalledWith('test-context', expect.objectContaining({
        projectId: 'testProject',
        pipelineId: 123,
        showConfirmation: false
      }));
      
      triggerPipelineSpy.mockRestore();
    });
  });

  describe('triggerPipeline', () => {
    it('should queue pipeline run and show success state', async () => {
      // Set isConnected to true
      (pipelineTrigger as unknown as { isConnected: boolean }).isConnected = true;
      
      // Create spies
      const showTriggeringStateSpy = jest.spyOn(pipelineTrigger as unknown as { 
        showTriggeringState: (context: string) => Promise<void> 
      }, 'showTriggeringState');
      
      const showSuccessStateSpy = jest.spyOn(pipelineTrigger as unknown as { 
        showSuccessState: (context: string) => Promise<void> 
      }, 'showSuccessState');
      
      const openUrlSpy = jest.spyOn(pipelineTrigger as unknown as { 
        openUrl: (url: string) => Promise<void> 
      }, 'openUrl').mockResolvedValue(undefined);
      
      // Call triggerPipeline directly
      await (pipelineTrigger as unknown as {
        triggerPipeline: (context: string, settings: IPipelineTriggerSettings) => Promise<void>
      }).triggerPipeline('test-context', sampleSettings);
      
      // Check if isTriggering was set to true
      expect((pipelineTrigger as unknown as { isTriggering: boolean }).isTriggering).toBe(true);
      
      // Should show triggering state
      expect(showTriggeringStateSpy).toHaveBeenCalledWith('test-context');
      
      // Should queue pipeline run
      expect(azureDevOpsClient.queuePipelineRun).toHaveBeenCalledWith(
        sampleSettings.projectId,
        sampleSettings.pipelineId,
        sampleSettings.branch
      );
      
      // Should show success state
      expect(showSuccessStateSpy).toHaveBeenCalledWith('test-context');
      
      // Should open URL
      expect(openUrlSpy).toHaveBeenCalledWith(sampleBuild.url);
      
      // Should set timeout to revert to ready state
      expect(global.setTimeout).toHaveBeenCalled();
      
      // Clean up spies
      showTriggeringStateSpy.mockRestore();
      showSuccessStateSpy.mockRestore();
      openUrlSpy.mockRestore();
    });
    
    it('should not open URL if openAfterTrigger is false', async () => {
      // Set isConnected to true
      (pipelineTrigger as unknown as { isConnected: boolean }).isConnected = true;
      
      // Create spies
      const openUrlSpy = jest.spyOn(pipelineTrigger as unknown as { 
        openUrl: (url: string) => Promise<void> 
      }, 'openUrl').mockResolvedValue(undefined);
      
      // Call triggerPipeline with openAfterTrigger=false
      await (pipelineTrigger as unknown as {
        triggerPipeline: (context: string, settings: IPipelineTriggerSettings) => Promise<void>
      }).triggerPipeline('test-context', {
        ...sampleSettings,
        openAfterTrigger: false
      });
      
      // Should not open URL
      expect(openUrlSpy).not.toHaveBeenCalled();
      
      openUrlSpy.mockRestore();
    });
    
    it('should show error state if queue pipeline run fails', async () => {
      // Set isConnected to true
      (pipelineTrigger as unknown as { isConnected: boolean }).isConnected = true;
      
      // Mock queuePipelineRun to throw error
      (azureDevOpsClient.queuePipelineRun as jest.Mock).mockRejectedValue(new Error('Queue failed'));
      
      // Create spies
      const showErrorStateSpy = jest.spyOn(pipelineTrigger as unknown as { 
        showErrorState: (context: string) => Promise<void> 
      }, 'showErrorState');
      
      // Call triggerPipeline
      await (pipelineTrigger as unknown as {
        triggerPipeline: (context: string, settings: IPipelineTriggerSettings) => Promise<void>
      }).triggerPipeline('test-context', sampleSettings);
      
      // Should show error state
      expect(showErrorStateSpy).toHaveBeenCalledWith('test-context');
      
      // Should set timeout to revert to ready state
      expect(global.setTimeout).toHaveBeenCalled();
      
      showErrorStateSpy.mockRestore();
    });
  });

  describe('onSendToPlugin', () => {
    it('should handle getProjects command', async () => {
      // Mock getProjects response
      const projectsResponse = {
        count: 2,
        value: [
          { id: 'project1', name: 'Project 1' },
          { id: 'project2', name: 'Project 2' }
        ]
      };
      (azureDevOpsClient.getProjects as jest.Mock).mockResolvedValue(projectsResponse);
      
      // Create event with getProjects command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'getProjects'
        },
      };
      
      await pipelineTrigger.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should call getProjects
      expect(azureDevOpsClient.getProjects).toHaveBeenCalled();
      
      // Should send projects to Property Inspector
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'projects',
        data: projectsResponse.value
      });
    });
    
    it('should handle getPipelines command', async () => {
      // Create event with getPipelines command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'getPipelines',
          projectId: 'project1'
        },
      };
      
      await pipelineTrigger.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should call getPipelineDefinitions
      expect(azureDevOpsClient.getPipelineDefinitions).toHaveBeenCalledWith('project1');
      
      // Should send pipelines to Property Inspector
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'pipelines',
        data: samplePipelines
      });
    });
    
    it('should handle testConnection command successfully', async () => {
      // Mock testConnection response
      (azureDevOpsClient.testConnection as jest.Mock).mockResolvedValue(true);
      
      // Create event with testConnection command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'testConnection',
          organizationUrl: 'https://dev.azure.com/testorg',
          personalAccessToken: 'test-pat'
        },
      };
      
      await pipelineTrigger.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should initialize ADO client
      expect(azureDevOpsClient.initialize).toHaveBeenCalledWith({
        organizationUrl: 'https://dev.azure.com/testorg',
        personalAccessToken: 'test-pat'
      });
      
      // Should test connection
      expect(azureDevOpsClient.testConnection).toHaveBeenCalled();
      
      // Should update auth settings if successful
      expect(settingsManager.updateAuthSettings).toHaveBeenCalledWith({
        organizationUrl: 'https://dev.azure.com/testorg',
        personalAccessToken: 'test-pat'
      });
      
      // Should send success result to Property Inspector
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'testConnectionResult',
        success: true,
        error: null
      });
    });
    
    it('should handle errors in commands', async () => {
      // Mock getProjects to throw error
      const errorMessage = 'Failed to fetch projects';
      (azureDevOpsClient.getProjects as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      // Create event with getProjects command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'getProjects'
        },
      };
      
      await pipelineTrigger.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should send error to Property Inspector
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'error',
        type: 'projects',
        data: errorMessage
      });
    });
  });

  describe('button states', () => {
    it('should set configuration required state', async () => {
      // Call showConfigurationRequired
      await (pipelineTrigger as unknown as {
        showConfigurationRequired: (context: string) => Promise<void>
      }).showConfigurationRequired('test-context');
      
      // Should call setTitle with configuration required message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Setup\nRequired');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should set disconnected state', async () => {
      // Call showDisconnected
      await (pipelineTrigger as unknown as {
        showDisconnected: (context: string) => Promise<void>
      }).showDisconnected('test-context');
      
      // Should call setTitle with disconnected message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('ADO\nDisconnected');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should set confirm state', async () => {
      // Call showConfirmState
      await (pipelineTrigger as unknown as {
        showConfirmState: (context: string) => Promise<void>
      }).showConfirmState('test-context');
      
      // Should call setTitle with confirm message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Press Again\nto Confirm');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should set triggering state', async () => {
      // Call showTriggeringState
      await (pipelineTrigger as unknown as {
        showTriggeringState: (context: string) => Promise<void>
      }).showTriggeringState('test-context');
      
      // Should call setTitle with triggering message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Triggering...');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should set success state', async () => {
      // Call showSuccessState
      await (pipelineTrigger as unknown as {
        showSuccessState: (context: string) => Promise<void>
      }).showSuccessState('test-context');
      
      // Should call setTitle with success message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Pipeline\nTriggered!');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should set error state', async () => {
      // Call showErrorState
      await (pipelineTrigger as unknown as {
        showErrorState: (context: string) => Promise<void>
      }).showErrorState('test-context');
      
      // Should call setTitle with error message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Error\nTriggering');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should set ready state with pipeline name', async () => {
      // Mock getPipelineDefinitions
      (azureDevOpsClient.getPipelineDefinitions as jest.Mock).mockResolvedValue([
        { id: 123, name: 'My Pipeline', revision: 1, path: '\\', project: { id: 'testProject', name: 'Test Project' } }
      ]);
      
      // Call showReadyState
      await (pipelineTrigger as unknown as {
        showReadyState: (context: string, settings: IPipelineTriggerSettings) => Promise<void>
      }).showReadyState('test-context', {
        projectId: 'testProject',
        pipelineId: 123,
        showConfirmation: false,
        openAfterTrigger: false
      });
      
      // Should call setTitle with pipeline name
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Run\nMy Pipeline');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should include branch in ready state title if specified', async () => {
      // Mock getPipelineDefinitions
      (azureDevOpsClient.getPipelineDefinitions as jest.Mock).mockResolvedValue([
        { id: 123, name: 'My Pipeline', revision: 1, path: '\\', project: { id: 'testProject', name: 'Test Project' } }
      ]);
      
      // Call showReadyState with branch
      await (pipelineTrigger as unknown as {
        showReadyState: (context: string, settings: IPipelineTriggerSettings) => Promise<void>
      }).showReadyState('test-context', {
        projectId: 'testProject',
        pipelineId: 123,
        branch: 'feature/branch',
        showConfirmation: false,
        openAfterTrigger: false
      });
      
      // Should call setTitle with pipeline name and branch
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Run\nMy Pipeline\nfeature/...');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should handle pipeline not found in ready state', async () => {
      // Mock getPipelineDefinitions to return empty array
      (azureDevOpsClient.getPipelineDefinitions as jest.Mock).mockResolvedValue([]);
      
      // Call showReadyState
      await (pipelineTrigger as unknown as {
        showReadyState: (context: string, settings: IPipelineTriggerSettings) => Promise<void>
      }).showReadyState('test-context', {
        projectId: 'testProject',
        pipelineId: 999,
        showConfirmation: false,
        openAfterTrigger: false
      });
      
      // Should call setTitle with pipeline ID
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Run\nPipeline\n#999');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should handle API error in ready state', async () => {
      // Mock getPipelineDefinitions to throw error
      (azureDevOpsClient.getPipelineDefinitions as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      // Call showReadyState
      await (pipelineTrigger as unknown as {
        showReadyState: (context: string, settings: IPipelineTriggerSettings) => Promise<void>
      }).showReadyState('test-context', {
        projectId: 'testProject',
        pipelineId: 123,
        showConfirmation: false,
        openAfterTrigger: false
      });
      
      // Should still call setTitle with fallback pipeline ID
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Run\nPipeline\n#123');
      expect(mockKeyAction.setImage).toHaveBeenCalled();
      
      // Should log error
      expect(streamDeck.logger.error).toHaveBeenCalled();
    });
  });

  describe('openUrl', () => {
    it('should use correct command based on platform', async () => {
      // Save original platform
      const originalPlatform = process.platform;
      
      // Mock platform and util.promisify
      const execMock = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const promisifyMock = jest.fn().mockReturnValue(execMock);
      require('util').promisify = promisifyMock;
      
      try {
        // Test Windows
        Object.defineProperty(process, 'platform', { value: 'win32' });
        await (pipelineTrigger as unknown as {
          openUrl: (url: string) => Promise<void>
        }).openUrl('https://example.com');
        expect(execMock).toHaveBeenCalledWith('start "" "https://example.com"');
        
        // Reset mock
        execMock.mockClear();
        
        // Test macOS
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        await (pipelineTrigger as unknown as {
          openUrl: (url: string) => Promise<void>
        }).openUrl('https://example.com');
        expect(execMock).toHaveBeenCalledWith('open "https://example.com"');
        
        // Reset mock
        execMock.mockClear();
        
        // Test Linux/Other
        Object.defineProperty(process, 'platform', { value: 'linux' });
        await (pipelineTrigger as unknown as {
          openUrl: (url: string) => Promise<void>
        }).openUrl('https://example.com');
        expect(execMock).toHaveBeenCalledWith('xdg-open "https://example.com"');
      } finally {
        // Restore original platform
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      }
    });
    
    it('should handle errors when opening URL', async () => {
      // Mock the execPromise to throw an error
      const execError = new Error('Failed to open URL');
      const execMock = jest.fn().mockRejectedValue(execError);
      require('util').promisify = jest.fn().mockReturnValue(execMock);
      
      // Create spy for streamDeck.logger.error
      const loggerSpy = jest.spyOn(streamDeck.logger, 'error');
      
      // Call openUrl and expect it to throw
      await expect((pipelineTrigger as unknown as {
        openUrl: (url: string) => Promise<void>
      }).openUrl('https://example.com')).rejects.toThrow();
      
      // Should log error
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
