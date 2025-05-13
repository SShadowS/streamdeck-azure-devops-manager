/**
 * Pipeline Monitor Action
 * 
 * This action displays the status of an Azure DevOps pipeline on a Stream Deck button.
 * It polls for status updates and provides visual feedback through button appearance.
 * 
 * Features:
 * - Real-time pipeline status monitoring
 * - Visual indicators for build status (succeeded, failed, in progress)
 * - Option to open pipeline details on button press
 * - Configurable refresh interval using global settings
 * - Property Inspector for selecting projects and pipelines
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
import { azureDevOpsClient } from '../services/azureDevOpsClient';
import { settingsManager } from '../services/settingsManager';
import { IPipelineMonitorSettings } from '../types/settings';
import { BuildResult, BuildStatus, IBuild } from '../types/ado';

/**
 * Action to monitor the status of a specific Azure DevOps pipeline
 */
@action({ 
  UUID: 'com.sshadows.azure-devops-manager.pipeline-monitor'
})
export class PipelineMonitor extends SingletonAction<JsonObject> {
  private refreshInterval = 60; // Default to 60 seconds
  private refreshTimerId: NodeJS.Timeout | null = null;
  private lastStatus: string | null = null;
  private isConnected = false;

  /**
   * Called when the action appears on the Stream Deck
   */
  public override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    const context = ev.action.id;
    const settings = ev.payload.settings as IPipelineMonitorSettings;
    streamDeck.logger.info(`Pipeline Monitor will appear: ${context}`);
    
    // Initialize settings if needed
    if (!settings?.projectId || !settings?.pipelineId) {
      streamDeck.logger.info(`No pipeline configured for ${context}, showing configuration required state`);
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
    await this.updatePipelineStatus(context, settings);
    
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
    const settings = ev.payload.settings as IPipelineMonitorSettings;
    streamDeck.logger.info(`Pipeline Monitor settings changed for ${context}`);

    // Check if we have valid connection and settings
    this.isConnected = settingsManager.hasValidAuthSettings();
    
    if (!this.isConnected) {
      await this.showDisconnected(context);
      return;
    }

    if (!settings?.projectId || !settings?.pipelineId) {
      await this.showConfigurationRequired(context);
      return;
    }

    // Update status immediately with new settings
    await this.updatePipelineStatus(context, settings);
    
    // Restart polling with new settings
    this.startPolling(context, settings);
  }

