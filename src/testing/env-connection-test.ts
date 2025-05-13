/**
 * Environment-based Azure DevOps Connection Test
 * 
 * This script tests connection to Azure DevOps using credentials from a .env.test file.
 * It's designed for convenient development and testing purposes.
 * 
 * Requires:
 * - A .env.test file in the project root with AZURE_ORG_URL and AZURE_PAT variables
 * 
 * Usage:
 * ts-node env-connection-test.ts [project-name]
 * 
 * Example:
 * ts-node env-connection-test.ts optional-project-name
 */

import { azureDevOpsClient } from '../services/azureDevOpsClient';
import { config } from 'dotenv';
import { resolve } from 'path';

// Define interface for Azure DevOps project
interface IAzureDevOpsProject {
  id: string;
  name: string;
  state?: string;
  description?: string;
}

// Load environment variables from .env.test file
const result = config({ path: resolve(process.cwd(), '.env.test') });

if (result.error) {
  console.error('❌ Error loading .env.test file:');
  console.error('   Make sure you have created a .env.test file in the project root');
  console.error('   You can copy .env.test.example and fill in your actual values');
  process.exit(1);
}

async function runTest(): Promise<void> {
  // Check if required environment variables are set
  const organizationUrl = process.env.AZURE_ORG_URL;
  const personalAccessToken = process.env.AZURE_PAT;
  
  if (!organizationUrl) {
    console.error('❌ Error: AZURE_ORG_URL is not set in .env.test file');
    process.exit(1);
  }
  
  if (!personalAccessToken) {
    console.error('❌ Error: AZURE_PAT is not set in .env.test file');
    process.exit(1);
  }
  
  // Get project name from command line args if provided
  const projectName = process.argv.length > 2 ? process.argv[2] : undefined;
  
  console.log(`Testing connection to: ${organizationUrl}`);
  
  try {
    // Initialize the client
    azureDevOpsClient.initialize({
      organizationUrl,
      personalAccessToken
    });
    
    // Test basic connection
    console.log('Testing basic connection...');
    const connectionResult = await azureDevOpsClient.testConnection();
    
    if (!connectionResult) {
      console.error('❌ Connection failed. Please check your credentials.');
      process.exit(1);
    }
    
    console.log('✅ Basic connection successful!');
    
    // Fetch and display projects
    console.log('\nFetching Azure DevOps projects...');
    const projectsResponse = await azureDevOpsClient.getProjects();
    
    if (!projectsResponse.value || !Array.isArray(projectsResponse.value)) {
      console.error('❌ Failed to retrieve projects: Invalid response format');
      process.exit(1);
    }
    
    console.log(`✅ Found ${projectsResponse.value.length} projects:\n`);
    
    // Display project list with proper typing
    (projectsResponse.value as IAzureDevOpsProject[]).forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
    });
    
    // If a project name was provided, try to fetch pipeline definitions
    if (projectName) {
      console.log(`\nTesting pipeline definitions for project: ${projectName}`);
      try {
        const pipelineDefinitions = await azureDevOpsClient.getPipelineDefinitions(projectName);
        console.log(`✅ Found ${pipelineDefinitions.length} pipeline definitions:\n`);
        
        pipelineDefinitions.forEach((pipeline, index) => {
          console.log(`${index + 1}. ${pipeline.name} (ID: ${pipeline.id})`);
        });
      } catch (error) {
        console.error(`❌ Failed to fetch pipeline definitions for "${projectName}":`, error);
      }
      
      // Optionally test pull requests if a project name was provided
      try {
        console.log(`\nTesting pull request retrieval for project: ${projectName}`);
        
        // First, get a repository in the project
        const projectsResponse = await azureDevOpsClient.getProjects();
        const project = (projectsResponse.value as IAzureDevOpsProject[])
          .find(p => p.name === projectName || p.id === projectName);
          
        if (!project) {
          console.log(`❌ Could not find project with name: ${projectName}`);
        } else {
          // Since we can't easily list repositories here without extending the API client,
          // we'll try to use the project name as repository name (common practice)
          const pullRequests = await azureDevOpsClient.getPullRequests(projectName, projectName);
          
          console.log(`✅ Found ${pullRequests.length} active pull requests in repository: ${projectName}/${projectName}`);
          
          if (pullRequests.length > 0) {
            console.log('\nDisplaying first 5 pull requests:');
            pullRequests.slice(0, 5).forEach((pr, index) => {
              console.log(`${index + 1}. #${pr.pullRequestId}: ${pr.title} (Created by: ${pr.createdBy.displayName})`);
            });
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch pull requests:', error);
      }
    }
    
    console.log('\nConnection test completed successfully.');
  } catch (error) {
    console.error('❌ An error occurred during the test:', error);
    process.exit(1);
  }
}

// Run the test
runTest();
