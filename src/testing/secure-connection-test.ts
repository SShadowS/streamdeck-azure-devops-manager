/**
 * Secure Azure DevOps Connection Test
 * 
 * This script tests connection to Azure DevOps using provided credentials.
 * The PAT is entered securely via prompt, so it's not visible in command history.
 * 
 * Usage:
 * ts-node secure-connection-test.ts <organization-url> [project-name]
 * 
 * Example:
 * ts-node secure-connection-test.ts https://dev.azure.com/myorg optional-project-name
 */

import { azureDevOpsClient } from '../services/azureDevOpsClient';
import * as readline from 'readline';

// Define interface for Azure DevOps project
interface IAzureDevOpsProject {
  id: string;
  name: string;
  state?: string;
  description?: string;
}

// Create secure readline interface
function createSecurePrompt(): readline.Interface {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Make input hidden for secure entry
  const stdoutWrite = process.stdout.write;
  // @ts-expect-error - Direct manipulation of stdout for security
  process.stdout.write = (chunk: string, encoding: BufferEncoding, callback?: (err?: Error) => void): boolean => {
    if (chunk.includes('Enter your Personal Access Token:')) {
      return stdoutWrite.call(process.stdout, chunk, encoding, callback);
    }
    return stdoutWrite.call(process.stdout, '*', encoding, callback);
  };
  
  return rl;
}

// Prompt for PAT securely
async function promptForPAT(): Promise<string> {
  const rl = createSecurePrompt();
  
  return new Promise<string>(resolve => {
    rl.question('Enter your Personal Access Token: ', (answer) => {
      rl.close();
      // Restore normal stdout behavior
      process.stdout.write = require('process').stdout.write;
      console.log(); // Add a newline after input
      resolve(answer);
    });
  });
}

async function runTest(): Promise<void> {
  // Get command line args
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Error: Missing organization URL.');
    console.log('Usage: ts-node secure-connection-test.ts <organization-url> [project-name]');
    process.exit(1);
  }
  
  const organizationUrl = args[0];
  const projectName = args[1]; // Optional
  
  console.log(`Testing connection to: ${organizationUrl}`);
  
  try {
    // Get PAT securely via prompt
    const personalAccessToken = await promptForPAT();
    
    if (!personalAccessToken || personalAccessToken.trim() === '') {
      console.error('Error: Personal Access Token is required.');
      process.exit(1);
    }
    
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
      // This assumes the first repository in the project is used
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
