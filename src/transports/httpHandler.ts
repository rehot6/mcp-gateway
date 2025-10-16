// src/transports/httpHandler.ts
import { persistentServiceManager } from '../persistentServiceManager.js';

export async function forwardToStdioService(serviceCommand: string[], requestBody: any) {
  console.log('=== HTTP HANDLER DEBUG INFO ===');
  console.log('Service command:', serviceCommand);
  console.log('Original request body:', JSON.stringify(requestBody, null, 2));
  
  // 验证命令参数
  if (!Array.isArray(serviceCommand) || serviceCommand.length === 0) {
    throw new Error('Invalid service command');
  }

  // 验证命令安全性
  const fullCommand = serviceCommand.join(' ');
  if (fullCommand.includes(';') || fullCommand.includes('&&') || fullCommand.includes('||')) {
    throw new Error('Command contains potentially dangerous characters');
  }

  try {
    // 转换请求格式为MCP协议格式
    let mcpRequestBody = requestBody;
    
    // 如果请求包含method参数，转换为MCP的tools/call格式
    if (requestBody.method && requestBody.method !== 'tools/call' && requestBody.method !== 'tools/list') {
      console.log('Converting request to MCP tools/call format');
      mcpRequestBody = {
        jsonrpc: '2.0',
        id: requestBody.id || 1,
        method: 'tools/call',
        params: {
          name: requestBody.method,
          arguments: requestBody.params || {}
        }
      };
      console.log('Converted MCP request body:', JSON.stringify(mcpRequestBody, null, 2));
    }

    // 使用持久化服务管理器发送请求
    // 使用命令的第一个部分作为服务ID（简化实现）
    const serviceId = serviceCommand[1] || 'unknown';
    console.log('Using persistent service manager for service:', serviceId);
    
    const response = await persistentServiceManager.sendRequest(serviceId, serviceCommand, mcpRequestBody);
    console.log('Service response:', response);
    
    return response;
  } catch (error: any) {
    console.error('Service execution error:', error);
    throw new Error(`Service invocation failed: ${error.message}`);
  }
}

// 导出清理函数
export function cleanupAllProcesses() {
  persistentServiceManager.shutdown();
}
