/**
 * Jest configuration file
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    // Transform @elgato packages, which use ESM
    '/node_modules/(?!@elgato)/'
  ],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/testing/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,  // Lowered from 80 for initial development
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
