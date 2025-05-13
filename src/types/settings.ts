/**
 * Settings Types
 * 
 * This file contains TypeScript interfaces for plugin settings.
 * These are used to manage user configuration for Azure DevOps organizations,
 * projects, and other plugin settings.
 */

import { IAzureDevOpsAuthSettings, IJsonCompatible } from './ado';

/**
 * Global plugin settings
 */
export interface IGlobalSettings extends IJsonCompatible {
  /**
   * Authentication settings for Azure DevOps
   */
  auth: IAzureDevOpsAuthSettings;
  
  /**
   * Configured Azure DevOps projects
   */
  projects: IProjectSettings[];
  
  /**
   * Auto-refresh interval in seconds
   * Default: 60 seconds (1 minute)
   */
  refreshInterval: number;
}

/**
 * Settings for a specific Azure DevOps project
 */
export interface IProjectSettings extends IJsonCompatible {
  /**
   * Project ID from Azure DevOps
   */
  id: string;
  
  /**
   * Project name
   */
  name: string;
  
  /**
   * Whether this project is favorited/pinned by the user
   */
  favorite: boolean;
  
  /**
   * Whether to monitor pipelines for this project
   */
  monitorPipelines: boolean;
  
  /**
   * Whether to monitor pull requests for this project
   */
  monitorPullRequests: boolean;
  
  /**
   * Specific pipeline IDs to monitor (empty array means monitor all)
   */
  pipelineIds: number[];
  
  /**
   * Specific repository IDs to monitor PRs for (empty array means monitor all)
   */
  repositoryIds: string[];
}

/**
 * Pipeline monitor action settings
 */
export interface IPipelineMonitorSettings extends IJsonCompatible {
  /**
   * Project ID this action is monitoring
   */
  projectId: string;
  
  /**
   * Pipeline ID this action is monitoring
   */
  pipelineId: number;
  
  /**
   * Whether to show build status on the button
   */
  showStatus: boolean;
  
  /**
   * Whether to show notifications for status changes
   */
  showNotifications: boolean;
}

/**
 * Pull request monitor action settings
 */
export interface IPullRequestMonitorSettings extends IJsonCompatible {
  /**
   * Project ID this action is monitoring
   */
  projectId: string;
  
  /**
   * Repository ID this action is monitoring (optional, if not set, monitors all repos in project)
   */
  repositoryId?: string;
  
  /**
   * Whether to show PR count on the button
   */
  showCount: boolean;
  
  /**
   * Whether to only count PRs assigned to the current user
   */
  onlyAssignedToMe: boolean;
  
  /**
   * Whether to show notifications for new PRs
   */
  showNotifications: boolean;
}

/**
 * Pipeline trigger action settings
 */
export interface IPipelineTriggerSettings extends IJsonCompatible {
  /**
   * Project ID this action is triggering
   */
  projectId: string;
  
  /**
   * Pipeline ID this action is triggering
   */
  pipelineId: number;
  
  /**
   * Optional branch to build (defaults to the default branch)
   */
  branch?: string;
  
  /**
   * Whether to show confirmation before triggering
   */
  showConfirmation: boolean;
  
  /**
   * Whether to open the build in browser after triggering
   */
  openAfterTrigger: boolean;
}

/**
 * Default settings values
 */
export const defaultGlobalSettings: IGlobalSettings = {
  auth: {
    organizationUrl: '',
    personalAccessToken: ''
  },
  projects: [],
  refreshInterval: 60 // 1 minute
};

export const defaultPipelineMonitorSettings: IPipelineMonitorSettings = {
  projectId: '',
  pipelineId: 0,
  showStatus: true,
  showNotifications: true
};

export const defaultPipelineTriggerSettings: IPipelineTriggerSettings = {
  projectId: '',
  pipelineId: 0,
  branch: undefined,
  showConfirmation: true,
  openAfterTrigger: true
};

export const defaultPullRequestMonitorSettings: IPullRequestMonitorSettings = {
  projectId: '',
  repositoryId: undefined,
  showCount: true,
  onlyAssignedToMe: false,
  showNotifications: true
};
