# Pull Request Tracker Action

The Pull Request Tracker action allows you to monitor open pull requests in your Azure DevOps projects or specific repositories directly from your Stream Deck. This action displays the count of active PRs and provides one-click access to the PR list in your browser.

![Pull Request Tracker](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pr/pr-active.svg)

## Features

- **Real-time PR count updates** with periodic polling of the Azure DevOps API
- **Project-wide or repository-specific tracking** options
- **Visual indicators** showing the number of open PRs
- **One-click access** to the PR list in your browser
- **Connection status awareness** with distinct indicators for disconnected or error states

## Configuration

To set up the Pull Request Tracker action:

1. Drag the Pull Request Tracker action to a button on your Stream Deck
2. If this is your first Azure DevOps Manager action, you'll need to [configure your connection settings](../installation.md#first-time-configuration)
3. Once connected, configure the following Pull Request Tracker specific settings:

### Basic Configuration

1. From the **Project** dropdown, select the Azure DevOps project you want to track PRs for

### Repository Selection

- **All Repositories**: Select this option to track PRs across all repositories in the selected project
- **Specific Repository**: Select this option and then choose a repository from the dropdown to track PRs only for that repository

### Advanced Options

- **Refresh Interval**: Adjust the frequency (in seconds) at which the PR status is checked (default is 30 seconds)

## Button States

The Pull Request Tracker action uses different visual states to represent the PR status:

| Status | Icon | Description |
|--------|------|-------------|
| Active PRs | ![PR Active](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pr/pr-active.svg) | Shows the count of open pull requests |
| No PRs | ![PR None](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pr/pr-none.svg) | No open pull requests found |
| Configuration Required | ![PR Config](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pr/pr-config.svg) | The action needs to be configured |
| Disconnected | ![PR Disconnected](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pr/pr-disconnected.svg) | Cannot connect to Azure DevOps (authentication issue) |
| Error | ![PR Error](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pr/pr-error.svg) | An error occurred while fetching pull requests |

## Button Actions

When you press the Pull Request Tracker button on your Stream Deck:

- If monitoring **All Repositories** in a project:
  - Opens the project-wide pull request list page in your default browser
- If monitoring a **Specific Repository**:
  - Opens the repository-specific pull request list page in your default browser

This allows you to quickly view and manage the pull requests that the button is tracking.

## Tips for Effective Use

- **Create multiple trackers**: Set up different buttons for different projects or repositories
- **Group by team**: Create a Stream Deck folder for each team with PR trackers for their repositories
- **Combine with pipeline actions**: Place PR trackers alongside pipeline monitors for a complete project status panel
- **Position strategically**: Place high-priority repository trackers in prominent positions
- **Set appropriate refresh intervals**: Balance between timely updates and API rate limits

## Troubleshooting

If your Pull Request Tracker is not displaying the expected status:

1. **Disconnected State**: If you see the disconnected icon:
   - Ensure your Personal Access Token has not expired
   - Verify you have appropriate permissions (need Code: Read permission)
   - Test your connection in the Property Inspector settings

2. **Error State**: If you see the error icon:
   - Check your network connection
   - Verify the project and repository still exist in Azure DevOps
   - Check the Stream Deck logs for more detailed error information

3. **Stale Data**: If the PR count seems outdated:
   - Try decreasing the refresh interval in the action settings
   - Check if the Azure DevOps API is experiencing delays
   - Remove and re-add the action to force a fresh connection

4. **Config State**: If you see the configuration icon:
   - Open the Property Inspector and ensure a project is selected
   - If you've selected "Specific Repository", ensure a repository is also selected
   - If dropdowns are empty, check your PAT permissions

5. **Browser doesn't open**: If clicking the button doesn't open the PR list:
   - Check your default browser settings
   - Try manually opening Azure DevOps in the browser to ensure you have access
   - Verify you have network connectivity

For more general troubleshooting, see the [main troubleshooting guide](../troubleshooting.md).
