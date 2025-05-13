import streamDeck, { LogLevel } from '@elgato/streamdeck';

import { azureDevOpsClient } from './services/azureDevOpsClient';
import { settingsManager } from './services/settingsManager';
import './actions/pipelineMonitor'; // Import the PipelineMonitor action for registration
import './actions/pullRequestTracker'; // Import the PullRequestTracker action for registration

// Export services for use by actions
export { azureDevOpsClient, settingsManager };
export * from './types/ado';
export * from './types/settings';

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Stream Deck SDK automatically dispatches global settings changes to actions
// Global settings (organization URL and PAT) are managed within the PipelineMonitor UI

// Initialize settings manager (this will also initialize the Azure DevOps client if auth settings exist)
settingsManager.initialize()
  .then(() => {
    console.log('Settings manager initialized');
  })
  .catch(error => {
    console.error('Error initializing settings manager:', error);
  });

// Finally, connect to the Stream Deck.
streamDeck.connect();
