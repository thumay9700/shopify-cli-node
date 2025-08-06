module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/commands/**/*'  // Exclude CLI commands from coverage for now
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/'
  ],
  preset: 'ts-jest',
  resetMocks: true,
  restoreMocks: true,
  roots: ['<rootDir>/src', '<rootDir>/test'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testEnvironment: 'node',
  testMatch: [
    '**/test/**/*.test.ts',
    '**/__tests__/**/*.test.ts'
  ],
  testTimeout: 30_000,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'test/tsconfig.json'
    }]
  }
};
