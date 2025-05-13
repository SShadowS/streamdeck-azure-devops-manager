# Troubleshooting Guide

This guide addresses common issues you might encounter when using the Azure DevOps Manager plugin for Stream Deck. If you run into problems not covered here, please check the Stream Deck logs for more detailed error information.

## Connection Issues

### "Disconnected" Icon Appears on Actions

If your actions display the disconnected icon:

1. **Check your Personal Access Token (PAT)**:
   - Verify that your PAT has not expired (they can expire after a max of 1 year)
   - Ensure your PAT has the correct permissions (Build: Read & Queue, Code: Read, Project and Team: Read)
   - Generate a new PAT if necessary following the [Installation Guide](installation.md#creating-an-azure-devops-personal-access-token-pat)

2. **Verify Organization URL**:
   - Ensure your organization URL is correctly formatted (e.g., `https://dev.azure.com/your-organization`)
   - Try opening the URL in a browser to confirm it's accessible
   - Check for any typos in the organization name

3. **Update Connection Settings**:
   - Open the Property Inspector for any Azure DevOps Manager action
   - Click "Edit Connection" in the Connection Settings section
   - Update your Organization URL and/or Personal Access Token
   - Click "Test Connection" to verify the new settings

4. **Network Issues**:
   - Check your internet connection
   - If you're behind a corporate firewall or proxy, ensure it's not blocking connections to Azure DevOps
   - Verify you can access Azure DevOps from a browser on the same machine

### Connection Test Fails

If the "Test Connection" button in the Property Inspector results in an error:

1. **Check the error message** shown in the Property Inspector for specific details
2. **Verify your organization exists** by trying to access it in a browser
3. **Check PAT scopes** to ensure they include the minimum required permissions
4. **Try a new PAT** to rule out token-specific issues
5. **Check your network connectivity** to Azure DevOps

## Action-Specific Issues

### Pipeline Monitor Issues

1. **No status displayed** / **Configuration icon shown**:
   - Ensure you've selected both a project and pipeline in the Property Inspector
   - Verify the pipeline still exists in Azure DevOps
   - Check that your PAT has Build: Read permissions

2. **Status seems outdated**:
   - Decrease the refresh interval in the action settings
   - Remove and re-add the action to force a fresh connection
   - Check if the Azure DevOps API is experiencing delays

### Pipeline Trigger Issues

1. **Pipeline doesn't trigger**:
   - Ensure your PAT has Build: Queue permissions
   - Verify the pipeline allows manual triggers
   - Check that the specified branch exists (if configured)
   - Look for error messages in the Stream Deck logs

2. **Confirmation doesn't work**:
   - Ensure the "Require confirmation" option is enabled in the settings
   - Try pressing the button within the timeout period (a few seconds)

### Pull Request Tracker Issues

1. **No PR count shown**:
   - Ensure you've selected a project in the Property Inspector
   - If tracking a specific repository, verify it exists and is selected
   - Check that your PAT has Code: Read permissions

2. **Browser doesn't open when clicked**:
   - Check your default browser settings
   - Look for error messages in the Stream Deck logs
   - Try manually opening the PR list in a browser

## Visual Update Issues

1. **Button appearance doesn't update**:
   - Check if the Stream Deck software is running properly
   - Try removing and re-adding the action
   - Restart the Stream Deck software

2. **Icons not displaying correctly**:
   - Ensure the plugin installation completed successfully
   - Try reinstalling the plugin

3. **Text appears cut off**:
   - Some long pipeline names may not display fully on the button
   - Consider using shorter display names or abbreviations

## Stream Deck Software Issues

1. **Plugin doesn't appear in actions list**:
   - Verify the plugin was successfully installed
   - Check for any installation errors
   - Restart the Stream Deck software
   - Try reinstalling the plugin

2. **Property Inspector doesn't open**:
   - Click the gear icon on the action in the Stream Deck software
   - If that doesn't work, try removing and re-adding the action
   - Restart the Stream Deck software if the issue persists

3. **Plugin crashes**:
   - Update to the latest version of the Stream Deck software
   - Check the Stream Deck logs for error information
   - Try reinstalling the plugin

## Finding Stream Deck Logs

Logs can provide valuable information for troubleshooting. To access Stream Deck logs:

### Windows

1. Open Windows Explorer
2. Navigate to `%appdata%\Elgato\StreamDeck\Logs`
3. Look for log files with the prefix `com.sshadows.azure-devops-manager`

### macOS

1. Open Finder
2. Press `Cmd+Shift+G` to open the Go to Folder dialog
3. Enter `~/Library/Logs/Elgato/StreamDeck`
4. Look for log files with the prefix `com.sshadows.azure-devops-manager`

## API Rate Limiting

Azure DevOps has API rate limits. If you encounter issues with multiple actions not updating:

1. **Increase refresh intervals** for your actions
2. **Reduce the number of actions** polling the same project or repository
3. **Prioritize critical pipelines and repositories** for monitoring

## Resetting the Plugin

If you're experiencing persistent issues, you can try resetting the plugin:

1. Remove all Azure DevOps Manager actions from your Stream Deck
2. Uninstall the plugin from the Stream Deck software
3. Restart the Stream Deck software
4. Reinstall the plugin
5. Reconfigure your actions

## Still Having Issues?

If the above solutions don't resolve your problem:

1. Check for plugin updates
2. Try on a different machine to isolate hardware-specific issues
3. Verify you're using a supported version of Stream Deck software (v6.4+)
4. Check system requirements (Node.js runtime is included in the plugin)
