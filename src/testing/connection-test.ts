/**
 * Azure DevOps Connection Test
 * 
 * This script tests connection to Azure DevOps using provided credentials.
 * It's designed for one-time use and doesn't store credentials.
 * 
 * Usage:
 * ts-node connection-test.ts <organization-url> <personal-access-token> [project-name]
 * 
 * Example:
 * ts-node connection-test.ts https://dev.azure.com/myorg my-pat-token optional-project-name
 */

import { azureDevOpsClient } from '../services/azureDevOpsClient';

// Define interface for Azure DevOps project
interface IAzureDevOpsProject {
  id: string;
  name: string;
  state?: string;
  description?: string;
}

async function runTest(): Promise<void> {
  // Get command line args (Node.js puts script name at index 0, first arg at index 1)
  const args = process.argv.slice(2); // Remove 'node' and script name from args
  
  if (args.length < 2) {
    console.error('Error: Missing required arguments.');
    console.log('Usage: ts-node connection-test.ts <organization-url> <personal-access-token> [project-name]');
    process.exit(1);
  }
  
  const organizationUrl = args[0];
  const personalAccessToken = args[1];
  const projectName = args[2]; // Optional
  
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
    }
    
    console.log('\nConnection test completed successfully.');
  } catch (error) {
    console.error('❌ An error occurred during the test:', error);
    process.exit(1);
  }
}

// Run the test
runTest();
