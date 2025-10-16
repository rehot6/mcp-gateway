// src/transports/stdioServer.ts
import { getService } from '../serviceManager.js';

export async function startGatewayStdioServer() {
  console.log('Gateway STDIO server started (simplified version)');
  
  // 简化的STDIO服务器实现
  process.stdin.on('data', async (data) => {
    try {
      const request = JSON.parse(data.toString());
      console.log('STDIO request received:', request);
      
      // 这里可以添加处理逻辑
      if (request.method === 'list_services') {
        const services = Object.keys(getService());
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: { services }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (error) {
      console.error('STDIO server error:', error);
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error'
        }
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });
}
