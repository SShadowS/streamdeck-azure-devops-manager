# Azure DevOps Connection Testing Tools

This directory contains tools for testing connectivity to Azure DevOps services.

## Environment-based Connection Test

The most convenient way to test your Azure DevOps connection is using the environment-based test script.

### Setup

1. Copy the example environment file to create your actual test environment file:
   ```bash
   cp .env.test.example .env.test
   ```

2. Edit the `.env.test` file and add your Azure DevOps credentials:
   ```
   AZURE_ORG_URL=https://dev.azure.com/your-organization
   AZURE_PAT=your-personal-access-token
   ```

### Running the Connection Test

We've created a simple JavaScript-based connection test that doesn't require TypeScript compilation:

```bash
# To run the connection test (lists all projects)
npm run test-connection

# To test with a specific project (lists pipelines and PRs for that project)
npm run test-connection -- YourProjectName
```

The connection test uses a lightweight implementation of the Azure DevOps client that avoids any module compatibility issues, making it easier to run directly with Node.js.

### What the Test Does

The connection test performs the following steps:

1. Validates your Azure DevOps credentials
2. Lists all projects accessible with your token
3. If a project name is provided, it also:
   - Lists pipeline definitions in that project
   - Lists active pull requests (assuming the repository has the same name as the project)

### Troubleshooting

If the connection test fails, check the following:

1. Verify that your personal access token (PAT) has the necessary permissions:
   - Read access to Projects
   - Read access to Build (for pipelines)
   - Read access to Code (for pull requests)

2. Ensure the organization URL is correct (should be in the format `https://dev.azure.com/your-organization`)

3. If testing a specific project, verify the project name is spelled correctly (case-sensitive)

## Manual Testing

You can also use the `AzureDevOpsClient` directly in your own scripts to perform custom testing. See the `env-connection-test-cjs.ts` file for examples of how to initialize the client and make API calls.
