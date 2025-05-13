/**
 * Pull Request Tracker Action
 * 
 * This action displays the count and status of Azure DevOps Pull Requests on a Stream Deck button.
 * It polls for status updates and provides visual feedback through button appearance.
 * 
 * Features:
 * - Real-time PR count and status monitoring
 * - Visual indicators for PR count
 * - Option to open PR list on button press
 * - Configurable refresh interval using global settings
 * - Property Inspector for selecting projects and repositories
 * - Optional filtering by PR assignment
 */

import { 
  action, 
  SingletonAction, 
  WillAppearEvent, 
  WillDisappearEvent, 
  KeyDownEvent, 
  JsonObject, 
  DidReceiveSettingsEvent,
  SendToPluginEvent,
  streamDeck 
} from '@elgato/streamdeck';
import { exec } from 'child_process';
import { promisify } from 'util';
import { iconManager, PullRequestIcon } from '../services/iconManager';
import { azureDevOpsClient } from '../services/azureDevOpsClient';
import { settingsManager } from '../services/settingsManager';
import { IPullRequestMonitorSettings } from '../types/settings';
import { IPullRequest, PullRequestStatus } from '../types/ado';

/**
 * Action to monitor Pull Requests in a specific Azure DevOps repository or project
 */
@action({ 
  UUID: 'com.sshadows.azure-devops-manager.pr-tracker'
})
export class PullRequestTracker extends SingletonAction<JsonObject> {
  private refreshInterval = 60; // Default to 60 seconds
  private refreshTimerId: NodeJS.Timeout | null = null;
  private lastPrCount = 0;
  private isConnected = false;

  /**
   * Called when the action appears on the Stream Deck
   */
  public override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    const context = ev.action.id;
    const settings = ev.payload.settings as IPullRequestMonitorSettings;
    streamDeck.logger.info(`PR Tracker will appear: ${context}`);
    
    // Initialize settings if needed
    if (!settings?.projectId) {
      streamDeck.logger.info(`No project configured for ${context}, showing configuration required state`);
      await this.showConfigurationRequired(context);
      return;
    }
    
    // Get refresh interval from global settings
    const globalSettings = settingsManager.getGlobalSettings();
    this.refreshInterval = globalSettings.refreshInterval;
    
    // Check if we have valid auth settings
    this.isConnected = settingsManager.hasValidAuthSettings();
    if (!this.isConnected) {
      streamDeck.logger.info(`No valid auth settings for ${context}, showing disconnected state`);
      await this.showDisconnected(context);
      return;
    }
    
    // Update status immediately
    await this.updatePrStatus(context, settings);
    
