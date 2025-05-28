// 加载环境变量
require('dotenv').config();

// 全局测试超时设置
jest.setTimeout(10000);

// 全局控制台输出设置
global.console = {
  ...console,
  // 保持错误输出
  error: jest.fn(),
  // 保持警告输出
  warn: jest.fn(),
  // 静默普通日志
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
