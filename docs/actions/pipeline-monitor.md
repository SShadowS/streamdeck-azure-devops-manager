# Pipeline Monitor Action

The Pipeline Monitor action allows you to track the status of a specific Azure DevOps pipeline directly on your Stream Deck. This action provides at-a-glance visibility of pipeline status with color-coded icons, eliminating the need to constantly switch to a browser to check build status.

![Pipeline Monitor](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/success.svg)

## Features

- **Real-time status updates** with periodic polling of the Azure DevOps API
- **Visual status indicators** using different icons and colors for each pipeline state
- **One-click access** to the latest pipeline run or definition
- **Support for all pipeline states** (success, failure, running, canceled, etc.)
- **Connection status awareness** with distinct indicators for disconnected or error states

## Configuration

To set up the Pipeline Monitor action:

1. Drag the Pipeline Monitor action to a button on your Stream Deck
2. If this is your first Azure DevOps Manager action, you'll need to [configure your connection settings](../installation.md#first-time-configuration)
3. Once connected, configure the following Pipeline Monitor specific settings:

### Pipeline Selection

1. From the **Project** dropdown, select the Azure DevOps project containing your pipeline
2. From the **Pipeline** dropdown, select the specific pipeline you want to monitor
3. (Optional) Adjust the **Refresh Interval** if needed (default is 30 seconds)

## Button States

The Pipeline Monitor action uses different icons to represent various pipeline states:

| Status | Icon | Description |
|--------|------|-------------|
| Success | ![Success](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/success.svg) | The most recent pipeline run completed successfully |
| Failed | ![Failed](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/failed.svg) | The most recent pipeline run failed |
| Running | ![Running](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/running.svg) | A pipeline run is currently in progress |
| Canceled | ![Canceled](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/canceled.svg) | The most recent pipeline run was canceled |
| Partial Success | ![Partial](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/partial.svg) | The pipeline completed with partial success |
| Not Started | ![Not Started](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/notStarted.svg) | A pipeline run has been queued but not started |
| No Builds | ![No Build](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/nobuild.svg) | No builds exist for this pipeline definition |
| Unknown | ![Unknown](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/unknown.svg) | The pipeline status cannot be determined |
| Configuration Required | ![Config](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/config.svg) | The action needs to be configured |
| Disconnected | ![Disconnected](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/disconnected.svg) | Cannot connect to Azure DevOps (authentication issue) |
| Error | ![Error](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/error.svg) | An error occurred while fetching the pipeline status |

## Button Actions

When you press the Pipeline Monitor button on your Stream Deck:

- If the pipeline has at least one run, it will open the latest pipeline run in your default browser
- If the pipeline has no runs yet, it will open the pipeline definition page

This allows you to quickly jump to the details of a failed build or check the progress of a running pipeline.

## Tips for Effective Use

- **Position strategically**: Place pipeline monitors for critical pipelines in prominent positions on your Stream Deck
- **Group related pipelines**: Use folders to organize pipeline monitors for related projects
- **Set appropriate refresh intervals**: Balance between timely updates and API rate limits
- **Monitor branch-specific pipelines**: Create separate buttons for monitoring pipelines on different branches
- **Complement with Pipeline Trigger actions**: Place a Pipeline Trigger action adjacent to its corresponding Monitor for quick re-runs

## Troubleshooting

If your Pipeline Monitor is not displaying the expected status:

1. **Disconnected State**: If you see the disconnected icon, check your Azure DevOps credentials:
   - Ensure your Personal Access Token has not expired
   - Verify you have appropriate permissions for the selected pipeline
   - Test your connection in the Property Inspector settings

2. **Error State**: If you see the error icon:
   - Check your network connection
   - Verify the pipeline still exists in Azure DevOps
   - Check the Stream Deck logs for more detailed error information

3. **Stale Status**: If the status seems outdated:
   - Try decreasing the refresh interval in the action settings
   - Check if the Azure DevOps API is experiencing delays
   - Remove and re-add the action to force a fresh connection

4. **Config State**: If you see the configuration icon:
   - Open the Property Inspector and ensure both project and pipeline are selected
   - If dropdowns are empty, check your PAT permissions

For more general troubleshooting, see the [main troubleshooting guide](../troubleshooting.md).
