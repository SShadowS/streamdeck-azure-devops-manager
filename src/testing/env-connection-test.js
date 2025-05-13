/**
 * Environment-based Azure DevOps Connection Test
 * 
 * This script tests connection to Azure DevOps using credentials from a .env.test file.
 * It's a pure JavaScript file so it doesn't require TypeScript compilation.
 * 
 * Requires:
 * - A .env.test file in the project root with AZURE_ORG_URL and AZURE_PAT variables
 * 
 * Usage:
 * node src/testing/env-connection-test.js [project-name]
 * 
 * Example:
 * node src/testing/env-connection-test.js optional-project-name
 */

// Import required modules
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.test file
const result = dotenv.config({ path: resolve(process.cwd(), '.env.test') });

if (result.error) {
  console.error('❌ Error loading .env.test file:');
  console.error('   Make sure you have created a .env.test file in the project root');
  console.error('   You can copy .env.test.example and fill in your actual values');
  process.exit(1);
}

// Basic Azure DevOps API client for testing
class AzureDevOpsTestClient {
  constructor(organizationUrl, personalAccessToken) {
    this.organizationUrl = organizationUrl;
    this.personalAccessToken = personalAccessToken;
    this.baseUrl = organizationUrl;
    this.apiVersion = '7.1';
    
    // Base64 encode the PAT (format is :pat, with empty username)
    this.authHeader = Buffer.from(`:${personalAccessToken}`).toString('base64');
  }
  
  // Helper method to build API URLs
  buildUrl(path) {
    const url = new URL(this.baseUrl);
    // Remove trailing slash from baseUrl if it exists
    const baseWithoutTrailingSlash = url.href.endsWith('/') 
      ? url.href.slice(0, -1) 
      : url.href;
    
    // Add path and API version
    return `${baseWithoutTrailingSlash}/${path}?api-version=${this.apiVersion}`;
  }
  
  // Helper method to make API requests
  async apiRequest(path) {
    const url = this.buildUrl(path);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${this.authHeader}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }
  
