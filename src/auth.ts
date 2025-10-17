// src/auth.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

// 动态获取环境变量，避免模块加载时的时机问题
const getValidToken = () => {
  return process.env['MCP_GATEWAY_TOKEN'] || 'your-secret-token';
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const VALID_TOKEN = getValidToken();
  
  logger.debug('=== AUTH DEBUG INFO ===');
  logger.debug('Request path:', req.path);
  logger.debug('Request method:', req.method);
  
  const authHeader = req.headers.authorization;
  logger.debug('Authorization header received');
  logger.debug('Expected VALID_TOKEN length:', VALID_TOKEN.length);
  
  if (!authHeader) {
    logger.warn('ERROR: Missing authorization header');
    res.status(401).json({ 
      error: 'Missing authorization header',
      message: 'Authorization header is required'
    });
    return;
  }
  
  // 支持两种格式：Bearer token 或直接token
  let token = authHeader;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    logger.debug('Bearer format detected');
  } else {
    logger.debug('Direct token format detected');
  }
  
  // 只记录token是否存在，不显示实际token值
  const tokenPresent = token.length > 0;
  logger.debug('Token present:', tokenPresent);
  
  // 验证token是否匹配
  const isTokenValid = token === VALID_TOKEN;
  logger.debug('Token validation result:', isTokenValid);
  
  if (!isTokenValid) {
    logger.warn('ERROR: Token mismatch');
    res.status(403).json({ 
      error: 'Invalid token',
      message: 'Provided token does not match expected value'
    });
    return;
  }
  
  logger.info('SUCCESS: Authentication passed');
  next();
};
