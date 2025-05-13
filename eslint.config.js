import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import jestPlugin from 'eslint-plugin-jest';
import globals from 'globals';

export default [
  // Config for the config file itself and other JS config files
  {
    files: ['*.config.js', '*.config.mjs', '.eslintrc.cjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      globals: {
        ...globals.node
      }
    }
  },
  {
    // Apply to all JS/TS files
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: tsParser,
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
      '@typescript-eslint': tsPlugin,
      'jest': jestPlugin
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
      'no-console': 'warn',
      'eqeqeq': ['error', 'always'],
      'curly': 'error',
      // Style
      'indent': ['error', 2],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always']
    }
  },
  // Jest test files config
  {
    files: ['**/*.test.{js,ts}', '**/__tests__/**/*.{js,ts}'],
    plugins: {
      'jest': jestPlugin
    },
    rules: {
      ...jestPlugin.configs.recommended.rules
    }
  }
];
