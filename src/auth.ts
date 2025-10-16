// src/auth.ts
import { Request, Response, NextFunction } from 'express';

// 动态获取环境变量，避免模块加载时的时机问题
const getValidToken = () => {
  return process.env['MCP_GATEWAY_TOKEN'] || 'your-secret-token';
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const VALID_TOKEN = getValidToken();
  
  console.log('=== AUTH DEBUG INFO ===');
  console.log('Request path:', req.path);
  console.log('Request method:', req.method);
  
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader);
  console.log('Expected VALID_TOKEN:', VALID_TOKEN);
  
  if (!authHeader) {
    console.log('ERROR: Missing authorization header');
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
    console.log('Bearer format detected, extracted token:', token);
  } else {
    console.log('Direct token format, using:', token);
  }
  
  console.log('Token to compare:', token);
  console.log('Expected token:', VALID_TOKEN);
  console.log('Tokens match:', token === VALID_TOKEN);
  
  if (token !== VALID_TOKEN) {
    console.log('ERROR: Token mismatch');
    console.log('Token length:', token.length);
    console.log('Expected token length:', VALID_TOKEN.length);
    res.status(403).json({ 
      error: 'Invalid token',
      message: 'Provided token does not match expected value'
    });
    return;
  }
  
  console.log('SUCCESS: Authentication passed');
  next();
};
