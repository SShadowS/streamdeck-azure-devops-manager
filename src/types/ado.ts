/**
 * Azure DevOps API Types
 * 
 * This file contains TypeScript interfaces for the Azure DevOps API.
 * These are simplified versions of the actual API responses and will be 
 * expanded as needed.
 */

/**
 * Base interface for all settings objects to make them compatible with Stream Deck SDK
 */
export interface IJsonCompatible {
  [key: string]: unknown;
}

/**
 * Authentication settings for Azure DevOps
 */
export interface IAzureDevOpsAuthSettings extends IJsonCompatible {
  /**
   * The URL of the Azure DevOps organization
   * e.g., "https://dev.azure.com/myorganization"
   */
  organizationUrl: string;
  
  /**
   * Personal Access Token for authentication
   */
  personalAccessToken: string;
}

/**
 * Pipeline definition from Azure DevOps
 */
export interface IPipelineDefinition {
  id: number;
  name: string;
  revision: number;
  path: string;
  project: {
    id: string;
    name: string;
  };
}

/**
 * Status of a pipeline build
 */
export enum BuildStatus {
  Canceled = 'canceled',
  Completed = 'completed',
  InProgress = 'inProgress',
  NotStarted = 'notStarted',
  Postponed = 'postponed'
}

/**
 * Result of a pipeline build
 */
export enum BuildResult {
  Canceled = 'canceled',
  Failed = 'failed',
  None = 'none',
  PartiallySucceeded = 'partiallySucceeded',
  Succeeded = 'succeeded'
}

/**
 * Build information from Azure DevOps
 */
export interface IBuild {
  id: number;
  buildNumber: string;
  status: BuildStatus;
  result: BuildResult;
  queueTime: string;
  startTime: string;
  finishTime: string;
  url: string;
  definition: {
    id: number;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  requestedBy: {
    displayName: string;
    id: string;
    uniqueName: string;
  };
}

/**
 * Pull request status
 */
export enum PullRequestStatus {
  Abandoned = 'abandoned',
  Active = 'active',
  Completed = 'completed',
  NotSet = 'notSet'
}

/**
 * Pull request information from Azure DevOps
 */
export interface IPullRequest {
  pullRequestId: number;
  title: string;
  status: PullRequestStatus;
  createdBy: {
    displayName: string;
    id: string;
  };
  creationDate: string;
  repository: {
    id: string;
    name: string;
    url: string;
  };
  sourceRefName: string;
  targetRefName: string;
  mergeStatus: string;
  isDraft: boolean;
}

/**
 * Repository information from Azure DevOps
 */
export interface IRepository {
  id: string;
  name: string;
  url: string;
  project: {
    id: string;
    name: string;
  };
}
