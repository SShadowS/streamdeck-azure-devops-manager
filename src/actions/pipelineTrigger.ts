/**
 * Pipeline Trigger Action
 * 
 * This action allows users to trigger an Azure DevOps pipeline run with a button press.
 * Users can configure which pipeline to trigger and additional options.
 * 
 * Features:
 * - One-click pipeline triggering
 * - Optional confirmation before trigger
 * - Optional automatic opening of build page after trigger
 * - Support for specifying a branch to build
 */

import { 
  action, 
  SingletonAction, 
  WillAppearEvent, 
  KeyDownEvent, 
  JsonObject, 
  DidReceiveSettingsEvent,
  SendToPluginEvent,
  streamDeck 
} from '@elgato/streamdeck';
import { exec } from 'child_process';
import { promisify } from 'util';
import { iconManager, PipelineIcon } from '../services/iconManager';
import { azureDevOpsClient } from '../services/azureDevOpsClient';
import { settingsManager } from '../services/settingsManager';
import { IPipelineTriggerSettings } from '../types/settings';
import { IBuild } from '../types/ado';

/**
 * Action to trigger a specific Azure DevOps pipeline
 */
@action({ 
  UUID: 'com.sshadows.azure-devops-manager.pipeline-trigger'
})
export class PipelineTrigger extends SingletonAction<JsonObject> {
  private isConnected = false;
  private queuedBuild: IBuild | null = null;
  private isTriggering = false;

  /**
   * Called when the action appears on the Stream Deck
   */
  public override async onWillAppear(ev: WillAppearEvent<JsonObject>): Promise<void> {
    const context = ev.action.id;
    const settings = ev.payload.settings as IPipelineTriggerSettings;
    streamDeck.logger.info(`Pipeline Trigger will appear: ${context}`);
    
    // Initialize settings if needed
    if (!settings?.projectId || !settings?.pipelineId) {
      streamDeck.logger.info(`No pipeline configured for ${context}, showing configuration required state`);
      await this.showConfigurationRequired(context);
      return;
    }
    
    // Check if we have valid auth settings
    this.isConnected = settingsManager.hasValidAuthSettings();
    if (!this.isConnected) {
      streamDeck.logger.info(`No valid auth settings for ${context}, showing disconnected state`);
      await this.showDisconnected(context);
      return;
    }
    
    // Set the default button appearance
    await this.showReadyState(context, settings);
  }

