import { PullRequestTracker } from '../pullRequestTracker';
import { azureDevOpsClient } from '../../services/azureDevOpsClient';
import { settingsManager } from '../../services/settingsManager';
import { iconManager } from '../../services/iconManager'; // Added import
import { IPullRequest, PullRequestStatus } from '../../types/ado';
import { IPullRequestMonitorSettings } from '../../types/settings';
import { 
  JsonObject, 
  KeyAction, 
  WillAppearEvent, 
  WillDisappearEvent, 
  KeyDownEvent,
  DidReceiveSettingsEvent,
  SendToPluginEvent,
  streamDeck
} from '@elgato/streamdeck';

// Mock dependencies
jest.mock('../../services/azureDevOpsClient', () => ({
  azureDevOpsClient: {
    getPullRequests: jest.fn(),
    getProjects: jest.fn(),
    getRepositories: jest.fn(),
    testConnection: jest.fn(),
    initialize: jest.fn(),
    getOrganizationName: jest.fn(),
    getPullRequestListUrl: jest.fn(),
  },
}));

jest.mock('../../services/iconManager', () => ({
  iconManager: {
    getPullRequestIcon: jest.fn(),
  },
  PullRequestIcon: {
    Active: 'pr-active.svg',
    None: 'pr-none.svg',
    Config: 'pr-config.svg',
    Disconnected: 'pr-disconnected.svg',
    Error: 'pr-error.svg',
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

// Original setTimeout and setInterval
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

describe('PullRequestTracker', () => {
  let prTracker: PullRequestTracker;
  let mockActions: Map<string, KeyAction<JsonObject>>;
  // Extended KeyAction type to include sendToPropertyInspector
  type ExtendedKeyAction = KeyAction<JsonObject> & {
    sendToPropertyInspector: jest.Mock;
  };
  
  let mockKeyAction: ExtendedKeyAction;
  
  // Sample PR settings
  const sampleSettings: IPullRequestMonitorSettings = {
    projectId: 'testProject',
    repositoryId: 'testRepo',
    showCount: true,
    onlyAssignedToMe: false,
    showNotifications: true,
  };

  // Sample PR response
  const samplePullRequests: IPullRequest[] = [
    {
      pullRequestId: 123,
      title: 'Fix bug in login',
      status: PullRequestStatus.Active,
      createdBy: {
        displayName: 'Test User',
        id: 'user-id',
      },
      creationDate: '2025-05-01T10:00:00Z',
      repository: {
        id: 'testRepo',
        name: 'Test Repository',
        url: 'https://dev.azure.com/test/project/_git/repo',
      },
      sourceRefName: 'refs/heads/feature/login-fix',
      targetRefName: 'refs/heads/main',
      mergeStatus: 'succeeded',
      isDraft: false,
    },
    {
      pullRequestId: 124,
      title: 'Add new feature',
      status: PullRequestStatus.Active,
      createdBy: {
        displayName: 'Another User',
        id: 'another-user-id',
      },
      creationDate: '2025-05-02T10:00:00Z',
      repository: {
        id: 'testRepo',
        name: 'Test Repository',
        url: 'https://dev.azure.com/test/project/_git/repo',
      },
      sourceRefName: 'refs/heads/feature/new-feature',
      targetRefName: 'refs/heads/main',
      mergeStatus: 'succeeded',
      isDraft: false,
    }
  ];

  // Sample repositories
  const sampleRepositories = [
    { id: 'repo1', name: 'Repository 1', url: 'https://dev.azure.com/test/project/_git/repo1' },
    { id: 'repo2', name: 'Repository 2', url: 'https://dev.azure.com/test/project/_git/repo2' },
  ];

  // Mock interval ID for testing
  const mockIntervalId = {} as NodeJS.Timeout;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock setInterval and clearInterval with proper types
    global.setInterval = jest.fn(() => mockIntervalId) as unknown as typeof global.setInterval;
    global.clearInterval = jest.fn();
    
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
    
    // Create PullRequestTracker instance
    prTracker = new PullRequestTracker();
    
    // Mock Array.from() to return our mockActions values when used on the actions collection
    jest.spyOn(Array, 'from').mockImplementation(() => {
      return [...mockActions.values()];
    });
    
    // Mock settingsManager responses
    (settingsManager.getGlobalSettings as jest.Mock).mockReturnValue({
      refreshInterval: 30, // 30 seconds
    });
    
    // Mock azureDevOpsClient responses
    (azureDevOpsClient.getPullRequests as jest.Mock).mockResolvedValue(samplePullRequests);
    (azureDevOpsClient.getRepositories as jest.Mock).mockResolvedValue(sampleRepositories);
  });

  afterEach(() => {
    // Restore original timing functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    global.setTimeout = originalSetTimeout;

    // Restore the original Array.from implementation
    jest.restoreAllMocks();
  });

  describe('onWillAppear', () => {
    it('should show configuration required when settings are missing', async () => {
      // Create event with missing settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: {} as IPullRequestMonitorSettings, // Empty settings
        },
      };
      
      await prTracker.onWillAppear(ev as unknown as WillAppearEvent<JsonObject>);
      
      // Should call setTitle with configuration required message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Setup\nRequired');
      // expect(mockKeyAction.setState).toHaveBeenCalledWith(0); // setState is no longer used for icons
      expect(mockKeyAction.setImage).toHaveBeenCalled(); // Check if setImage was called
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
      
      await prTracker.onWillAppear(ev as unknown as WillAppearEvent<JsonObject>);
      
      // Should call setTitle with disconnected message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('ADO\nDisconnected');
      // expect(mockKeyAction.setState).toHaveBeenCalledWith(0);
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should fetch PR status and start polling when settings are valid', async () => {
      // Mock valid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      (iconManager.getPullRequestIcon as jest.Mock).mockReturnValue('data:image/svg+xml;base64,mockicon');
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await prTracker.onWillAppear(ev as unknown as WillAppearEvent<JsonObject>);
      
      // Should fetch PR status via updatePrStatus
      expect(azureDevOpsClient.getPullRequests).toHaveBeenCalledWith(
        sampleSettings.projectId,
        sampleSettings.repositoryId,
        PullRequestStatus.Active
      );
      
      // Should start polling
      expect(global.setInterval).toHaveBeenCalled();
      
      // Should update the button with PR count
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('2 PRs');
      // expect(mockKeyAction.setState).toHaveBeenCalledWith(0);
      expect(mockKeyAction.setImage).toHaveBeenCalledWith('data:image/svg+xml;base64,mockicon');
    });
  });

  describe('onWillDisappear', () => {
    it('should stop polling when action disappears', async () => {
      // Setup timer ID
      (prTracker as unknown as { refreshTimerId: NodeJS.Timeout | null }).refreshTimerId = mockIntervalId;
      
      // Call onWillDisappear
      await prTracker.onWillDisappear({} as WillDisappearEvent);
      
      // Should clear the interval
      expect(global.clearInterval).toHaveBeenCalledWith(mockIntervalId);
      
      // Should reset the timer ID
      expect((prTracker as unknown as { refreshTimerId: NodeJS.Timeout | null }).refreshTimerId).toBeNull();
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
      
      await prTracker.onDidReceiveSettings(ev as unknown as DidReceiveSettingsEvent<JsonObject>);
      
      // Should call setTitle with disconnected message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('ADO\nDisconnected');
      // expect(mockKeyAction.setState).toHaveBeenCalledWith(0);
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should show configuration required when settings are missing', async () => {
      // Mock valid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      
      // Create event with missing settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: { projectId: '' } as IPullRequestMonitorSettings, // Missing required projectId
        },
      };
      
      await prTracker.onDidReceiveSettings(ev as unknown as DidReceiveSettingsEvent<JsonObject>);
      
      // Should call setTitle with configuration required message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Setup\nRequired');
      // expect(mockKeyAction.setState).toHaveBeenCalledWith(0);
      expect(mockKeyAction.setImage).toHaveBeenCalled();
    });
    
    it('should update PR status and restart polling when settings are valid', async () => {
      // Mock valid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      (iconManager.getPullRequestIcon as jest.Mock).mockReturnValue('data:image/svg+xml;base64,mockicon');
      
      // Setup existing timer ID
      (prTracker as unknown as { refreshTimerId: NodeJS.Timeout }).refreshTimerId = mockIntervalId;
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await prTracker.onDidReceiveSettings(ev as unknown as DidReceiveSettingsEvent<JsonObject>);
      
      // Should update PR status
      expect(azureDevOpsClient.getPullRequests).toHaveBeenCalledWith(
        sampleSettings.projectId,
        sampleSettings.repositoryId,
        PullRequestStatus.Active
      );
      
      // Should restart polling
      expect(global.clearInterval).toHaveBeenCalled();
      expect(global.setInterval).toHaveBeenCalled();
    });
  });

  describe('onKeyDown', () => {
    it('should do nothing when settings are missing', async () => {
      // Create event with missing settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: {} as IPullRequestMonitorSettings, // Empty settings
        },
      };
      
      await prTracker.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);
      
      // Should not fetch PR status
      expect(azureDevOpsClient.getPullRequests).not.toHaveBeenCalled();
    });
    
    it('should do nothing when not connected', async () => {
      // Mock invalid auth settings
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(false);
      (prTracker as unknown as { isConnected: boolean }).isConnected = false;
      
      // Create event with valid settings
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings,
        },
      };
      
      await prTracker.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);
      
      // Should not fetch PR status
      expect(azureDevOpsClient.getPullRequests).not.toHaveBeenCalled();
      // Should not attempt to open URL
      expect(azureDevOpsClient.getOrganizationName).not.toHaveBeenCalled();
    });
    
    it('should open project PR URL when settings are valid and connected', async () => {
      // Mock valid auth settings and ADO client methods
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      (prTracker as unknown as { isConnected: boolean }).isConnected = true;
      (azureDevOpsClient.getOrganizationName as jest.Mock).mockReturnValue('testOrg');
      
      // Mock the URL generation and openUrl methods
      const expectedUrl = `https://dev.azure.com/testOrg/${sampleSettings.projectId}/_pulls?state=active`;
      (azureDevOpsClient.getPullRequestListUrl as jest.Mock).mockReturnValue(expectedUrl);
      const openUrlSpy = jest.spyOn(prTracker as unknown as { openUrl: (url: string) => Promise<void> }, 'openUrl').mockResolvedValue(undefined);
      
      // Create event with valid settings (all repositories)
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: { ...sampleSettings, repositoryId: 'all' },
        },
      };
      
      await prTracker.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);
      
      // Should call getPullRequestListUrl with correct parameters
      expect(azureDevOpsClient.getPullRequestListUrl).toHaveBeenCalledWith(expect.objectContaining({
        projectId: sampleSettings.projectId,
        organizationUrl: 'https://dev.azure.com/testOrg',
        repositoryId: 'all'
      }));
      
      // Should attempt to open the URL returned by getPullRequestListUrl
      expect(openUrlSpy).toHaveBeenCalledWith(expectedUrl);
      openUrlSpy.mockRestore();
    });

    it('should open repository PR URL when specific repository is selected', async () => {
      // Mock valid auth settings and ADO client methods
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      (prTracker as unknown as { isConnected: boolean }).isConnected = true;
      (azureDevOpsClient.getOrganizationName as jest.Mock).mockReturnValue('testOrg');
      (azureDevOpsClient.getRepositories as jest.Mock).mockResolvedValue([
        { id: 'testRepo', name: 'Test-Repo-Name', url: 'someurl' }
      ]);
      
      // Mock the URL generation and openUrl methods
      const expectedUrl = `https://dev.azure.com/testOrg/${sampleSettings.projectId}/_git/Test-Repo-Name/pullrequests?state=active`;
      (azureDevOpsClient.getPullRequestListUrl as jest.Mock).mockReturnValue(expectedUrl);
      const openUrlSpy = jest.spyOn(prTracker as unknown as { openUrl: (url: string) => Promise<void> }, 'openUrl').mockResolvedValue(undefined);

      // Create event with valid settings (specific repository)
      const ev = {
        action: { id: 'test-context' },
        payload: {
          settings: sampleSettings, // Uses 'testRepo'
        },
      };

      await prTracker.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);

      // Should call getPullRequestListUrl with correct parameters including repositoryName
      expect(azureDevOpsClient.getPullRequestListUrl).toHaveBeenCalledWith(expect.objectContaining({
        projectId: sampleSettings.projectId,
        organizationUrl: 'https://dev.azure.com/testOrg',
        repositoryId: 'testRepo',
        repositoryName: 'Test-Repo-Name'
      }));
      
      // Should attempt to open the URL returned by getPullRequestListUrl
      expect(openUrlSpy).toHaveBeenCalledWith(expectedUrl);
      openUrlSpy.mockRestore();
    });

    it('should fall back to project PR URL if repository details fetch fails', async () => {
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      (prTracker as unknown as { isConnected: boolean }).isConnected = true;
      (azureDevOpsClient.getOrganizationName as jest.Mock).mockReturnValue('testOrg');
      const openUrlSpy = jest.spyOn(prTracker as unknown as { openUrl: (url: string) => Promise<void> }, 'openUrl').mockRejectedValue(new Error('Open failed'));
      // We don't need this spy since we're not verifying updatePrStatus is called in this test

      const ev = {
        action: { id: 'test-context' },
        payload: { settings: sampleSettings }, // specific repo
      };
      await prTracker.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);

      expect(openUrlSpy).toHaveBeenCalledWith(
        `https://dev.azure.com/testOrg/${sampleSettings.projectId}/_pulls?state=active`
      );
      openUrlSpy.mockRestore();
    });


    it('should call updatePrStatus if opening URL fails', async () => {
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      (prTracker as unknown as { isConnected: boolean }).isConnected = true;
      (azureDevOpsClient.getOrganizationName as jest.Mock).mockReturnValue('testOrg');
      const openUrlSpy = jest.spyOn(prTracker as unknown as { openUrl: (url: string) => Promise<void> }, 'openUrl').mockRejectedValue(new Error('Open failed'));
      const updatePrStatusSpy = jest.spyOn(prTracker as unknown as { 
        updatePrStatus: (context: string, settings: IPullRequestMonitorSettings) => Promise<void> 
      }, 'updatePrStatus').mockResolvedValue(undefined);


      const ev = {
        action: { id: 'test-context' },
        payload: { settings: { ...sampleSettings, repositoryId: 'all' } },
      };
      await prTracker.onKeyDown(ev as unknown as KeyDownEvent<JsonObject>);

      expect(openUrlSpy).toHaveBeenCalled();
      expect(updatePrStatusSpy).toHaveBeenCalled();
      openUrlSpy.mockRestore();
      updatePrStatusSpy.mockRestore();
    });
  });

  describe('updatePrStatus', () => {
    it('should do nothing when projectId is missing', async () => {
      // Call updatePrStatus with missing projectId
      await (prTracker as unknown as {
        updatePrStatus: (context: string, settings: IPullRequestMonitorSettings) => Promise<void>
      }).updatePrStatus(
        'test-context',
        { ...sampleSettings, projectId: '' }
      );
      
      // Should not fetch PR status
      expect(azureDevOpsClient.getPullRequests).not.toHaveBeenCalled();
    });
    
    it('should fetch PRs for specific repository when repositoryId is provided', async () => {
      // Call updatePrStatus with specific repository
      await (prTracker as unknown as {
        updatePrStatus: (context: string, settings: IPullRequestMonitorSettings) => Promise<void>
      }).updatePrStatus(
        'test-context',
        sampleSettings
      );
      
      // Should fetch PR status for specific repository
      expect(azureDevOpsClient.getPullRequests).toHaveBeenCalledWith(
        sampleSettings.projectId,
        sampleSettings.repositoryId,
        PullRequestStatus.Active
      );
      
      // Should update button appearance
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('2 PRs');
      // setState is no longer called directly in the implementation
    });
    
    it('should fetch PRs for all repositories when repositoryId is "all"', async () => {
      // Mock getRepositories response
      (azureDevOpsClient.getRepositories as jest.Mock).mockResolvedValue(sampleRepositories);
      
      // For each repository, return different PRs
      (azureDevOpsClient.getPullRequests as jest.Mock)
        .mockResolvedValueOnce([samplePullRequests[0]]) // First repo has 1 PR
        .mockResolvedValueOnce([samplePullRequests[1]]); // Second repo has 1 PR
      
      // Call updatePrStatus with "all" repositories
      await (prTracker as unknown as {
        updatePrStatus: (context: string, settings: IPullRequestMonitorSettings) => Promise<void>
      }).updatePrStatus(
        'test-context',
        { ...sampleSettings, repositoryId: 'all' }
      );
      
      // Should fetch repositories
      expect(azureDevOpsClient.getRepositories).toHaveBeenCalledWith(
        sampleSettings.projectId
      );
      
      // Should fetch PRs for each repository
      expect(azureDevOpsClient.getPullRequests).toHaveBeenCalledWith(
        sampleSettings.projectId,
        'repo1',
        PullRequestStatus.Active
      );
      expect(azureDevOpsClient.getPullRequests).toHaveBeenCalledWith(
        sampleSettings.projectId,
        'repo2',
        PullRequestStatus.Active
      );
      
      // Should update button appearance with combined count (2 PRs)
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('2 PRs');
      // setState is no longer called directly in the implementation
    });
    
    it('should show error when API throws exception', async () => {
      // Mock API throwing error
      (azureDevOpsClient.getPullRequests as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );
      
      // Call updatePrStatus
      await (prTracker as unknown as {
        updatePrStatus: (context: string, settings: IPullRequestMonitorSettings) => Promise<void>
      }).updatePrStatus(
        'test-context',
        sampleSettings
      );
      
      // Should show error message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Error');
      // setState is no longer called directly in the implementation
    });
    
    it('should handle notifications when PR count changes', async () => {
      // Mock lastPrCount and settings
      (prTracker as unknown as { lastPrCount: number }).lastPrCount = 1; // Previously had 1 PR
      const settingsWithNotifications = { ...sampleSettings, showNotifications: true };
      
      // Call updatePrStatus
      await (prTracker as unknown as {
        updatePrStatus: (context: string, settings: IPullRequestMonitorSettings) => Promise<void>
      }).updatePrStatus(
        'test-context',
        settingsWithNotifications
      );
      
      // Should log notification message when count increases
      expect(streamDeck.logger.info).toHaveBeenCalledWith(expect.stringContaining('PR count changed'));
    });
  });

  describe('updateButtonAppearance', () => {
    it('should show "No PRs" when count is 0', async () => {
      // Call updateButtonAppearance with 0 PRs
      await (prTracker as unknown as {
        updateButtonAppearance: (context: string, prCount: number) => Promise<void>
      }).updateButtonAppearance(
        'test-context',
        0
      );
      
      // Should show "No PRs" message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('No PRs');
      // setState is no longer called directly in the implementation
    });
    
    it('should show "1 PR" when count is 1', async () => {
      // Call updateButtonAppearance with 1 PR
      await (prTracker as unknown as {
        updateButtonAppearance: (context: string, prCount: number) => Promise<void>
      }).updateButtonAppearance(
        'test-context',
        1
      );
      
      // Should show "1 PR" message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('1 PR');
      // setState is no longer called directly in the implementation
    });
    
    it('should show "{count} PRs" when count is greater than 1', async () => {
      // Call updateButtonAppearance with 5 PRs
      await (prTracker as unknown as {
        updateButtonAppearance: (context: string, prCount: number) => Promise<void>
      }).updateButtonAppearance(
        'test-context',
        5
      );
      
      // Should show "{count} PRs" message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('5 PRs');
      // setState is no longer called directly in the implementation
    });
  });

  describe('button state helpers', () => {
    it('should show configuration required state', async () => {
      // Call showConfigurationRequired
      await (prTracker as unknown as {
        showConfigurationRequired: (context: string) => Promise<void>
      }).showConfigurationRequired(
        'test-context'
      );
      
      // Should show configuration required message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Setup\nRequired');
      // setState is no longer called directly in the implementation
    });
    
    it('should show disconnected state', async () => {
      // Call showDisconnected
      await (prTracker as unknown as {
        showDisconnected: (context: string) => Promise<void>
      }).showDisconnected(
        'test-context'
      );
      
      // Should show disconnected message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('ADO\nDisconnected');
      // setState is no longer called directly in the implementation
    });
    
    it('should show error state', async () => {
      // Call showError
      await (prTracker as unknown as {
        showError: (context: string) => Promise<void>
      }).showError(
        'test-context'
      );
      
      // Should show error message
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Error');
      // setState is no longer called directly in the implementation
    });
    
    it('should update button with title and state', async () => {
      // Call updateButton
      await (prTracker as unknown as {
        updateButton: (context: string, title: string, state?: string) => Promise<void>
      }).updateButton(
        'test-context',
        'Custom Title',
        'custom-state'
      );
      
      // Should set the title and state
      expect(mockKeyAction.setTitle).toHaveBeenCalledWith('Custom Title');
      // setState is no longer called directly in the implementation
    });
    
    it('should handle non-existent action context', async () => {
      // Mock Array.from to return an empty array
      jest.spyOn(Array, 'from').mockReturnValueOnce([]);
      
      // Call updateButton with non-existent context
      await (prTracker as unknown as {
        updateButton: (context: string, title: string, state?: string) => Promise<void>
      }).updateButton(
        'non-existent-context',
        'Custom Title',
        'custom-state'
      );
      
      // Should log an error
      expect(streamDeck.logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not find action'));
      
      // Should not call setTitle or setState
      expect(mockKeyAction.setTitle).not.toHaveBeenCalled();
      expect(mockKeyAction.setState).not.toHaveBeenCalled();
    });
    
    it('should handle error during button update', async () => {
      // Mock setTitle to throw an error
      (mockKeyAction.setTitle as jest.Mock).mockRejectedValueOnce(new Error('Update error'));
      
      // Call updateButton
      await (prTracker as unknown as {
        updateButton: (context: string, title: string, state?: string) => Promise<void>
      }).updateButton(
        'test-context',
        'Custom Title',
        'custom-state'
      );
      
      // Should log an error
      expect(streamDeck.logger.error).toHaveBeenCalledWith(expect.stringContaining('Error updating button state'));
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
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      
      // Create event with getProjects command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'getProjects'
        },
      };
      
      await prTracker.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should call getProjects
      expect(azureDevOpsClient.getProjects).toHaveBeenCalled();
      
      // Should send projects to Property Inspector
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'projects',
        data: projectsResponse.value
      });
    });
    
    it('should handle getRepositories command', async () => {
      // Mock getRepositories response
      const repositoriesResponse = [
        { id: 'repo1', name: 'Repository 1' },
        { id: 'repo2', name: 'Repository 2' }
      ];
      (azureDevOpsClient.getRepositories as jest.Mock).mockResolvedValue(repositoriesResponse);
      (settingsManager.hasValidAuthSettings as jest.Mock).mockReturnValue(true);
      
      // Create event with getRepositories command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'getRepositories',
          projectId: 'project1'
        },
      };
      
      await prTracker.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should call getRepositories
      expect(azureDevOpsClient.getRepositories).toHaveBeenCalledWith('project1');
      
      // Should send repositories to Property Inspector with "All Repositories" option
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'repositories',
        data: [
          { id: 'all', name: 'All Repositories' },
          ...repositoriesResponse
        ]
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
      
      await prTracker.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
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
    
    it('should handle testConnection command with missing parameters', async () => {
      // Create event with incomplete testConnection command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'testConnection',
          organizationUrl: '',
          personalAccessToken: ''
        },
      };
      
      await prTracker.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should log a warning
      expect(streamDeck.logger.warn).toHaveBeenCalled();
      
      // Should not initialize or test connection
      expect(azureDevOpsClient.initialize).not.toHaveBeenCalled();
      expect(azureDevOpsClient.testConnection).not.toHaveBeenCalled();
      
      // Should send error result to Property Inspector
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'testConnectionResult',
        success: false,
        error: expect.stringContaining('required')
      });
    });
    
    it('should handle testConnection command with failed connection', async () => {
      // Mock testConnection response
      (azureDevOpsClient.testConnection as jest.Mock).mockResolvedValue(false);
      
      // Create event with testConnection command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'testConnection',
          organizationUrl: 'https://dev.azure.com/testorg',
          personalAccessToken: 'invalid-pat'
        },
      };
      
      await prTracker.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should initialize ADO client
      expect(azureDevOpsClient.initialize).toHaveBeenCalledWith({
        organizationUrl: 'https://dev.azure.com/testorg',
        personalAccessToken: 'invalid-pat'
      });
      
      // Should test connection
      expect(azureDevOpsClient.testConnection).toHaveBeenCalled();
      
      // Should NOT update auth settings if failed
      expect(settingsManager.updateAuthSettings).not.toHaveBeenCalled();
      
      // Should send failure result to Property Inspector
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'testConnectionResult',
        success: false,
        error: 'Failed to connect to Azure DevOps'
      });
    });
    
    it('should handle testConnection command with API error', async () => {
      // Mock testConnection throwing error
      const errorMessage = 'API connection error';
      (azureDevOpsClient.testConnection as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      // Create event with testConnection command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'testConnection',
          organizationUrl: 'https://dev.azure.com/testorg',
          personalAccessToken: 'test-pat'
        },
      };
      
      await prTracker.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should initialize ADO client
      expect(azureDevOpsClient.initialize).toHaveBeenCalled();
      
      // Should NOT update auth settings if error
      expect(settingsManager.updateAuthSettings).not.toHaveBeenCalled();
      
      // Should send error result to Property Inspector
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith({
        command: 'testConnectionResult',
        success: false,
        error: errorMessage
      });
    });
    
    it('should handle unknown command', async () => {
      // Create event with unknown command
      const ev = {
        action: { id: 'test-context' },
        payload: {
          command: 'unknownCommand'
        },
      };
      
      await prTracker.onSendToPlugin(ev as unknown as SendToPluginEvent<JsonObject, JsonObject>);
      
      // Should not call any API methods
      expect(azureDevOpsClient.getProjects).not.toHaveBeenCalled();
      expect(azureDevOpsClient.getRepositories).not.toHaveBeenCalled();
      expect(azureDevOpsClient.testConnection).not.toHaveBeenCalled();
    });
  });

  describe('sendToPropertyInspector', () => {
    it('should send data to property inspector', async () => {
      const data = { test: 'data' };
      
      // Call sendToPropertyInspector through the private method
      await (prTracker as unknown as {
        sendToPropertyInspector: (context: string, data: unknown) => Promise<void>
      }).sendToPropertyInspector('test-context', data);
      
      // Should call sendToPropertyInspector on the action
      expect(mockKeyAction.sendToPropertyInspector).toHaveBeenCalledWith(data);
    });
    
    it('should handle error when action not found', async () => {
      // Mock Array.from to return an empty array
      jest.spyOn(Array, 'from').mockReturnValueOnce([]);
      
      // Call sendToPropertyInspector with non-existent context
      await (prTracker as unknown as {
        sendToPropertyInspector: (context: string, data: unknown) => Promise<void>
      }).sendToPropertyInspector('non-existent-context', { test: 'data' });
      
      // Should log an error
      expect(streamDeck.logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not find action'));
      
      // Should not call sendToPropertyInspector
      expect(mockKeyAction.sendToPropertyInspector).not.toHaveBeenCalled();
    });
  });

  describe('polling mechanism', () => {
    it('should start polling with correct interval', () => {
      // Set refresh interval
      const refreshInterval = 60;
      (settingsManager.getGlobalSettings as jest.Mock).mockReturnValue({
        refreshInterval,
      });
      
      // Call startPolling
      (prTracker as unknown as {
        startPolling: (context: string, settings: IPullRequestMonitorSettings) => void
      }).startPolling(
        'test-context',
        sampleSettings
      );
      
      // Should set up interval with correct timing
      expect(global.setInterval).toHaveBeenCalled();
    });
    
    it('should stop polling and clear interval', () => {
      // Setup timer ID
      (prTracker as unknown as { refreshTimerId: NodeJS.Timeout }).refreshTimerId = mockIntervalId;
      
      // Call stopPolling
      (prTracker as unknown as {
        stopPolling: () => void
      }).stopPolling();
      
      // Should clear the interval
      expect(global.clearInterval).toHaveBeenCalledWith(mockIntervalId);
      
      // Should reset the timer ID
      expect((prTracker as unknown as { refreshTimerId: NodeJS.Timeout | null }).refreshTimerId).toBeNull();
    });
    
    it('should clear existing interval when starting polling', () => {
      // Setup existing timer ID
      (prTracker as unknown as { refreshTimerId: NodeJS.Timeout }).refreshTimerId = mockIntervalId;
      
      // Call startPolling
      (prTracker as unknown as {
        startPolling: (context: string, settings: IPullRequestMonitorSettings) => void
      }).startPolling(
        'test-context',
        sampleSettings
      );
      
      // Should clear the interval and set a new one
      expect(global.clearInterval).toHaveBeenCalledWith(mockIntervalId);
      expect(global.setInterval).toHaveBeenCalled();
    });
  });
});
