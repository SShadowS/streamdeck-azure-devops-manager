# Active Context: Azure DevOps Manager

## Current Work Focus

The Azure DevOps Manager project has moved from the initial setup phase to implementing core features. The current focus has been on enhancing both Pipeline Monitor and Pull Request Tracker functionality, with an emphasis on real-time status updates, interactive features, proper event handling with the Stream Deck SDK, and creating comprehensive user documentation.

## Recent Changes

- **Created Comprehensive User Documentation**
  - ✅ Established a structured documentation architecture in a dedicated `docs/` directory
  - ✅ Created a main overview page as `README.md` in the root directory (originally in docs/ but moved to root)
  - ✅ Updated all documentation links in README.md to point to the correct files in the docs/ directory
  - ✅ Developed a detailed installation and setup guide with PAT creation instructions
  - ✅ Created dedicated guides for each action type:
    - Pipeline Monitor documentation with configuration, button states, and troubleshooting
    - Pipeline Trigger documentation with configuration, advanced options, and usage tips
    - Pull Request Tracker documentation with project/repository selection guidance
  - ✅ Added a comprehensive troubleshooting guide organized by issue type
  - ✅ Created a FAQ section addressing common user questions
  - ✅ Included visual references to button states using existing icons
  - ✅ Implemented cross-references between documents for easier navigation
  - ✅ Used consistent formatting and structure across all documentation files
  - ✅ Documented all configuration options, button states, and user interactions
  - ✅ Updated memory-bank with documentation details in progress.md

- **Enhanced Pull Request Tracker Action**
  - ✅ Improved the `onKeyDown` functionality in `PullRequestTracker` to open relevant PR lists in a browser
  - ✅ Added support for repository-specific PR links when a specific repository is selected
  - ✅ Implemented fallback to project-level PR views when repository details are unavailable
  - ✅ Added URL generation method to `AzureDevOpsClient` to encapsulate PR list URL creation logic
  - ✅ Enhanced error handling in the PR Tracker with visual feedback when URL opening fails
  - ✅ Updated tests to properly validate the new functionality with comprehensive coverage
  - ✅ Improved type safety for URL parameters when generating PR list links

- **Removed Unused GlobalSettings Files**
  - ✅ Removed `src/actions/globalSettings.ts` action class
  - ✅ Removed `com.sshadows.azure-devops-manager.sdPlugin/ui/globalSettings.html` Property Inspector
  - ✅ Confirmed these files were unused - the GlobalSettings action wasn't registered in plugin.ts or manifest.json
  - ✅ Connection testing and configuration functionality is now integrated in individual action Property Inspectors

- **Implemented Pull Request Tracker Action**
  - ✅ Created PullRequestTracker class extending SingletonAction
  - ✅ Implemented core event handlers (onWillAppear, onWillDisappear, onKeyDown)
  - ✅ Added real-time PR count updates with polling mechanism
  - ✅ Integrated with Azure DevOps API client for PR status
  - ✅ Added visual status indicators on Stream Deck buttons
  - ✅ Implemented Property Inspector UI for project and repository selection
  - ✅ Added ability to monitor all repositories in a project or a specific repository
  - ✅ Enhanced Azure DevOps API client with getRepositories method
  - ✅ Added comprehensive error handling and connectivity status indicators
  
- **Completed Property Inspector UI Implementation**
  - ✅ Created HTML-based UI for configuring Pipeline Monitor action
  - ✅ Added project and pipeline selection dropdowns
  - ✅ Implemented bidirectional communication with the plugin
  - ✅ Added loading states and error handling for API requests
  - ✅ Styled UI to match Stream Deck's design language
  - ✅ Added configuration options for status display and notifications
  - ✅ Implemented endpoint (Organization URL) and PAT configuration within the action UI
  - ✅ Added "Edit Connection" button to allow modifying connection settings after initial setup

- Created the basic Stream Deck plugin structure
- Set up the development environment with TypeScript and Rollup
- Established project documentation via the Memory Bank
- **Removed** the example "Counter" action and associated files/code.
- **Implemented Azure DevOps API client service (`src/services/azureDevOpsClient.ts`)**
  - Implemented core structure with singleton pattern
  - Added authentication mechanism using Personal Access Tokens
  - Defined TypeScript interfaces for Azure DevOps resources (Pipelines, PRs, etc.)
  - Implemented methods with actual API calls: `getPipelineDefinitions`, `getPipelineStatus`, `getPullRequests`, `testConnection`
  - Includes caching, retry logic, and error handling.
