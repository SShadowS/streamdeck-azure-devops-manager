# Technical Context: Azure DevOps Manager

## Development Environment

### Core Technologies

- **TypeScript**: v5.2.2
- **Node.js**: v20.x
- **Stream Deck SDK**: v2 (using @elgato/streamdeck v1.0.0)

### Build & Bundling

- **Bundler**: Rollup v4.0.2
- **Module Format**: ES Modules (type: "module" in package.json)
- **Output**: Single JavaScript bundle for the plugin (bin/plugin.js)

### Plugins & Extensions

- **Rollup Plugins**:
  - @rollup/plugin-typescript - TypeScript compilation
  - @rollup/plugin-commonjs - CommonJS compatibility
  - @rollup/plugin-node-resolve - Module resolution
  - @rollup/plugin-terser - Code minification

## TypeScript Configuration

```typescript
// tsconfig.json highlights
{
  "extends": "@tsconfig/node20/tsconfig.json",
  "compilerOptions": {
    "customConditions": ["node"],
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "noImplicitOverride": true
  }
}
```

- Using Node 20 baseline configuration
- ES2022 module system
- Bundler-style module resolution
- Enforcing explicit `override` keywords for method overrides

## Project Structure

### Key Directories

- `/src`: TypeScript source files
- `/src/actions`: Action class implementations
- `/src/services`: Services for API communication and settings management
- `/src/types`: Type definitions and interfaces
- `/src/actions/__tests__`: Unit tests for actions
- `/src/services/__tests__`: Unit tests for services
- `/src/testing`: Test utilities and scripts
- `/com.sshadows.azure-devops-manager.sdPlugin`: Stream Deck plugin files
  - `/imgs`: Images for the plugin and actions
  - `/ui`: HTML files for Property Inspector UI
  - `/bin`: Output directory for compiled JavaScript (not in source control)

### Main Files

- `src/plugin.ts`: Entry point that registers actions
- `src/actions/*.ts`: Individual action implementations
- `src/services/azureDevOpsClient.ts`: API client for Azure DevOps
- `src/services/settingsManager.ts`: Manages plugin settings
- `src/services/apiError.ts`: Error handling for API calls
- `src/types/ado.ts`: Type definitions for Azure DevOps resources
- `src/types/settings.ts`: Type definitions for plugin settings
- `com.sshadows.azure-devops-manager.sdPlugin/manifest.json`: Plugin configuration
- `rollup.config.mjs`: Build configuration

## Development Workflow

### Build Process

- **Development Build**: `npm run build` - Builds the plugin using Rollup
- **Watch Mode**: `npm run watch` - Builds and watches for changes, automatically restarting the plugin

### Testing & Quality Assurance

- **Run Tests**: `npm run test` - Runs Jest tests
- **Watch Tests**: `npm run test:watch` - Runs Jest tests in watch mode 
- **Test Coverage**: `npm run test:coverage` - Runs tests with coverage reporting
- **Linting**: `npm run lint` - Runs ESLint on TypeScript files
- **Fix Linting Issues**: `npm run lint:fix` - Runs ESLint and fixes issues automatically
- **Validate**: `npm run validate` - Runs both linting and tests (useful before commits)

#### Test Coverage Status

| Service Module | Statement Coverage | Functions Coverage | Branch Coverage |
|----------------|-------------------|-------------------|----------------|
| Service Layer (Overall) | 92.04% | 98% | 80.61% |
| azureDevOpsClient.ts | 90.85% | 95.45% | 77.14% |
| settingsManager.ts | 92.85% | 100% | 92% |
| apiError.ts | 100% | 100% | 66.66% |

Overall project coverage is at 34.21% due to actions (pipelineMonitor.ts, globalSettings.ts) having 0% coverage. The service layer has excellent coverage.

#### Testing Structure

- **Base Tests**: Standard unit tests for core functionality
- **Enhanced Tests**: Comprehensive tests for edge cases, error handling, and complex scenarios
  - Created as separate `.enhanced.ts` files to keep base tests concise
  - Focus on complex interactions (retry logic, caching, error scenarios)
  - Use specialized mocking to test hard-to-reach code paths