  /**
   * Called when the Property Inspector sends a message to the plugin
   */
  public override async onSendToPlugin(ev: SendToPluginEvent<JsonObject, JsonObject>): Promise<void> {
    const context = ev.action.id;
    const payload = ev.payload;

    streamDeck.logger.info(`Pipeline Monitor received command: ${payload.command}`);

    try {
      // Handle different commands from the Property Inspector
      if (payload.command === 'getProjects') {
        await this.handleGetProjectsCommand(context);
      } else if (payload.command === 'getPipelines' && typeof payload.projectId === 'string') {
        await this.handleGetPipelinesCommand(context, payload.projectId);
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
        type: payload.command === 'getProjects' ? 'projects' : 'pipelines',
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
   * Handle the getPipelines command from the Property Inspector
   */
  private async handleGetPipelinesCommand(context: string, projectId: string): Promise<void> {
    try {
      // Check if we have valid connection settings
      if (!settingsManager.hasValidAuthSettings()) {
        throw new Error('No valid auth settings found');
      }

      // Validate project ID
      if (!projectId) {
        throw new Error('No project ID provided');
      }

      // Get pipeline definitions from the Azure DevOps API
      const pipelines = await azureDevOpsClient.getPipelineDefinitions(projectId);
      
      // Send the pipelines to the Property Inspector
      await this.sendToPropertyInspector(context, {
        command: 'pipelines',
        data: pipelines
      });
    } catch (error) {
      streamDeck.logger.error(`Error fetching pipelines for project ${projectId}:`, error);
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
    streamDeck.logger.info('⭐ TEST CONNECTION REQUEST RECEIVED in PipelineMonitor.handleTestConnectionCommand');
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
   * Called when the user presses the button
   */
  public override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
    const context = ev.action.id;
    const settings = ev.payload.settings as IPipelineMonitorSettings;
    streamDeck.logger.info(`Pipeline Monitor key down: ${context}`);
    
    // If not configured or not connected, do nothing
    if (!settings?.projectId || !settings?.pipelineId || !this.isConnected) {
      return;
    }
    
    // For now, just trigger a manual refresh
    // In the future, this could open the pipeline in a web browser
    await this.updatePipelineStatus(context, settings);
  }

  /**
   * Start polling for pipeline status updates
   */
  private startPolling(context: string, settings: IPipelineMonitorSettings): void {
    // Clear any existing timer
    this.stopPolling();
    
    // Set up a new timer
    this.refreshTimerId = setInterval(async () => {
      await this.updatePipelineStatus(context, settings);
    }, this.refreshInterval * 1000);
    
    streamDeck.logger.info(`Started polling for pipeline ${settings.pipelineId} every ${this.refreshInterval} seconds`);
  }

  /**
   * Stop polling for updates
   */
  private stopPolling(): void {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
      streamDeck.logger.info('Stopped polling for pipeline status');
    }
  }

  /**
   * Update the pipeline status and the button appearance
   */
  private async updatePipelineStatus(context: string, settings: IPipelineMonitorSettings): Promise<void> {
    try {
      // Skip if no pipeline configured
      if (!settings.projectId || !settings.pipelineId) {
        return;
      }
      
      // Fetch the pipeline status
      const build = await azureDevOpsClient.getPipelineStatus(
        settings.projectId,
        settings.pipelineId
      );
      
      if (!build) {
        // No builds found
        await this.showNoBuild(context, settings.pipelineId);
        return;
      }
      
      // Update the button appearance based on the build status
      await this.updateButtonAppearance(context, build);
      
      // If notifications are enabled and status changed, send notification
      if (settings.showNotifications && this.lastStatus !== build.status) {
        // In the future, we could integrate with the Stream Deck notification system
        streamDeck.logger.info(`Pipeline ${settings.pipelineId} status changed: ${this.lastStatus} -> ${build.status}`);
      }
      
      // Update last known status
      this.lastStatus = build.status;
    } catch (error) {
      streamDeck.logger.error(`Error updating pipeline status for ${context}:`, error);
      await this.showError(context);
    }
  }

  /**
   * Update the button appearance based on build status
   */
  private async updateButtonAppearance(context: string, build: IBuild): Promise<void> {
    let title = 'Pipeline';
    let state: string | undefined;
    
    // Set state and title based on build status
    if (build.status === BuildStatus.InProgress) {
      title = '⏳ Running';
      state = 'running';
    } else if (build.status === BuildStatus.Completed) {
      if (build.result === BuildResult.Succeeded) {
        title = '✅ Success';
        state = 'success';
      } else if (build.result === BuildResult.PartiallySucceeded) {
        title = '⚠️ Partial';
        state = 'partial';
      } else if (build.result === BuildResult.Failed) {
        title = '❌ Failed';
        state = 'failed';
      } else if (build.result === BuildResult.Canceled) {
        title = '🚫 Canceled';
        state = 'canceled';
      } else {
        title = '❓ Unknown';
        state = 'unknown';
      }
    } else {
      title = build.status || 'Unknown';
      state = 'unknown';
    }
    
    // Update the button
    await this.updateButton(context, title, state);
  }

  /**
   * Show configuration required state
   */
  private async showConfigurationRequired(context: string): Promise<void> {
    await this.updateButton(context, 'Setup\nRequired', 'config');
  }

  /**
   * Show disconnected state
   */
  private async showDisconnected(context: string): Promise<void> {
    await this.updateButton(context, 'ADO\nDisconnected', 'disconnected');
  }

  /**
   * Show no build state
   */
  private async showNoBuild(context: string, pipelineId: number): Promise<void> {
    await this.updateButton(context, `Pipeline\n#${pipelineId}\nNo Builds`, 'nobuild');
  }

  /**
   * Show error state
   */
  private async showError(context: string): Promise<void> {
    await this.updateButton(context, 'Error', 'error');
  }

  /**
   * Update the button title and state
   */
  private async updateButton(context: string, title: string, state?: string): Promise<void> {
    try {
      // Find the matching action by context ID
      const action = Array.from(this.actions).find(a => a.id === context);
      if (!action) {
        streamDeck.logger.error(`Could not find action with context: ${context}`);
        return;
      }
      
      // Update the button title
      await action.setTitle(title);
      
      // Update the button state if provided
      if (state && 'setState' in action) {
        // setState is only available on KeyAction, not DialAction
        await action.setState(parseInt(state) || 0);
      }
    } catch (error) {
      streamDeck.logger.error(`Error updating button state: ${error}`);
    }
  }
}