- **Implemented Settings Management System**
  - Created type definitions for global and action-specific settings
  - Implemented SettingsManager service for handling organization and project settings
  - Added methods for managing projects (add, update, remove, favorite)
  - Integrated with Stream Deck SDK for persistent settings storage
  - Connected settings to Azure DevOps client for authentication
  - Added comprehensive unit tests for settings management
- **Fixed Unit Tests**
  - Fixed state contamination issues in `settingsManager.test.ts` by ensuring each test uses a fresh deep copy of the test settings
  - Improved test output by suppressing console logs in tests with mocks
  - Ensured proper test isolation to prevent state leakage between tests
- **Added Code Quality Tooling and Fixed Linting Errors**
  - Configured ESLint with proper rules in `eslint.config.cjs`
  - Added ignore rules for compiled and output directories
  - Fixed interface naming convention issues (renamed to follow `I*` pattern)
  - Improved type safety (replaced `any` with `unknown`)
  - Extracted `ApiError` class to separate file to fix max-classes-per-file rule
  - Added missing return type annotations in functions
  - Disabled `no-console` warning rule during development phase (to be re-enabled before production)
- **Verified and Enhanced Azure DevOps API Integration**
  - ✅ Verified API client against official Azure DevOps REST API documentation (updated to v7.1)
  - ✅ Fixed response handling in the client to match documented API response formats
  - ✅ Added `getProjects()` method to fetch available projects from Azure DevOps
  - ✅ Connected `getProjects()` method to `SettingsManager.fetchAndAddProjects()` to auto-populate projects
  - ✅ Enhanced unit tests with proper mocking and expanded test coverage
  - ✅ Created `.env.test`-based connection test script for easy local testing
  - ✅ Successfully tested against actual Azure DevOps instance
  - ✅ Updated `.gitignore` to protect credentials in `.env*` files
- **Implemented Pipeline Monitor Action**
  - ✅ Created PipelineMonitor class extending SingletonAction
  - ✅ Implemented core event handlers (onWillAppear, onWillDisappear, onKeyDown)
  - ✅ Added real-time status updates with polling mechanism
  - ✅ Integrated with Azure DevOps API client for pipeline status
  - ✅ Added visual status indicators on Stream Deck buttons
  - ✅ Handled different pipeline states (running, succeeded, failed, etc.)
  - ✅ Added proper error handling and connectivity status indicators
  - ✅ Implemented Property Inspector UI for pipeline selection
  - ✅ Added communication between action and Property Inspector to fetch projects and pipelines
- **Added Unit Tests for Pipeline Monitor**
  - ✅ Created comprehensive test suite for PipelineMonitor
  - ✅ Mocked Stream Deck SDK actions, API client, and settings manager
  - ✅ Tested all event handlers and core functionality
  - ✅ Verified proper button updates for all pipeline states
  - ✅ Validated polling mechanism for real-time updates
  - ✅ Added tests for Property Inspector UI communication
  - ✅ Tested error handling for invalid settings and API failures
  - ✅ Achieved 90%+ code coverage for the action
- **Enhanced Service Layer Test Coverage**
  - ✅ Improved overall service layer coverage from ~73% to 92.04% for statements
  - ✅ Increased function coverage from 84% to 98%
  - ✅ Enhanced azureDevOpsClient.ts coverage from 78.65% to 90.85%
  - ✅ Improved settingsManager.ts coverage from 61.6% to 92.85%
  - ✅ Added comprehensive test cases for:
    - API client retry mechanism
    - Cache management and expiration
    - Error categorization and handling
    - Network errors and invalid response handling
    - Settings loading/saving error scenarios
    - Project management functionality
    - Authentication validation edge cases

- **Fixed Enhanced Test Suites**
  - ✅ Addressed multiple failing tests in enhanced test suites
  - ✅ Fixed azureDevOpsClient.test.enhanced.ts by properly mocking the request method
  - ✅ Fixed explicit type handling for ApiError catches in various error scenarios
  - ✅ Resolved issues with pipelineMonitor.test.ts by avoiding manipulation of protected static properties
  - ✅ Implemented Array.from() mocking strategy to intercept action collections
  - ✅ Refactored problematic tests to use explicit error handling patterns
  - ✅ Improved tests for asynchronous operations with better Promise handling
  - ✅ Increased overall test stability by minimizing inter-test dependencies