### Deployment

- The compiled plugin is stored in the `com.sshadows.azure-devops-manager.sdPlugin/bin` directory
- Stream Deck automatically loads the plugin from this location

### Development Practices

- **Test-Driven Development (TDD)**: The project follows TDD practices
  - Write tests before implementing functionality
  - Ensure high test coverage (aiming for >90% on service layer)
  - Use tests to guide design decisions
  - Implement granular test cases for complex logic
- **Code Quality Tools**:
  - ESLint for static code analysis and style enforcement
  - TypeScript's static type checking
  - Jest for unit testing with coverage reporting
  - Modular test structure (base tests + enhanced tests)
  
### Logging & Diagnostics

- **Stream Deck Logger**: The project uses the Stream Deck SDK's built-in logger
  - Access via `streamDeck.logger` instead of `console.log`
  - Supports multiple log levels: `info`, `warn`, `error`, `trace`
  - Logs are captured in Stream Deck's log file for better diagnostics
  - Example usage: `streamDeck.logger.info('Pipeline Monitor will appear: ${context}');`
- **Structured Logging**:
  - Consistent logging patterns with appropriate log levels
  - Detailed step-by-step logging for complex operations
  - Use of distinct emoji prefixes for easier visual scanning of logs

## Stream Deck SDK Integration

### Plugin Configuration

```json
// manifest.json highlights
{
  "SDKVersion": 2,
  "Software": {
    "MinimumVersion": "6.4"
  },
  "OS": [
    {
      "Platform": "mac",
      "MinimumVersion": "12"
    },
    {
      "Platform": "windows",
      "MinimumVersion": "10"
    }
  ],
  "Nodejs": {
    "Version": "20",
    "Debug": "enabled"
  }
}
```

- Targets Stream Deck software v6.4+
- Compatible with macOS 12+ and Windows 10+
- Uses Node.js v20 runtime with debugging enabled

### Action Registration Pattern

```typescript
import { action, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.sshadows.azure-devops-manager.pipeline-monitor" })
export class PipelineMonitor extends SingletonAction<JsonObject> {
  // Implementation
}
```

## Dependencies

### Production Dependencies

- **@elgato/streamdeck**: Core SDK for Stream Deck plugin development

### Development Dependencies

- **@elgato/cli**: Command-line tools for Stream Deck plugin development
- **TypeScript & tslib**: TypeScript language and runtime support
- **@types/node**: TypeScript definitions for Node.js
- **Rollup and plugins**: Build system components
- **dotenv**: For loading environment variables from `.env.test` files for local testing
- **Jest**: Testing framework for unit tests
- **ESLint**: Code quality and style enforcement

## Technical Constraints

1. **Stream Deck Interface Limitations**:
   - Limited display space on buttons
   - Text must be concise and readable at small sizes
   - Images should be clear and communicate status effectively

2. **API Considerations**:
   - Azure DevOps API rate limits must be respected
   - Authentication via Personal Access Tokens
   - API calls should be optimized to minimize bandwidth and latency

3. **Cross-Platform Requirements**:
   - Plugin must function correctly on both Windows and macOS
   - Node.js v20-compatible code only

## Future Technical Considerations

1. **API Client Implementation**:
   - ✅ Implemented typed client for Azure DevOps API
   - ✅ Implemented robust error handling and retry logic
   - ✅ Added comprehensive test coverage (90.85%)
   - Consider adding more API endpoints as needed

2. **State Management**:
   - ✅ Implemented pattern for managing stateful actions using SingletonAction
   - ✅ Implemented persistent settings with Stream Deck SDK
   - ✅ Implemented cache for API responses with full test coverage
   - ✅ Implemented project management functionality with 92.85% coverage
   - Consider enhancing caching strategy for more complex scenarios

3. **UI Components**:
   - Develop consistent visual language for different status states
   - Create reusable components for Property Inspector interfaces
   - Add custom icons for different pipeline states

4. **Testing Enhancements**:
   - Add tests for action classes (PipelineMonitor, GlobalSettings)
   - Add tests for plugin entry point
   - Consider implementing E2E tests for Property Inspector
   - Fix failing enhanced tests and improve test stability