  /**
   * Called when the action settings change
   */
  public override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<JsonObject>): Promise<void> {
    const context = ev.action.id;
    const settings = ev.payload.settings as IPipelineTriggerSettings;
    streamDeck.logger.info(`Pipeline Trigger settings changed for ${context}`);

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

    // Update the button appearance to ready state
    await this.showReadyState(context, settings);
  }

  /**
   * Called when the Property Inspector sends a message to the plugin
   */
  public override async onSendToPlugin(ev: SendToPluginEvent<JsonObject, JsonObject>): Promise<void> {
    const context = ev.action.id;
    const payload = ev.payload;

    streamDeck.logger.info(`Pipeline Trigger received command: ${payload.command}`);

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
    streamDeck.logger.info('⭐ TEST CONNECTION REQUEST RECEIVED in PipelineTrigger.handleTestConnectionCommand');
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
    const settings = ev.payload.settings as IPipelineTriggerSettings;
    streamDeck.logger.info(`Pipeline Trigger key down: ${context}`);
    
    // If not configured or not connected, do nothing
    if (!settings?.projectId || !settings?.pipelineId || !this.isConnected) {
      return;
    }
    
    // If already triggering, show message and do nothing
    if (this.isTriggering) {
      streamDeck.logger.info('Already triggering a pipeline, ignoring button press');
      return;
    }
    
    // If confirmation is enabled, show "Press again to confirm" state
    if (settings.showConfirmation && !this.queuedBuild) {
      await this.showConfirmState(context);
      
      // Set a timeout to reset the state after 5 seconds
      setTimeout(async () => {
        // Only reset if we didn't queue a build
        if (!this.queuedBuild && !this.isTriggering) {
          await this.showReadyState(context, settings);
        }
      }, 5000);
      
      return;
    }
    
    // Queue the pipeline run
    await this.triggerPipeline(context, settings);
  }
  
  /**
   * Trigger the pipeline run
   */
  private async triggerPipeline(context: string, settings: IPipelineTriggerSettings): Promise<void> {
    this.isTriggering = true;
    
    try {
      // Show triggering state
      await this.showTriggeringState(context);
      
      // Queue the pipeline run
      streamDeck.logger.info(`Queueing pipeline run for ${settings.pipelineId} in project ${settings.projectId}`);
      const build = await azureDevOpsClient.queuePipelineRun(
        settings.projectId,
        settings.pipelineId,
        settings.branch
      );
      
      // Save the queued build
      this.queuedBuild = build;
      
      // Show success state
      await this.showSuccessState(context);
      
      // If openAfterTrigger is enabled, open the build in browser
      if (settings.openAfterTrigger && build.url) {
        streamDeck.logger.info(`Opening build URL: ${build.url}`);
        await this.openUrl(build.url);
      }
      
      // Reset state after 3 seconds
      setTimeout(async () => {
        this.queuedBuild = null;
        this.isTriggering = false;
        await this.showReadyState(context, settings);
      }, 3000);
    } catch (error) {
      streamDeck.logger.error(`Error triggering pipeline: ${error}`);
      
      // Show error state
      await this.showErrorState(context);
      
      // Reset state after 3 seconds
      setTimeout(async () => {
        this.queuedBuild = null;
        this.isTriggering = false;
        await this.showReadyState(context, settings);
      }, 3000);
    }
  }
  
  /**
   * Show configuration required state
   */
  private async showConfigurationRequired(context: string): Promise<void> {
    await this.updateButton(context, 'Setup\nRequired', PipelineIcon.Config);
  }

  /**
   * Show disconnected state
   */
  private async showDisconnected(context: string): Promise<void> {
    await this.updateButton(context, 'ADO\nDisconnected', PipelineIcon.Disconnected);
  }
  
  /**
   * Show ready state (default state)
   */
  private async showReadyState(context: string, settings: IPipelineTriggerSettings): Promise<void> {
    // Get a short name for the pipeline
    let pipelineName = `Pipeline\n#${settings.pipelineId}`;
    
    try {
      // Try to fetch the pipeline details to get the name
      const pipelines = await azureDevOpsClient.getPipelineDefinitions(settings.projectId);
      const pipeline = pipelines.find(p => p.id === settings.pipelineId);
      if (pipeline) {
        // Use the pipeline name if found
        pipelineName = pipeline.name;
      }
    } catch (error) {
      streamDeck.logger.error(`Error fetching pipeline details: ${error}`);
    }
    
    // Show the trigger button with the pipeline name
    let title = `Run\n${pipelineName}`;
    
    // If branch is specified, include it in the title
    if (settings.branch) {
      // Ensure the title doesn't get too long
      const shortBranch = settings.branch.length > 10 
        ? settings.branch.substring(0, 8) + '...' 
        : settings.branch;
      title = `Run\n${pipelineName}\n${shortBranch}`;
    }
    
    await this.updateButton(context, title, PipelineIcon.Running);
  }
  
  /**
   * Show confirm state
   */
  private async showConfirmState(context: string): Promise<void> {
    await this.updateButton(context, 'Press Again\nto Confirm', PipelineIcon.Unknown);
  }
  
  /**
   * Show triggering state
   */
  private async showTriggeringState(context: string): Promise<void> {
    await this.updateButton(context, 'Triggering...', PipelineIcon.Running);
  }
  
  /**
   * Show success state
   */
  private async showSuccessState(context: string): Promise<void> {
    await this.updateButton(context, 'Pipeline\nTriggered!', PipelineIcon.Success);
  }
  
  /**
   * Show error state
   */
  private async showErrorState(context: string): Promise<void> {
    await this.updateButton(context, 'Error\nTriggering', PipelineIcon.Error);
  }

  /**
   * Update the button title and icon
   */
  private async updateButton(context: string, title: string, icon: PipelineIcon): Promise<void> {
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
        const iconUrl = iconManager.getPipelineIcon(icon);
        if (iconUrl) {
          await action.setImage(iconUrl);
        }
      }
    } catch (error) {
      streamDeck.logger.error(`Error updating button state: ${error}`);
    }
  }
}
