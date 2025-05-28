module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 收集测试覆盖率的目录
  collectCoverageFrom: [
    'web/**/*.js',
    '!web/config/**',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],

  // 覆盖率报告目录
  coverageDirectory: 'coverage',

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // 在运行测试前需要执行的设置文件
  setupFiles: ['<rootDir>/jest.setup.js'],

  // 忽略的文件/目录
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // 测试超时时间（毫秒）
  testTimeout: 10000,

  // 是否显示测试覆盖率报告
  verbose: true
};
