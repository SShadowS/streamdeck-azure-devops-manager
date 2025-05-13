/**
 * Global Settings Action
 * 
 * This action handles interactions with the plugin's global settings UI,
 * including authentication settings for Azure DevOps and common configuration.
 * 
 * Features:
 * - Handles test connection requests
 * - Processes global settings changes
 * - Supports organization-wide configuration
 */

import { 
  action, 
  SingletonAction, 
  JsonObject, 
  SendToPluginEvent
} from '@elgato/streamdeck';
import { azureDevOpsClient } from '../services/azureDevOpsClient';
import { IAzureDevOpsAuthSettings } from '../types/ado';

/**
 * Action to handle global settings for the plugin
 */
@action({ 
  UUID: 'com.sshadows.azure-devops-manager.global-settings'
})
export class GlobalSettings extends SingletonAction<JsonObject> {
  
  /**
   * Called when the Property Inspector sends a message to the plugin
   */
  public override async onSendToPlugin(ev: SendToPluginEvent<JsonObject, JsonObject>): Promise<void> {
    const context = ev.action.id;
    const payload = ev.payload;
    console.log(`Global Settings received command: ${payload.command}`);

    try {
      // Handle test connection command
      if (payload.command === 'testConnection') {
        await this.handleTestConnectionCommand(
          context,
          payload.organizationUrl as string,
          payload.personalAccessToken as string
        );
      }
    } catch (error) {
      console.error(`Error handling command ${payload.command}:`, error);
      
      // Send error back to Property Inspector
      await this.sendToPropertyInspector(context, {
        command: 'testConnectionResult',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
        console.error(`Could not find action with context: ${context}`);
        return;
      }
      
      // Check if the action has sendToPropertyInspector method
      if ('sendToPropertyInspector' in action) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (action as any).sendToPropertyInspector(data);
      } else {
        console.error('Action does not support sendToPropertyInspector');
      }
    } catch (error) {
      console.error(`Error sending data to Property Inspector: ${error}`);
    }
  }

  /**
   * Handle the test connection command from the Property Inspector
   */
  private async handleTestConnectionCommand(
    context: string,
    organizationUrl: string,
    personalAccessToken: string
  ): Promise<void> {
    try {
      // Create temporary auth settings
      const authSettings: IAzureDevOpsAuthSettings = {
        organizationUrl: organizationUrl.trim(),
        personalAccessToken: personalAccessToken.trim()
      };

      // Skip test if auth settings are invalid
      if (!authSettings.organizationUrl || !authSettings.personalAccessToken) {
        throw new Error('Organization URL and Personal Access Token are required');
      }

      // Initialize Azure DevOps client with the provided settings
      azureDevOpsClient.initialize(authSettings);

      // Test the connection
      const connectionSuccessful = await azureDevOpsClient.testConnection();
      
      // Send the result to the Property Inspector
      await this.sendToPropertyInspector(context, {
        command: 'testConnectionResult',
        success: connectionSuccessful,
        error: connectionSuccessful ? null : 'Failed to connect to Azure DevOps'
      });
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    }
  }
}