    // Set up regular polling
    this.startPolling(context, settings);
  }

  /**
   * Called when the action disappears from the Stream Deck
   */
  public override async onWillDisappear(_ev: WillDisappearEvent): Promise<void> {
    // Stop polling when the action disappears
    this.stopPolling();
  }

  /**
   * Called when the action settings change
   */
  public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<JsonObject>): Promise<void> {
    const context = ev.action.id;
    const settings = ev.payload.settings as IPullRequestMonitorSettings;
    streamDeck.logger.info(`PR Tracker settings changed for ${context}`);

    // Check if we have valid connection and settings
    this.isConnected = settingsManager.hasValidAuthSettings();
    
    if (!this.isConnected) {
      await this.showDisconnected(context);
      return;
    }

    if (!settings?.projectId) {
      await this.showConfigurationRequired(context);
      return;
    }

    // Update status immediately with new settings
    await this.updatePrStatus(context, settings);
    
    // Restart polling with new settings
    this.startPolling(context, settings);
  }

  /**
   * Called when the Property Inspector sends a message to the plugin
   */
  public override async onSendToPlugin(ev: SendToPluginEvent<JsonObject, JsonObject>): Promise<void> {
    const context = ev.action.id;
    const payload = ev.payload;

    streamDeck.logger.info(`PR Tracker received command: ${payload.command}`);

    try {
      // Handle different commands from the Property Inspector
      if (payload.command === 'getProjects') {
        await this.handleGetProjectsCommand(context);
      } else if (payload.command === 'getRepositories' && typeof payload.projectId === 'string') {
        await this.handleGetRepositoriesCommand(context, payload.projectId);
      } else if (payload.command === 'testConnection') {
        await this.handleTestConnectionCommand(
          context, 
          payload.organizationUrl as string, 
          payload.personalAccessToken as string
        );
      }
    } catch (error) {
      streamDeck.logger.error(`Error handling command ${payload.command}:`, error);
      
      // Send error back to Property Inspector
      await this.sendToPropertyInspector(context, {
        command: 'error',
        type: payload.command === 'getProjects' ? 'projects' : 'repositories',
        data: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send data to the Property Inspector
   */
  private async sendToPropertyInspector(context: string, data: unknown): Promise<void> {
    try {
      // Find the matching action by context ID
      const action = Array.from(this.actions).find(a => a.id === context);
      if (!action) {
        streamDeck.logger.error(`Could not find action with context: ${context}`);
        return;
      }
      
      // Check if the action is a KeyAction (which has sendToPropertyInspector)
      if ('sendToPropertyInspector' in action) {
        // Cast to any to bypass TypeScript's type checking for this method
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (action as any).sendToPropertyInspector(data);
      } else {
        streamDeck.logger.error('Action does not support sendToPropertyInspector');
      }
    } catch (error) {
      streamDeck.logger.error(`Error sending data to Property Inspector: ${error}`);
    }
  }

  /**
   * Handle the getProjects command from the Property Inspector
   */
  private async handleGetProjectsCommand(context: string): Promise<void> {
    try {
      // Check if we have valid connection settings
      if (!settingsManager.hasValidAuthSettings()) {
        throw new Error('No valid auth settings found');
      }

      // Get projects from the Azure DevOps API
      const projectsResponse = await azureDevOpsClient.getProjects();
      
      // Send the projects to the Property Inspector
      await this.sendToPropertyInspector(context, {
        command: 'projects',
        data: projectsResponse.value
      });
    } catch (error) {
      streamDeck.logger.error('Error fetching projects:', error);
      throw error;
    }
  }

  /**
   * Handle the getRepositories command from the Property Inspector
   */
  private async handleGetRepositoriesCommand(context: string, projectId: string): Promise<void> {
    try {
      // Check if we have valid connection settings
      if (!settingsManager.hasValidAuthSettings()) {
        throw new Error('No valid auth settings found');
      }

      // Validate project ID
      if (!projectId) {
        throw new Error('No project ID provided');
      }

      // Get repositories from the Azure DevOps API
      const repositories = await azureDevOpsClient.getRepositories(projectId);
      
      // Add an "All Repositories" option at the beginning
      const allReposOption = { id: 'all', name: 'All Repositories' };
      const repoOptions = [allReposOption, ...repositories];
      
      // Send the repositories to the Property Inspector
      await this.sendToPropertyInspector(context, {
        command: 'repositories',
        data: repoOptions
      });
    } catch (error) {
      streamDeck.logger.error(`Error fetching repositories for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Handle the testConnection command from the Property Inspector
   */
  private async handleTestConnectionCommand(
    context: string,
    organizationUrl: string,
    personalAccessToken: string
  ): Promise<void> {
    streamDeck.logger.info('⭐ TEST CONNECTION REQUEST RECEIVED in PullRequestTracker.handleTestConnectionCommand');
    streamDeck.logger.info(`⭐ Testing connection to: ${organizationUrl} (PAT length: ${personalAccessToken ? personalAccessToken.length : 0})`);
    
    try {
      // Create temporary auth settings
      const authSettings = {
        organizationUrl: organizationUrl.trim(),
        personalAccessToken: personalAccessToken.trim()
      };

      // Skip test if auth settings are invalid
      if (!authSettings.organizationUrl || !authSettings.personalAccessToken) {
        streamDeck.logger.warn('❌ TEST CONNECTION: Missing required settings');
        throw new Error('Organization URL and Personal Access Token are required');
      }

      streamDeck.logger.info('⭐ TEST CONNECTION: Initializing ADO client with provided credentials');
      // Initialize Azure DevOps client with the provided settings
      azureDevOpsClient.initialize(authSettings);

      streamDeck.logger.info('⭐ TEST CONNECTION: Starting API connection test...');
      // Test the connection
      const connectionSuccessful = await azureDevOpsClient.testConnection();
      streamDeck.logger.info(`⭐ TEST CONNECTION: Test result: ${connectionSuccessful ? 'SUCCESS' : 'FAILURE'}`);
      
      // If connection is successful, save these settings to global settings
      if (connectionSuccessful) {
        streamDeck.logger.info('⭐ TEST CONNECTION: Saving successful auth settings to global settings');
        await settingsManager.updateAuthSettings(authSettings);
      }
      
      streamDeck.logger.info('⭐ TEST CONNECTION: Sending result to Property Inspector');
      // Send the result to the Property Inspector
      await this.sendToPropertyInspector(context, {
        command: 'testConnectionResult',
        success: connectionSuccessful,
        error: connectionSuccessful ? null : 'Failed to connect to Azure DevOps'
      });
      streamDeck.logger.info('⭐ TEST CONNECTION: Result sent to Property Inspector');
    } catch (error) {
      streamDeck.logger.error('❌ TEST CONNECTION ERROR:', error);
      
      streamDeck.logger.info('⭐ TEST CONNECTION: Sending error to Property Inspector');
      // Send error to Property Inspector
      await this.sendToPropertyInspector(context, {
        command: 'testConnectionResult',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      streamDeck.logger.info('⭐ TEST CONNECTION: Error sent to Property Inspector');
    }
  }

  /**
   * Open a URL in the default browser
   */
  private async openUrl(url: string): Promise<void> {
    try {
      const execPromise = promisify(exec);
      let command: string;
      
      // Determine the command based on the platform
      if (process.platform === 'win32') {
        // Windows
        command = `start "" "${url}"`;
      } else if (process.platform === 'darwin') {
        // macOS
        command = `open "${url}"`;
      } else {
        // Linux and others
        command = `xdg-open "${url}"`;
      }
      
      streamDeck.logger.info(`Opening URL using command: ${command}`);
      await execPromise(command);
    } catch (error) {
      streamDeck.logger.error(`Error opening URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Called when the user presses the button
   */
  public override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
    const context = ev.action.id;
    const settings = ev.payload.settings as IPullRequestMonitorSettings;
    streamDeck.logger.info(`PR Tracker key down: ${context}`);
    
    // If not configured or not connected, do nothing
    if (!settings?.projectId || !this.isConnected) {
      return;
    }
    
    try {
      const organization = azureDevOpsClient.getOrganizationName();
      let prListUrl = `https://dev.azure.com/${organization}/${settings.projectId}/_pulls?state=active`;
      
      if (settings.repositoryId && settings.repositoryId !== 'all') {
        // If a specific repository is selected, link to its PRs
        // We need the repository name, not just ID, for the URL.
        // For simplicity, we'll try to fetch it. If not found, link to project PRs.
        try {
          const repos = await azureDevOpsClient.getRepositories(settings.projectId);
          const repo = repos.find(r => r.id === settings.repositoryId);
          if (repo) {
            prListUrl = `https://dev.azure.com/${organization}/${settings.projectId}/_git/${repo.name}/pullrequests?state=active`;
          }
        } catch (repoError) {
          streamDeck.logger.warn(`Could not fetch repository details for ${settings.repositoryId}, linking to project PRs. Error: ${repoError}`);
        }
      }
      
      streamDeck.logger.info(`Opening PR list URL: ${prListUrl}`);
      await this.openUrl(prListUrl);
      
    } catch (error) {
      streamDeck.logger.error(`Error opening PR list URL: ${error}`);
      // Refresh the status to show any error state
      await this.updatePrStatus(context, settings);
    }
  }

  /**
   * Start polling for PR status updates
   */
  private startPolling(context: string, settings: IPullRequestMonitorSettings): void {
    // Clear any existing timer
    this.stopPolling();
    
    // Set up a new timer
    this.refreshTimerId = setInterval(async () => {
      await this.updatePrStatus(context, settings);
    }, this.refreshInterval * 1000);
    
    streamDeck.logger.info(`Started polling for PRs in project ${settings.projectId} every ${this.refreshInterval} seconds`);
  }

  /**
   * Stop polling for updates
   */
  private stopPolling(): void {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
      streamDeck.logger.info('Stopped polling for PR status');
    }
  }

  /**
   * Update the PR status and the button appearance
   */
  private async updatePrStatus(context: string, settings: IPullRequestMonitorSettings): Promise<void> {
    try {
      // Skip if no project configured
      if (!settings.projectId) {
        return;
      }
      
      let prCount = 0;
      let prs: IPullRequest[] = [];
      
      // If we have a specific repository ID, fetch PRs for that repository
      if (settings.repositoryId && settings.repositoryId !== 'all') {
        prs = await azureDevOpsClient.getPullRequests(
          settings.projectId,
          settings.repositoryId,
          PullRequestStatus.Active
        );
      } else {
        // Fetch all repositories in the project
        const repositories = await azureDevOpsClient.getRepositories(settings.projectId);
        
        // For each repository, fetch PRs and combine them
        for (const repo of repositories) {
          const repoPrs = await azureDevOpsClient.getPullRequests(
            settings.projectId,
            repo.id,
            PullRequestStatus.Active
          );
          prs = [...prs, ...repoPrs];
        }
      }
      
      // If we have actual PRs, count them
      if (prs.length > 0) {
        prCount = prs.length;
      }
      
      // Update the button appearance based on the PR count
      await this.updateButtonAppearance(context, prCount);
      
      // If notifications are enabled and count changed, send notification
      if (settings.showNotifications && this.lastPrCount !== prCount && prCount > this.lastPrCount) {
        // In the future, we could integrate with the Stream Deck notification system
        streamDeck.logger.info(`PR count changed: ${this.lastPrCount} -> ${prCount}`);
      }
      
      // Update last known count
      this.lastPrCount = prCount;
    } catch (error) {
      streamDeck.logger.error(`Error updating PR status for ${context}:`, error);
      await this.showError(context);
    }
  }

  /**
   * Update the button appearance based on PR count
   */
  private async updateButtonAppearance(context: string, prCount: number): Promise<void> {
    let title = 'PRs';
    let icon: PullRequestIcon;
    
    // Set icon and title based on PR count
    if (prCount === 0) {
      title = 'No PRs';
      icon = PullRequestIcon.None;
    } else if (prCount === 1) {
      title = '1 PR';
      icon = PullRequestIcon.Active;
    } else {
      title = `${prCount} PRs`;
      icon = PullRequestIcon.Active;
    }
    
    // Update the button
    await this.updateButton(context, title, icon);
  }

  /**
   * Show configuration required state
   */
  private async showConfigurationRequired(context: string): Promise<void> {
    await this.updateButton(context, 'Setup\nRequired', PullRequestIcon.Config);
  }

  /**
   * Show disconnected state
   */
  private async showDisconnected(context: string): Promise<void> {
    await this.updateButton(context, 'ADO\nDisconnected', PullRequestIcon.Disconnected);
  }

  /**
   * Show error state
   */
  private async showError(context: string): Promise<void> {
    await this.updateButton(context, 'Error', PullRequestIcon.Error);
  }

  /**
   * Update the button title and icon
   */
  private async updateButton(context: string, title: string, icon?: PullRequestIcon): Promise<void> {
    try {
      // Find the matching action by context ID
      const action = Array.from(this.actions).find(a => a.id === context);
      if (!action) {
        streamDeck.logger.error(`Could not find action with context: ${context}`);
        return;
      }
      
      // Update the button title
      await action.setTitle(title);
      
      // Set the icon if provided
      if (icon && 'setImage' in action) {
        const iconUrl = iconManager.getPullRequestIcon(icon);
        if (iconUrl) {
          await action.setImage(iconUrl);
        } else {
          // Fallback if icon loading fails, clear image
          await action.setImage(undefined);
        }
      } else if ('setImage' in action) {
        // If no icon provided, clear image
        await action.setImage(undefined);
      }
    } catch (error) {
      streamDeck.logger.error(`Error updating button state: ${error}`);
    }
  }
}