  // Test connection by fetching a single project
  async testConnection() {
    try {
      // Make a lightweight API call to validate the connection
      await this.apiRequest('_apis/projects?$top=1&$skip=0&stateFilter=All');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
  
  // Get projects list
  async getProjects(top = 100, skip = 0) {
    return this.apiRequest(`_apis/projects?$top=${top}&$skip=${skip}&stateFilter=All`);
  }
  
  // Get repositories in a project
  async getRepositories(project) {
    return this.apiRequest(`${encodeURIComponent(project)}/_apis/git/repositories`);
  }
  
  // Get pipeline definitions for a project
  async getPipelineDefinitions(project) {
    return this.apiRequest(`${encodeURIComponent(project)}/_apis/build/definitions`);
  }
  
  // Get pipeline definitions for a project with a specific name or path
  async searchPipelineDefinitions(project, nameOrPath) {
    return this.apiRequest(`${encodeURIComponent(project)}/_apis/build/definitions?name=${encodeURIComponent(nameOrPath)}`);
  }
  
  // Get pull requests for a project/repository
  async getPullRequests(project, repository, status = 'active') {
    return this.apiRequest(`${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repository)}/pullrequests?searchCriteria.status=${status}`);
  }
}

async function runTest() {
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
  
  // Create test client
  const azureDevOpsClient = new AzureDevOpsTestClient(organizationUrl, personalAccessToken);
  
  try {
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
    
    // Display project list
    projectsResponse.value.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
    });
    
    // If a project name was provided, check if it exists directly
    if (projectName) {
      const projectsResponse = await azureDevOpsClient.getProjects();
      const projectExists = projectsResponse.value.some(p => p.name === projectName);
      
      if (projectExists) {
        // If project exists directly, use the original flow
        console.log(`\nTesting pipeline definitions for project: ${projectName}`);
        try {
          const pipelineDefinitionsResponse = await azureDevOpsClient.getPipelineDefinitions(projectName);
          
          // Check response format - might be an array directly or an object with a value property
          const pipelineDefinitions = Array.isArray(pipelineDefinitionsResponse) 
            ? pipelineDefinitionsResponse 
            : (pipelineDefinitionsResponse.value || []);
          
          console.log(`✅ Found ${pipelineDefinitions.length} pipeline definitions:\n`);
          
          if (pipelineDefinitions.length > 0) {
            pipelineDefinitions.forEach((pipeline, index) => {
              console.log(`${index + 1}. ${pipeline.name} (ID: ${pipeline.id})`);
            });
          }
        } catch (error) {
          console.error(`❌ Failed to fetch pipeline definitions for "${projectName}":`, error);
        }
      } else {
        // Project doesn't exist directly - try to find it as a repository or pipeline in the first project
        const firstProject = projectsResponse.value[0];
        
        if (firstProject) {
          console.log(`\nProject "${projectName}" not found. Checking if it exists as a resource in project: ${firstProject.name}`);
          
          // Check if it's a repository
          try {
            console.log(`\nChecking repositories in project: ${firstProject.name}...`);
            const reposResponse = await azureDevOpsClient.getRepositories(firstProject.name);
            
            if (reposResponse.value && Array.isArray(reposResponse.value)) {
              console.log(`✅ Found ${reposResponse.value.length} repositories in ${firstProject.name}:`);
              
              reposResponse.value.forEach((repo, index) => {
                console.log(`${index + 1}. ${repo.name} (ID: ${repo.id})`);
              });
              
              // Check if the repository matches our search
              const matchingRepo = reposResponse.value.find(r => r.name === projectName);
              if (matchingRepo) {
                console.log(`\n✅ Found "${projectName}" as a repository in project ${firstProject.name}!`);
                
                // Try to get pull requests for this repository
                try {
                  const pullRequestsResponse = await azureDevOpsClient.getPullRequests(firstProject.name, matchingRepo.name);
                  
                  if (pullRequestsResponse.value && Array.isArray(pullRequestsResponse.value)) {
                    const pullRequests = pullRequestsResponse.value;
                    console.log(`✅ Found ${pullRequests.length} active pull requests in repository: ${firstProject.name}/${matchingRepo.name}`);
                    
                    if (pullRequests.length > 0) {
                      console.log('\nDisplaying first 5 pull requests:');
                      pullRequests.slice(0, 5).forEach((pr, index) => {
                        console.log(`${index + 1}. #${pr.pullRequestId}: ${pr.title} (Created by: ${pr.createdBy.displayName})`);
                      });
                    }
                  }
                } catch (error) {
                  console.error(`❌ Failed to fetch pull requests for repository "${matchingRepo.name}":`, error);
                }
              } else {
                console.log(`❌ Repository "${projectName}" not found in project ${firstProject.name}`);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to fetch repositories for project "${firstProject.name}":`, error);
          }
          
          // Check if it's a pipeline definition (folder or name)
          try {
            console.log(`\nChecking pipeline definitions in project: ${firstProject.name}...`);
            
            // First, list all pipeline definitions
            const pipelineDefsResponse = await azureDevOpsClient.getPipelineDefinitions(firstProject.name);
            
            if (pipelineDefsResponse.value && Array.isArray(pipelineDefsResponse.value)) {
              console.log(`✅ Found ${pipelineDefsResponse.value.length} pipeline definitions in ${firstProject.name}`);
              
              // Search for a pipeline with matching name or path
              const matchingPipelines = pipelineDefsResponse.value.filter(p => 
                p.name === projectName || 
                (p.path && p.path.includes(projectName)) ||
                (p.folder && p.folder.includes(projectName))
              );
              
              if (matchingPipelines.length > 0) {
                console.log(`\n✅ Found ${matchingPipelines.length} pipeline definitions matching "${projectName}":`);
                matchingPipelines.forEach((pipeline, index) => {
                  console.log(`${index + 1}. ${pipeline.name} (Path: ${pipeline.path || 'Root'}, ID: ${pipeline.id})`);
                });
              } else {
                console.log(`❌ No pipeline definitions found matching "${projectName}" in project ${firstProject.name}`);
                
                // Try to search specifically by name
                try {
                  console.log(`\nTrying direct search for pipeline definition "${projectName}" in project ${firstProject.name}...`);
                  const searchResponse = await azureDevOpsClient.searchPipelineDefinitions(firstProject.name, projectName);
                  
                  if (searchResponse.value && Array.isArray(searchResponse.value) && searchResponse.value.length > 0) {
                    console.log(`✅ Search found ${searchResponse.value.length} matching pipeline definitions:`);
                    searchResponse.value.forEach((pipeline, index) => {
                      console.log(`${index + 1}. ${pipeline.name} (Path: ${pipeline.path || 'Root'}, ID: ${pipeline.id})`);
                    });
                  } else {
                    console.log(`❌ No pipeline definitions found with name "${projectName}" in project ${firstProject.name}`);
                  }
                } catch (error) {
                  console.error(`❌ Failed to search pipeline definitions for "${projectName}" in project "${firstProject.name}":`, error);
                }
              }
            }
          } catch (error) {
            console.error(`❌ Failed to fetch pipeline definitions for project "${firstProject.name}":`, error);
          }
        }
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
