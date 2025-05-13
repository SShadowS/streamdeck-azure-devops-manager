# Frequently Asked Questions

## General Questions

### What is the Azure DevOps Manager plugin?

The Azure DevOps Manager is a Stream Deck plugin that integrates with Azure DevOps to provide easy monitoring and control of pipelines and pull requests directly from your Stream Deck device.

### Does it work with all Stream Deck devices?

Yes, the plugin works with all Stream Deck hardware models, including the original Stream Deck, Stream Deck Mini, Stream Deck XL, Stream Deck MK.2, and Stream Deck+.

### Which operating systems are supported?

The plugin supports both Windows 10+ and macOS 12+, as long as the Stream Deck software (v6.4 or later) is installed.

### Is the plugin free to use?

Yes, the Azure DevOps Manager plugin is currently available at no cost.

### Will this plugin work with GitHub or other CI/CD tools?

No, this plugin is specifically designed for Azure DevOps. It uses the Azure DevOps API and won't work with other services like GitHub, GitLab, or Jenkins.

## Setup and Configuration

### Do I need an Azure DevOps account to use this plugin?

Yes, you need an Azure DevOps account with access to the organizations, projects, and pipelines you want to monitor or trigger.

### What permissions do I need in Azure DevOps?

You need sufficient permissions to:

- View pipelines (Build: Read)
- Queue pipeline runs (Build: Queue) - for the Pipeline Trigger action
- View pull requests (Code: Read)
- View projects (Project and Team: Read)

### How do I create a Personal Access Token (PAT)?

See the detailed instructions in our [Installation Guide](installation.md#creating-an-azure-devops-personal-access-token-pat).

### Is my Personal Access Token (PAT) stored securely?

Yes, your PAT is stored securely using the Stream Deck SDK's secure settings storage mechanism. The plugin never logs or exports your token.

### Can I connect to multiple Azure DevOps organizations?

Currently, the plugin supports one organization at a time. All actions within the plugin will use the same organization URL and PAT.

### Do I need to enter my credentials for each action?

No, you only need to enter your Organization URL and Personal Access Token once. These connection settings are shared across all Azure DevOps Manager actions.

## Features and Functionality

### How often does the plugin check for updates?

By default, the plugin checks for updates every 30 seconds, but you can adjust the refresh interval in each action's settings to balance between timely updates and API rate limits.

### Can I trigger a pipeline with specific parameters or variables?

The current version only supports triggering pipelines with an optional branch specification. Support for custom variables and parameters may be added in future versions.

### Does the plugin support YAML pipelines or just classic pipelines?

The plugin supports both YAML pipelines and classic pipelines in Azure DevOps.

### Can I approve or reject pull requests using the plugin?

The current version only supports monitoring pull requests and opening them in a browser. Direct approval/rejection functionality may be added in future versions.

### Will the plugin notify me when a pipeline fails?

The plugin provides visual feedback on your Stream Deck, but it doesn't currently generate system notifications. You can see at a glance when a pipeline fails by the red icon that appears on the button.

### Can I monitor pipeline stages or jobs, or just the overall pipeline?

The current version monitors the overall pipeline status. Detailed stage or job monitoring may be considered for future versions.

### How many pipelines or repositories can I monitor?

You can monitor as many as you have buttons available on your Stream Deck! However, be mindful of API rate limits if you set up too many actions with frequent refresh intervals.

## Performance and Limits

### Does the plugin affect the performance of my computer?

The plugin has minimal impact on system performance. It uses efficient polling and caching strategies to minimize resource usage.

### Are there API rate limits I should be aware of?

Yes, Azure DevOps imposes API rate limits. To avoid hitting these limits:

- Increase the refresh interval for actions that don't need frequent updates
- Limit the number of actions monitoring the same project or repository
- Prioritize critical pipelines and repositories for monitoring

### What happens if I reach the API rate limit?

If you reach the API rate limit, the plugin will show an error state temporarily. The plugin includes retry logic that will automatically back off and try again after a period of time.

### Does the plugin work offline?

The plugin requires an internet connection to communicate with Azure DevOps. In offline scenarios, the actions will show a "Disconnected" or "Error" state until connectivity is restored.

## Troubleshooting

### Why doesn't my Pipeline Monitor show any status?

Ensure you've:

1. Correctly configured the connection settings
2. Selected both a project and a pipeline
3. Verified your PAT has the necessary permissions
4. Confirmed the pipeline still exists in Azure DevOps

See the [Pipeline Monitor documentation](actions/pipeline-monitor.md) for more details.

### Why can't I trigger my pipeline?

Check that:

1. Your PAT has the Build: Queue permission
2. The pipeline allows manual triggers
3. The branch you specified (if any) exists
4. You're not in a confirmation state waiting for a second press

See the [Pipeline Trigger documentation](actions/pipeline-trigger.md) for more details.

### Why doesn't my Pull Request Tracker show any PRs?

Verify that:

1. You've selected a project
2. Your PAT has Code: Read permissions
3. If tracking a specific repository, it exists and is selected
4. There are actually open PRs in the selected project/repository

See the [Pull Request Tracker documentation](actions/pull-request-tracker.md) for more details.

### I'm encountering an issue not covered here. What should I do?

Check the [Troubleshooting Guide](troubleshooting.md) for more detailed problem-solving steps, including how to access and interpret the Stream Deck logs.

## Updates and Future Development

### How do I update the plugin?

Updates will be available through the Stream Deck software. When a new version is available, you'll be prompted to update through the Stream Deck software's plugin manager.

### What features are planned for future versions?

Planned features include:

- PR approval/rejection directly from Stream Deck buttons
- Detailed PR information display
- Support for multiple organizations
- Additional pipeline trigger options
- Enhanced notification capabilities

### Can I request new features?

Yes! Feature requests and feedback are welcome and help drive future development.

### I'm a developer. Can I contribute to the plugin?

The plugin is currently closed-source, but we appreciate feedback and suggestions from the developer community.
