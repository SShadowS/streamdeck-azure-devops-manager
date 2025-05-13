# Installation and Setup Guide

This guide will walk you through installing the Azure DevOps Manager plugin for Stream Deck and configuring it to work with your Azure DevOps organization.

## Prerequisites

Before installing the plugin, ensure you have:

- A Stream Deck hardware device (any model)
- Stream Deck software v6.4 or later installed on your computer
- An Azure DevOps account with access to the organizations, projects, and pipelines you want to monitor
- Appropriate permissions to create a Personal Access Token (PAT) in Azure DevOps

## Plugin Installation

### From the Stream Deck Marketplace (Recommended)

1. Open the Stream Deck software on your computer
2. Click on the Marketplace icon in the top-right corner
3. Search for "Azure DevOps Manager"
4. Click "Install" next to the Azure DevOps Manager plugin
5. The plugin will be automatically installed and added to your Stream Deck actions list

### Manual Installation

If you received the plugin as a `.streamDeckPlugin` file:

1. Double-click the `.streamDeckPlugin` file
2. The Stream Deck software will prompt you to install the plugin
3. Click "Install"
4. Restart the Stream Deck software if prompted

## Creating an Azure DevOps Personal Access Token (PAT)

The plugin requires a PAT to securely authenticate with your Azure DevOps organization. Follow these steps to create one:

1. Sign in to your Azure DevOps organization (`https://dev.azure.com/your-organization`)
2. Click on your user profile in the top-right corner
3. Select "Personal access tokens" from the dropdown
4. Click "New Token"
5. Fill in the form:
   - **Name**: Give it a descriptive name (e.g., "Stream Deck Azure DevOps Manager")
   - **Organization**: Select the organization you want to access
   - **Expiration**: Choose an appropriate expiration date (maximum is 1 year)
   - **Scopes**: Select "Custom defined" and ensure the following permissions are enabled:
     - **Build**: Read & Queue
     - **Code**: Read
     - **Project and Team**: Read
6. Click "Create"
7. **IMPORTANT**: Copy the generated token immediately and store it in a secure location. You will need it when configuring the plugin, and you won't be able to see it again.

## Adding an Action to Stream Deck

1. Open the Stream Deck software
2. From the action list on the right, locate the "Azure DevOps Manager" category
3. Drag one of the Azure DevOps Manager actions to an available button on your Stream Deck:
   - **Pipeline Monitor**: Tracks the status of a specific pipeline
   - **Pipeline Trigger**: Triggers a specific pipeline to run
   - **Pull Request Tracker**: Monitors open pull requests for a project or repository

## First-Time Configuration

When you add an Azure DevOps Manager action to your Stream Deck for the first time, you'll need to configure the connection settings:

1. Click the button on your Stream Deck to open the Property Inspector
2. In the "Connection Settings" section, enter:
   - **Organization URL**: The URL of your Azure DevOps organization (e.g., `https://dev.azure.com/your-organization`)
   - **Personal Access Token**: The PAT you created earlier
3. Click "Test Connection" to verify that your credentials work
4. Upon successful connection, you can proceed to configure the specific action settings

## Action-Specific Configuration

After setting up the connection, you'll need to configure each action based on its purpose. Refer to the specific action documentation for detailed configuration steps:

- [Pipeline Monitor Configuration](actions/pipeline-monitor.md)
- [Pipeline Trigger Configuration](actions/pipeline-trigger.md)
- [Pull Request Tracker Configuration](actions/pull-request-tracker.md)

## Connection Management

Once you've configured the connection settings for one action, they will be shared across all Azure DevOps Manager actions. However, if you need to update your connection settings (e.g., if your PAT expires):

1. Select any Azure DevOps Manager action on your Stream Deck
2. In the Property Inspector, click "Edit Connection" in the Connection Settings section
3. Update your Organization URL or Personal Access Token
4. Click "Test Connection" to verify the new settings
5. Click "Save" to apply the changes to all actions

## Next Steps

After installation and basic setup, proceed to the specific action documentation to learn how to:

- [Monitor pipeline statuses](actions/pipeline-monitor.md)
- [Trigger pipeline runs](actions/pipeline-trigger.md)
- [Track pull requests](actions/pull-request-tracker.md)

If you encounter any issues during setup, refer to the [Troubleshooting](troubleshooting.md) guide.
