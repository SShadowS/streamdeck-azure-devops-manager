# Pipeline Trigger Action

The Pipeline Trigger action enables you to start Azure DevOps pipeline runs directly from your Stream Deck. This action provides a convenient shortcut for triggering builds or deployments without navigating through the Azure DevOps web interface.

![Pipeline Trigger](../../com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/config.svg)

## Features

- **One-click pipeline triggering** for quick build initiation
- **Optional branch selection** to run pipelines on specific branches
- **Confirmation step** to prevent accidental triggers (optional)
- **Visual feedback** of trigger status directly on the button
- **Browser integration** option to automatically open the build page after triggering
- **Error handling** with visual indicators for failures or connection issues

## Configuration

To set up the Pipeline Trigger action:

1. Drag the Pipeline Trigger action to a button on your Stream Deck
2. If this is your first Azure DevOps Manager action, you'll need to [configure your connection settings](../installation.md#first-time-configuration)
3. Once connected, configure the following Pipeline Trigger specific settings:

### Basic Configuration

1. From the **Project** dropdown, select the Azure DevOps project containing your pipeline
2. From the **Pipeline** dropdown, select the specific pipeline you want to trigger

### Advanced Options

- **Branch** (Optional): Specify a branch name to run the pipeline on. Leave empty to use the default branch
- **Require confirmation**: When enabled, you'll need to press the button twice to trigger the pipeline
  - First press: Shows a confirmation prompt on the button
  - Second press: Actually triggers the pipeline
- **Open in browser after triggering**: When enabled, automatically opens the pipeline run page in your browser after successful triggering

## Button States

The Pipeline Trigger action uses different visual states to represent the action's status:

| Status | Description |
|--------|-------------|
| Ready to Trigger | The default state when the button is configured and ready to use |
| Confirm | Displayed when confirmation is required before triggering (first button press) |
| Triggering... | Displayed while the pipeline is being triggered |
| Success | Displayed briefly after successfully triggering a pipeline run |
| Error | Displayed when an error occurs while triggering the pipeline |
| Setup Required | The action needs to be configured |
| Disconnected | Cannot connect to Azure DevOps (authentication issue) |

## Button Actions

When you press the Pipeline Trigger button on your Stream Deck:

- If **Require confirmation** is enabled:
  1. First press: Changes the button state to "Confirm"
  2. Second press: Triggers the pipeline run
  
- If **Require confirmation** is disabled:
  - Single press: Immediately triggers the pipeline run

- After successful triggering:
  - If **Open in browser after triggering** is enabled, the pipeline run page will automatically open in your default browser
  - If disabled, the button will simply return to the "Ready to Trigger" state after briefly showing "Success"

## Tips for Effective Use

- **Pair with monitors**: Place pipeline trigger buttons next to their corresponding monitor buttons for a complete CI/CD control panel
- **Use confirmation for critical pipelines**: Enable the confirmation step for production deployment pipelines to prevent accidental triggers
- **Create branch-specific triggers**: Set up multiple trigger buttons for the same pipeline but with different branch configurations
- **Organize in folders**: Group related pipeline triggers in Stream Deck folders corresponding to your project structure
- **Use for frequently triggered pipelines**: Prioritize adding trigger actions for pipelines you commonly need to run manually

## Troubleshooting

If your Pipeline Trigger is not working as expected:

1. **Disconnected State**: If you see the disconnected indicator:
   - Ensure your Personal Access Token has not expired
   - Verify you have appropriate permissions (need Build: Queue permission)
   - Test your connection in the Property Inspector settings

2. **Error State**: If you see the error indicator after attempting to trigger:
   - Check your network connection
   - Verify the pipeline still exists in Azure DevOps
   - Ensure the specified branch exists (if you configured a specific branch)
   - Check the Stream Deck logs for more detailed error information

3. **Setup Required State**: If you see the configuration indicator:
   - Open the Property Inspector and ensure both project and pipeline are selected
   - If dropdowns are empty, check your PAT permissions

4. **Browser doesn't open**: If the browser doesn't open after triggering:
   - Verify that "Open in browser after triggering" is enabled in the action settings
   - Check your default browser settings
   - Try manually opening the pipeline in the browser to ensure you have access

For more general troubleshooting, see the [main troubleshooting guide](../troubleshooting.md).
