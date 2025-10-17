// src/logger.ts
import winston from 'winston';

// 从环境变量获取日志级别
const logLevel = process.env['LOG_LEVEL'] || 'info';

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
    // 清理消息中的特殊字符，避免出现多余的"]"
    let cleanMessage = message.replace(/\]/g, '');
    
    let logMessage = `${timestamp} [${level.toUpperCase()}] ${cleanMessage}`;
    
    // 如果有额外的元数据，添加到日志中
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// 根据环境变量决定是否输出到文件
const transports: any[] = [];

// 添加控制台传输器
transports.push(
  new winston.transports.Console({
    format: logFormat,
    level: logLevel
  })
);

// 创建logger实例
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  transports: transports
});

// 将logger导出，供其他模块使用
export { logger };

// 导出日志等级常量
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;
