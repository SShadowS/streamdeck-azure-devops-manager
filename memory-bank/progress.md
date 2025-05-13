## Pipeline Features - Completed

**Status:** All planned pipeline features have been implemented.

**Details:**

1.  **Custom Icons for Pipeline States:**
    *   Created SVG icons for all relevant pipeline states (e.g., success, failed, running, canceled, partial, notStarted, unknown, config, disconnected, noBuild, error).
    *   Implemented an `IconManager` service (`src/services/iconManager.ts`) to load, cache, and provide these icons as base64 data URLs.
    *   Integrated the `IconManager` into the `PipelineMonitor` action (`src/actions/pipelineMonitor.ts`) to display these custom icons on the Stream Deck button, replacing or supplementing the previous state/title-based feedback.

2.  **Pipeline Trigger Action:**
    *   Added a `queuePipelineRun` method to the `AzureDevOpsClient` (`src/services/azureDevOpsClient.ts`) to initiate pipeline builds.
    *   Created a new `PipelineTrigger` action (`src/actions/pipelineTrigger.ts`) with the UUID `com.sshadows.azure-devops-manager.pipeline-trigger`.
    *   This action allows users to:
        *   Select a project and pipeline to trigger.
        *   Optionally specify a branch to build.
        *   Configure whether to show a confirmation step before triggering.
        *   Configure whether to open the build page in a browser after triggering.
    *   The action provides visual feedback on the button for states like "Ready to Trigger", "Confirm", "Triggering...", "Success", "Error", "Setup Required", and "Disconnected".
    *   Created a new Property Inspector HTML file (`com.sshadows.azure-devops-manager.sdPlugin/ui/pipelineTrigger.html`) for configuring this action, similar in structure to the `pipelineMonitor.html`.
    *   Registered the new action in `src/plugin.ts` and added its definition to `com.sshadows.azure-devops-manager.sdPlugin/manifest.json`.
    *   Updated `src/types/settings.ts` to include `IPipelineTriggerSettings` and `defaultPipelineTriggerSettings`.

3.  **Pipeline Detail View Enhancement (for PipelineMonitor):**
    *   Enhanced the `onKeyDown` event in the `PipelineMonitor` action.
    *   When the button is pressed, it now attempts to open the URL of the *latest run* of the monitored pipeline.
    *   Added a `getLatestPipelineRunUrl` method to `AzureDevOpsClient` for this purpose.
    *   If no runs exist for the pipeline, it falls back to opening the pipeline's definition page.
    *   Utilized a new private `openUrl` method (using `child_process.exec` for cross-platform compatibility) in `PipelineMonitor` to open URLs.

4.  **Notification Support (for PipelineMonitor):**
    *   The `PipelineMonitor` action already included settings (`showNotifications`) and basic logging for status changes. This was verified and deemed sufficient for the current scope.

**Files Modified/Created:**

*   `src/actions/pipelineMonitor.ts` (Updated)
*   `src/actions/pipelineTrigger.ts` (New)
*   `src/services/azureDevOpsClient.ts` (Updated)
*   `src/services/iconManager.ts` (New)
*   `src/types/settings.ts` (Updated)
*   `src/plugin.ts` (Updated)
*   `com.sshadows.azure-devops-manager.sdPlugin/manifest.json` (Updated)
*   `com.sshadows.azure-devops-manager.sdPlugin/ui/pipelineTrigger.html` (New)
*   `com.sshadows.azure-devops-manager.sdPlugin/imgs/pipeline/` (New directory with SVG icons: `success.svg`, `failed.svg`, `running.svg`, `canceled.svg`, `partial.svg`, `notStarted.svg`, `unknown.svg`, `config.svg`, `disconnected.svg`, `nobuild.svg`, `error.svg`)

**Next Steps:**
*   Proceed with Pull Request Features.