- **Resolved Workspace Linting and Quality Issues**
  - ✅ Fixed conditional `expect` calls in test files by restructuring tests to use proper Jest patterns
  - ✅ Replaced `any` type annotations with specific typed interfaces in test files
  - ✅ Fixed unused variables and parameters by removing them or prefixing with underscores
  - ✅ Replaced all `console.log` and `console.error` calls in production code with `streamDeck.logger` methods
  - ✅ Added appropriate ESLint disable comments for necessary console statements in test files
  - ✅ Fixed markdown formatting issues across documentation:
    - Added missing top-level headings
    - Corrected list marker spacing for consistency
    - Ensured proper blank lines around headings and lists
    - Removed trailing spaces
  - ✅ All ESLint errors and warnings resolved
  - ✅ All markdownlint warnings addressed

## Next Steps

1. ✅ **Complete Pipeline Monitor Action**
   - ✅ Create first production action for monitoring pipeline status
   - ✅ Implement status updates with proper event handling
   - ✅ Design status visualization on Stream Deck buttons
   - ✅ Implement Pipeline property selection UI (Property Inspector)
   - ✅ Add custom icons for different pipeline states

2. ✅ **Complete Pull Request Tracker Action**
   - ✅ Develop action for tracking PR status
   - ✅ Design visualization for PR counts and statuses
   - ✅ Implement PR list opening functionality on button press
   - ✅ Ensure proper error handling and visual feedback

3. ✅ **Create User Documentation**
   - ✅ Develop setup guide for first-time users
   - ✅ Create usage instructions for each action type
   - ✅ Add troubleshooting section for common issues
   - ✅ Include visual examples of different button states and their meanings
   - ✅ Create FAQ to address common questions

4. **Improve Test Coverage for Actions**
   - ✅ Create tests for PipelineMonitor action (now has ~78% coverage)
   - ✅ Update tests for PullRequestTracker action with enhanced functionality
   - Create tests for entry point (plugin.ts)
   - ✅ Address failing tests in enhanced test suites
   - Consider implementing E2E tests with actual Stream Deck SDK

5. **Consider Advanced PR Features**
   - Implement PR approval/rejection directly from Stream Deck buttons
   - Add detailed PR information display (reviewer status, build status)
   - Create PR creation shortcuts
   - Implement PR filtering by author or reviewer

6. **Continue Code Quality Improvements**
   - ✅ Disabled console warnings during development (will need to be re-enabled before production)
   - Consider adding TypeScript strict mode for better type safety
   - Add automated linting as part of CI/CD if applicable
   - Re-enable `no-console` rule before production release

7. **Enhance User Documentation**
   - Consider adding screenshots of the Property Inspector UI for each action
   - Potentially add diagrams for more complex workflows
   - Create a simplified "Quick Start" guide for new users
   - Add version-specific documentation as new features are implemented

## Active Decisions & Considerations

### API Interaction Strategy

- **Decision Made**: Pull updates via polling
  - ✅ Implemented polling in the PipelineMonitor action
  - ✅ Added configurable refresh interval via settings
  - ✅ Added proper cleanup of intervals when actions disappear
  - Future Consideration: Evaluate webhooks for v2 if the polling approach has limitations

### Visual Design

- **Decision Made**: Icon-based status representation
  - ✅ Created custom icons for different states (success, failed, running, etc.)
  - ✅ Implemented icon loading and caching through IconManager
  - ✅ Used consistent visual language across different action types
  - ✅ Ensured clear visual differentiation between states

### Error Handling

- **Decision Made**: Comprehensive error handling strategy
  - ✅ API client has retry logic for transient errors
  - ✅ PipelineMonitor shows "Error" status on API failures
  - ✅ PipelineMonitor shows "Disconnected" status when auth settings are invalid
  - ✅ Graceful degradation with clear visual indicators of connectivity status
  - ✅ Enhanced connection testing with detailed logging and visual feedback
  - ✅ Added "Testing connection..." indicator with spinner in the UI

### URL Generation

- **Decision Made**: Service-based URL construction
  - ✅ Added URL generation methods to AzureDevOpsClient service
  - ✅ Used consistent patterns for URL construction
  - ✅ Implemented proper error handling for URL opening operations
  - ✅ Created type-safe parameter interfaces for URL construction

