/**
 * Settings Manager Service
 * 
 * This service handles loading, saving, and managing settings for the plugin,
 * including global settings and action-specific settings.
 */

import streamDeck, { Action, JsonObject } from '@elgato/streamdeck';
import { 
  IGlobalSettings, 
  defaultGlobalSettings,
  IProjectSettings,
  IPipelineMonitorSettings,
  IPullRequestMonitorSettings,
  defaultPipelineMonitorSettings,
  defaultPullRequestMonitorSettings
} from '../types/settings';
import { IAzureDevOpsAuthSettings } from '../types/ado';
import { azureDevOpsClient } from './azureDevOpsClient';

// Interface for Azure DevOps API project response
interface IAzureDevOpsProject {
  id: string;
  name: string;
  state?: string;
  description?: string;
}

/**
 * Service for managing plugin settings
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private globalSettings: IGlobalSettings;
  private initialized: boolean = false;
  
  /**
   * Creates a new instance of the settings manager
   */
  private constructor() {
    this.globalSettings = {...defaultGlobalSettings};
  }
  
  /**
   * Gets the singleton instance of the SettingsManager
   */
  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }
  
  /**
   * Initialize the settings manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {return;}
    
    try {
      // Try to load settings from Stream Deck
      await this.loadGlobalSettings();
      this.initialized = true;
      
      // Initialize the Azure DevOps client with auth settings
      if (this.hasValidAuthSettings()) {
        azureDevOpsClient.initialize(this.globalSettings.auth);
      }
      
      console.log('Settings manager initialized successfully');
    } catch (error) {
      console.error('Error initializing settings manager:', error);
      throw error;
    }
  }
  
  /**
   * Load global settings from Stream Deck
   */
  private async loadGlobalSettings(): Promise<void> {
    try {
      const storedSettings = await streamDeck.settings.getGlobalSettings();
      
      if (storedSettings) {
        this.globalSettings = {
          ...defaultGlobalSettings,
          ...storedSettings
        };
        console.log('Global settings loaded');
      } else {
        console.log('No existing global settings found, using defaults');
        this.globalSettings = {...defaultGlobalSettings};
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
      this.globalSettings = {...defaultGlobalSettings};
    }
  }
  
  /**
   * Save global settings to Stream Deck
   */
  private async saveGlobalSettings(): Promise<void> {
    try {
      // Type assertion needed for StreamDeck SDK compatibility
      await streamDeck.settings.setGlobalSettings(this.globalSettings as unknown as JsonObject);
      console.log('Global settings saved');
    } catch (error) {
      console.error('Error saving global settings:', error);
      throw error;
    }
  }
  
  /**
   * Check if the current auth settings are valid
   */
  public hasValidAuthSettings(): boolean {
    const { auth } = this.globalSettings;
    return Boolean(
      auth && 
      auth.organizationUrl && 
      auth.organizationUrl.trim() !== '' && 
      auth.personalAccessToken && 
      auth.personalAccessToken.trim() !== ''
    );
  }
  
  /**
   * Get the global settings
   */
  public getGlobalSettings(): IGlobalSettings {
    return {...this.globalSettings};
  }
  
  /**
   * Update authentication settings
   */
  public async updateAuthSettings(authSettings: IAzureDevOpsAuthSettings): Promise<void> {
    this.globalSettings.auth = {...authSettings};
    await this.saveGlobalSettings();
    
    // Update the Azure DevOps client with new auth settings
    if (this.hasValidAuthSettings()) {
      azureDevOpsClient.initialize(this.globalSettings.auth);
    }
  }
  
  /**
   * Update the refresh interval
   */
  public async updateRefreshInterval(seconds: number): Promise<void> {
    if (seconds < 10) {
      console.warn('Refresh interval too low, setting to minimum of 10 seconds');
      seconds = 10;
    }
    
    this.globalSettings.refreshInterval = seconds;
    await this.saveGlobalSettings();
  }
  
  /**
   * Get all configured projects
   */
  public getProjects(): IProjectSettings[] {
    return [...this.globalSettings.projects];
  }
  
  /**
   * Get a specific project by ID
   */
  public getProject(projectId: string): IProjectSettings | undefined {
    return this.globalSettings.projects.find((project: IProjectSettings) => project.id === projectId);
  }
  
  /**
   * Add or update a project
   */
  public async addOrUpdateProject(project: IProjectSettings): Promise<void> {
    const existingIndex = this.globalSettings.projects.findIndex((p: IProjectSettings) => p.id === project.id);
    
    if (existingIndex >= 0) {
      // Update existing project
      this.globalSettings.projects[existingIndex] = {...project};
    } else {
      // Add new project
      this.globalSettings.projects.push({...project});
    }
    
    await this.saveGlobalSettings();
  }
  
  /**
   * Remove a project
   */
  public async removeProject(projectId: string): Promise<void> {
    this.globalSettings.projects = this.globalSettings.projects.filter((p: IProjectSettings) => p.id !== projectId);
    await this.saveGlobalSettings();
  }
  
  /**
   * Get favorite projects
   */
  public getFavoriteProjects(): IProjectSettings[] {
    return this.globalSettings.projects.filter((p: IProjectSettings) => p.favorite);
  }
  
  /**
   * Toggle project favorite status
   */
  public async toggleProjectFavorite(projectId: string): Promise<void> {
    const project = this.getProject(projectId);
    
    if (project) {
      project.favorite = !project.favorite;
      await this.addOrUpdateProject(project);
    }
  }
  
  /**
   * Create a default project settings object
   */
  public createDefaultProjectSettings(id: string, name: string): IProjectSettings {
    return {
      id,
      name,
      favorite: false,
      monitorPipelines: true,
      monitorPullRequests: true,
      pipelineIds: [],
      repositoryIds: []
    };
  }
  
  /**
   * Load Pipeline Monitor action settings
   */
  public async loadPipelineMonitorSettings(action: Action, context: string): Promise<IPipelineMonitorSettings> {
    try {
      const settings = await action.getSettings();
      return {
        ...defaultPipelineMonitorSettings,
        ...settings
      };
    } catch (error) {
      console.error(`Error loading Pipeline Monitor settings for ${context}:`, error);
      return {...defaultPipelineMonitorSettings};
    }
  }
  
  /**
   * Save Pipeline Monitor action settings
   */
  public async savePipelineMonitorSettings(
    action: Action, 
    context: string, 
    settings: IPipelineMonitorSettings
  ): Promise<void> {
    try {
      // Type assertion needed for StreamDeck SDK compatibility
      await action.setSettings(settings as unknown as JsonObject);
    } catch (error) {
      console.error(`Error saving Pipeline Monitor settings for ${context}:`, error);
      throw error;
    }
  }
  
  /**
   * Load Pull Request Monitor action settings
   */
  public async loadPullRequestMonitorSettings(action: Action, context: string): Promise<IPullRequestMonitorSettings> {
    try {
      const settings = await action.getSettings();
      return {
        ...defaultPullRequestMonitorSettings,
        ...settings
      };
    } catch (error) {
      console.error(`Error loading Pull Request Monitor settings for ${context}:`, error);
      return {...defaultPullRequestMonitorSettings};
    }
  }
  
  /**
   * Save Pull Request Monitor action settings
   */
  public async savePullRequestMonitorSettings(
    action: Action, 
    context: string, 
    settings: IPullRequestMonitorSettings
  ): Promise<void> {
    try {
      // Type assertion needed for StreamDeck SDK compatibility
      await action.setSettings(settings as unknown as JsonObject);
    } catch (error) {
      console.error(`Error saving Pull Request Monitor settings for ${context}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch projects from Azure DevOps and add them to settings
   */
  public async fetchAndAddProjects(): Promise<IProjectSettings[]> {
    if (!this.hasValidAuthSettings()) {
      throw new Error('Invalid authentication settings');
    }
    
    try {
      // Test connection to Azure DevOps
      const connectionTest = await azureDevOpsClient.testConnection();
      if (!connectionTest) {
        throw new Error('Connection to Azure DevOps failed');
      }
      
      // Fetch projects from Azure DevOps API
      console.log('Fetching projects from Azure DevOps');
      const projectsResponse = await azureDevOpsClient.getProjects();
      
      if (!projectsResponse.value || !Array.isArray(projectsResponse.value)) {
        throw new Error('Invalid response format from Azure DevOps API');
      }
      
      // Process the response and add new projects
      const existingProjects = this.getProjects();
      const existingProjectIds = new Set(existingProjects.map(p => p.id));
      let newProjectsAdded = false;
      
      // Loop through the projects returned from the API and cast to the appropriate type
      for (const rawProject of projectsResponse.value) {
        // Type assertion and validation
        const project = rawProject as IAzureDevOpsProject;
        
        // Skip if project doesn't have the required properties
        if (!project.id || !project.name) {
          console.warn('Skipping project with missing required properties:', project);
          continue;
        }
        
        // Add if it doesn't already exist
        if (!existingProjectIds.has(project.id)) {
          const newProject = this.createDefaultProjectSettings(project.id, project.name);
          await this.addOrUpdateProject(newProject);
          newProjectsAdded = true;
          console.log(`Added new project: ${project.name} (${project.id})`);
        }
      }
      
      if (!newProjectsAdded) {
        console.log('No new projects found to add');
      }
      
      // Return the updated projects list
      return this.getProjects();
    } catch (error) {
      console.error('Error fetching projects from Azure DevOps:', error);
      throw error;
    }
  }
}

// Export a default instance
export const settingsManager = SettingsManager.getInstance();
