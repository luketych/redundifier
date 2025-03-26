module.exports = {
  testEnvironment: 'node',
  testMatch: ['tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/config/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000
};
