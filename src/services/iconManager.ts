/**
 * Icon Manager Service
 * 
 * This service handles loading and managing icons for the Stream Deck plugin.
 */

import * as fs from 'fs';
import * as path from 'path';
import { streamDeck } from '@elgato/streamdeck';

/**
 * Icons for different pipeline states
 */
export enum PipelineIcon {
  Success = 'success.svg',
  Failed = 'failed.svg',
  Running = 'running.svg',
  Canceled = 'canceled.svg',
  Partial = 'partial.svg',
  NotStarted = 'notStarted.svg',
  Unknown = 'unknown.svg',
  Config = 'config.svg',
  Disconnected = 'disconnected.svg',
  NoBuild = 'nobuild.svg',
  Error = 'error.svg'
}

/**
 * Icons for different pull request states
 */
export enum PullRequestIcon {
  Active = 'pr-active.svg',
  None = 'pr-none.svg',
  Config = 'pr-config.svg',
  Disconnected = 'pr-disconnected.svg',
  Error = 'pr-error.svg'
}

/**
 * Singleton service for managing icons
 */
export class IconManager {
  private static instance: IconManager;
  private iconCache: Map<string, string> = new Map();
  private readonly pipelineIconPath = 'imgs/pipeline';
  private readonly pullRequestIconPath = 'imgs/pr';

  private constructor() { }

  /**
   * Get the singleton instance of the IconManager
   */
  public static getInstance(): IconManager {
    if (!IconManager.instance) {
      IconManager.instance = new IconManager();
    }
    return IconManager.instance;
  }

  /**
   * Get a pipeline icon as a base64 data URL
   * @param icon The pipeline icon to get
   * @returns The icon as a base64 data URL or null if the icon couldn't be loaded
   */
  public getPipelineIcon(icon: PipelineIcon): string | null {
    try {
      // Use cached version if available
      if (this.iconCache.has(icon)) {
        return this.iconCache.get(icon) || null;
      }

      // Construct the icon path relative to the plugin directory
      // The Stream Deck plugin runs from the bin directory inside the plugin folder
      const iconPath = path.join('..', this.pipelineIconPath, icon);

      // Read the SVG file
      const svgContent = fs.readFileSync(iconPath, 'utf-8');
      
      // Convert to base64 data URL
      const base64 = Buffer.from(svgContent).toString('base64');
      const dataUrl = `data:image/svg+xml;base64,${base64}`;
      
      // Cache the result
      this.iconCache.set(icon, dataUrl);
      
      return dataUrl;
    } catch (error) {
      streamDeck.logger.error(`Failed to load pipeline icon ${icon}:`, error);
      return null;
    }
  }

  /**
   * Get a pull request icon as a base64 data URL
   * @param icon The pull request icon to get
   * @returns The icon as a base64 data URL or null if the icon couldn't be loaded
   */
  public getPullRequestIcon(icon: PullRequestIcon): string | null {
    try {
      // Use cached version if available
      if (this.iconCache.has(icon)) {
        return this.iconCache.get(icon) || null;
      }

      // Construct the icon path relative to the plugin directory
      const iconPath = path.join('..', this.pullRequestIconPath, icon);

      // Read the SVG file
      const svgContent = fs.readFileSync(iconPath, 'utf-8');
      
      // Convert to base64 data URL
      const base64 = Buffer.from(svgContent).toString('base64');
      const dataUrl = `data:image/svg+xml;base64,${base64}`;
      
      // Cache the result
      this.iconCache.set(icon, dataUrl);
      
      return dataUrl;
    } catch (error) {
      streamDeck.logger.error(`Failed to load pull request icon ${icon}:`, error);
      return null;
    }
  }

  /**
   * Clear the icon cache
   */
  public clearCache(): void {
    this.iconCache.clear();
  }
}

// Export singleton instance
export const iconManager = IconManager.getInstance();
