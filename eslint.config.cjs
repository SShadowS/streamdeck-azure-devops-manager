const globals = require('globals');

module.exports = [
  // Ignore compiled files and output directories
  {
    ignores: [
      'com.sshadows.azure-devops-manager.sdPlugin/bin/**',
      'com.sshadows.azure-devops-manager.sdPlugin/**/*.js',
      'coverage/**',
      'dist/**'
    ]
  },
  
  // Config for JS config files (to prevent inclusion in TS checking)
  {
    files: ['*.{js,cjs,mjs}'],
    ignores: ['src/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      globals: {
        ...globals.node
      }
    }
  },
  
  // Source TypeScript files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      'jest': require('eslint-plugin-jest')
    },
    rules: {
      // SOLID principles support
      'max-classes-per-file': ['error', 1], // Encourages Single Responsibility
      '@typescript-eslint/no-explicit-any': 'error', // Encourages proper typing
      '@typescript-eslint/explicit-member-accessibility': ['error', { 'accessibility': 'explicit' }], // Clear access modifiers
      '@typescript-eslint/explicit-function-return-type': ['error', { 'allowExpressions': true }], // Clear return types
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          'selector': 'interface',
          'format': ['PascalCase'],
          'custom': {
            'regex': '^I[A-Z]',
            'match': true
          }
        }
      ],
      // Code quality
      'no-console': 'off', // Allowed during development, TODO: Re-enable before production release
      'eqeqeq': ['error', 'always'],
      'curly': 'error',
      // Style
      'indent': ['error', 2],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always']
    }
  },
  
  // Jest test files
  {
    files: ['**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      'jest': require('eslint-plugin-jest')
    },
    rules: {
      ...require('eslint-plugin-jest').configs.recommended.rules,
      // Allow test files to have console logs
      'no-console': 'off'
    }
  }
];