### Documentation Structure

- **Decision Made**: Hierarchical markdown-based documentation
  - ✅ Created a main README.md as the entry point in the root directory
  - ✅ Organized action documentation in the docs/actions/ directory
  - ✅ Separated installation, troubleshooting, and FAQ into distinct files in the docs/ directory
  - ✅ Used cross-references between documents for better navigation
  - ✅ Updated all links in the README.md to point to the correct locations
  - ✅ Maintained consistent structure and formatting across all files

## Important Patterns and Preferences

### Code Organization

- Each action should be in its own file under src/actions/
- Shared services should be placed in src/services/
- Common utilities in src/utils/
- Types and interfaces in dedicated files
- Interface names should follow the 'I' prefix convention (e.g., `ISettings`, not `Settings`)

### API Access Pattern

- Create a singleton API client service
- Actions should request data through this service
- Service should handle caching, authentication, and error retries

### UI Updates

- Follow the Stream Deck SDK patterns for UI updates
- Use setTitle, setImage, and setState methods consistently
- Consider throttling updates to avoid flickering

### Property Inspector Communication

- Follow the established Stream Deck communication pattern:
  - Use `sendToPropertyInspector` to send data from plugin to UI
  - Use `sendToPlugin` to send data from UI to plugin
  - Structure messages with a `command` property and relevant data
  - Handle errors and provide feedback in the UI

### Documentation Style

- Use Markdown for all documentation
- Organize content hierarchically with clear headings
- Include practical examples and visual references
- Provide cross-references between related documents
- Use tables for presenting state information and configuration options
- Keep a consistent structure across similar documentation (e.g., action guides)
- Break down complex instructions into numbered steps
- Use bold text for UI elements and configuration options

### Development Methodology

- Use Test-Driven Development (TDD) approach
  - Write tests before implementing features
  - Run tests continuously during development
  - Refactor code with confidence based on test coverage
- Follow SOLID principles throughout the codebase
  - Maintain single responsibility for classes and methods (max one class per file)
  - Design for extensibility without modifying existing code
  - Use appropriate abstractions and dependency injection
- Maintain code quality with linting
  - ESLint for JavaScript/TypeScript linting
  - Enforce consistent code style and best practices
  - Use proper type annotations (avoid `any`, prefer `unknown` for truly unknown types)
  - Always add explicit return types to functions

## Learnings and Insights

### Property Inspector UI Development

- Stream Deck Property Inspector uses WebSocket for communicating with the plugin
- Registration happens through the `connectElgatoStreamDeckSocket` function
- The Property Inspector is loaded in an iframe within the Stream Deck software
- CSS styling should account for the dark theme of Stream Deck
- Error handling is important for graceful degradation
- Property Inspectors can request different types of data from the plugin

### SDK Architecture Insights

- The Elgato Stream Deck SDK provides a clean event-driven architecture
- TypeScript decorators simplify action registration
- The SingletonAction base class is appropriate for most Azure DevOps monitoring scenarios
- Settings persistence is handled automatically by the Stream Deck software
- Node.js fetch API is suitable for making HTTP requests to the Azure DevOps API
- Stream Deck SDK event handlers use generics for type safety with settings
- The actions collection in SingletonAction provides access to all instances
- Proper cleanup of timers and intervals is essential in onWillDisappear handlers
- Visual status indicators need to be clear and concise on small Stream Deck buttons
- Unit testing Stream Deck actions requires careful mocking of the SDK's interfaces

### URL Generation Patterns

- URL generation should be centralized in service classes for consistency
- Typed parameter interfaces provide better maintainability and error prevention
- Repository-specific vs. project-wide URLs need different parameter sets
- Error handling for URL opening should have visual feedback for users
- Browser opening implementation needs to be cross-platform (Windows, macOS, Linux)

### Documentation Best Practices

- User documentation should explain both how to configure an action and how to use it
- Error states and troubleshooting guidance are essential for user experience
- Cross-referencing between documents improves navigation and reduces duplication
- Consistent structure across action documentation helps users learn similar patterns
- FAQs should address common user questions before they need to be asked
- Visual representation of button states is more effective than text descriptions alone
- Installation guides should include prerequisites and post-installation configuration
- Troubleshooting sections should be organized by symptoms rather than causes
