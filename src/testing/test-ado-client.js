/**
 * Azure DevOps API Client Test Script
 * 
 * This is a simple script to test the Azure DevOps API client.
 * Run with: node src/testing/test-ado-client.js
 * 
 * This script demonstrates how to:
 * 1. Initialize the API client with credentials
 * 2. Test the connection to Azure DevOps
 * 3. Fetch pipeline definitions and status
 * 4. Fetch pull requests
 * 5. Demonstrate caching functionality
 * 6. Show error handling capabilities
 */

// Import from the source files
import { azureDevOpsClient } from '../services/azureDevOpsClient.js';
import { PullRequestStatus } from '../types/ado.js';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to log section headers
function logSection(title) {
  console.log('\n' + colors.bright + colors.cyan + '====== ' + title + ' ======' + colors.reset);
}

// Helper function to measure execution time
async function measureTime(fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

/**
 * Main test function
 */
async function main() {
  console.log(colors.bright + colors.cyan);
  console.log('Azure DevOps API Client Test');
  console.log('=============================' + colors.reset);
  console.log('Testing the enhanced AzureDevOpsClient with real API calls, caching, and error handling');

  try {
    // Before running this script, replace these values with your actual Azure DevOps details
    const organizationUrl = 'https://dev.azure.com/example-organization';
    const personalAccessToken = 'example-pat-token-would-go-here';
    const projectName = 'example-project';
    const repositoryName = 'example-repo';

    // Initialize the client with credentials
    logSection('Client Initialization');
    console.log('Initializing Azure DevOps client...');
    azureDevOpsClient.initialize({
      organizationUrl,
      personalAccessToken
    });
    console.log(colors.green + '✓ Client initialized successfully' + colors.reset);

    // Test the connection
    logSection('Connection Test');
    console.log('Testing connection to Azure DevOps...');
    const connectionSuccess = await azureDevOpsClient.testConnection();
    
    if (connectionSuccess) {
      console.log(colors.green + '✓ Connection successful!' + colors.reset);
    } else {
      console.log(colors.red + '✗ Connection failed. Check your credentials or organization URL.' + colors.reset);
      // Since connection failed, we'll return early
      return;
    }

    // Demonstrating caching
    logSection('Caching Demonstration');
    console.log('Making first request to fetch pipeline definitions (no cache)...');
    
    // First call - should hit the API
    const [firstResult, firstTime] = await measureTime(() => 
      azureDevOpsClient.getPipelineDefinitions(projectName)
    );
    
    console.log(`Found ${firstResult.length} pipeline definitions in ${firstTime.toFixed(2)}ms (API call)`);
    
    // Second call - should use the cache
    console.log('\nMaking second identical request (should use cache)...');
    const [secondResult, secondTime] = await measureTime(() => 
      azureDevOpsClient.getPipelineDefinitions(projectName)
    );
    
    console.log(`Found ${secondResult.length} pipeline definitions in ${secondTime.toFixed(2)}ms (cached)`);
    
    if (secondTime < firstTime) {
      const speedup = (firstTime / secondTime).toFixed(1);
      console.log(colors.green + `✓ Cache working! Second request was ${speedup}x faster.` + colors.reset);
    } else {
      console.log(colors.yellow + '! Cache might not be working as expected.' + colors.reset);
    }
    
    // Clearing the cache
    console.log('\nClearing the cache...');
    azureDevOpsClient.clearCache();
    console.log(colors.green + '✓ Cache cleared' + colors.reset);

    // Test fetching pipeline definitions
    logSection('Pipeline Definitions');
    console.log('Fetching pipeline definitions...');
    const pipelineDefinitions = await azureDevOpsClient.getPipelineDefinitions(projectName);
    console.log(`Found ${pipelineDefinitions.length} pipeline definitions for ${projectName}:`);
    
    pipelineDefinitions.forEach(definition => {
      console.log(`- ${colors.bright}${definition.name}${colors.reset} (ID: ${definition.id})`);
    });

    // If we have a pipeline definition, test fetching its status
    if (pipelineDefinitions.length > 0) {
      logSection('Pipeline Status');
      const pipelineId = pipelineDefinitions[0].id;
      console.log(`Fetching status for pipeline ${pipelineId}...`);
      const pipelineStatus = await azureDevOpsClient.getPipelineStatus(projectName, pipelineId);
      
      if (pipelineStatus) {
        console.log(colors.green + '✓ Pipeline status retrieved successfully' + colors.reset);
        console.log('Pipeline details:');
        console.log(`- Build Number: ${colors.bright}${pipelineStatus.buildNumber}${colors.reset}`);
        console.log(`- Status: ${getStatusColor(pipelineStatus.status)}${pipelineStatus.status}${colors.reset}`);
        console.log(`- Result: ${getResultColor(pipelineStatus.result)}${pipelineStatus.result}${colors.reset}`);
        console.log(`- Started: ${new Date(pipelineStatus.startTime).toLocaleString()}`);
        console.log(`- Finished: ${new Date(pipelineStatus.finishTime).toLocaleString()}`);
        console.log(`- URL: ${colors.blue}${pipelineStatus.url}${colors.reset}`);
      } else {
        console.log(colors.yellow + '! No recent builds found for this pipeline' + colors.reset);
      }
    }

    // Test fetching pull requests
    logSection('Pull Requests');
    console.log(`Fetching active pull requests for ${repositoryName}...`);
    const pullRequests = await azureDevOpsClient.getPullRequests(
      projectName, 
      repositoryName, 
      PullRequestStatus.Active
    );
    
    if (pullRequests.length > 0) {
      console.log(colors.green + `✓ Found ${pullRequests.length} active pull requests` + colors.reset);
      pullRequests.forEach(pr => {
        console.log(`\n- ${colors.bright}${pr.title}${colors.reset} (ID: ${pr.pullRequestId})`);
        console.log(`  Created by: ${pr.createdBy.displayName}`);
        console.log(`  Status: ${pr.status}, Draft: ${pr.isDraft ? colors.yellow + 'Yes' + colors.reset : colors.green + 'No' + colors.reset}`);
        console.log(`  Source: ${colors.magenta}${pr.sourceRefName}${colors.reset} → Target: ${colors.cyan}${pr.targetRefName}${colors.reset}`);
      });
    } else {
      console.log(colors.yellow + '! No active pull requests found' + colors.reset);
    }

    // Demonstrate error handling with a non-existent repository
    logSection('Error Handling Demonstration');
    console.log('Attempting to fetch pull requests from a non-existent repository...');
    const nonExistentRepo = 'this-repo-does-not-exist';
    
    try {
      const emptyPRs = await azureDevOpsClient.getPullRequests(projectName, nonExistentRepo);
      console.log(colors.green + `✓ Graceful handling! Returned empty array with ${emptyPRs.length} items.` + colors.reset);
    } catch (error) {
      console.error(colors.red + 'Error handling failed:', error + colors.reset);
    }

    logSection('Test Complete');
    console.log(colors.green + '✓ All tests completed successfully!' + colors.reset);
    console.log('\nThis test demonstrates the Azure DevOps client capabilities:');
    console.log('- API authentication and communication');
    console.log('- Automatic response caching for performance');
    console.log('- Graceful error handling');
    console.log('- Pipeline and PR information retrieval');

  } catch (error) {
    console.error(colors.red + '\n❌ Error during API tests:' + colors.reset, error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your Personal Access Token permissions');
    console.log('2. Verify the organization URL is correct');
    console.log('3. Make sure the project and repository names exist');
    console.log('4. Check your internet connection');
  }
}

// Helper function to colorize build status
function getStatusColor(status) {
  switch (status) {
    case 'inProgress': return colors.yellow;
    case 'completed': return colors.green;
    case 'notStarted': return colors.dim;
    case 'postponed': return colors.blue;
    case 'canceled': return colors.red;
    default: return colors.reset;
  }
}

// Helper function to colorize build result
function getResultColor(result) {
  switch (result) {
    case 'succeeded': return colors.green;
    case 'partiallySucceeded': return colors.yellow;
    case 'failed': return colors.red;
    case 'canceled': return colors.red;
    case 'none': return colors.dim;
    default: return colors.reset;
  }
}

// Run the main function
main().catch(error => {
  console.error(colors.red + '\n❌ Unhandled error:' + colors.reset, error);
});
