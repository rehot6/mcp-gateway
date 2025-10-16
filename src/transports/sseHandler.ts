// src/transports/sseHandler.ts
import { EventEmitter } from 'events';
import { ServerResponse } from 'http';
// import { promisify } from 'util';
// import { setTimeout } from 'timers/promises';

// SSE 连接池
class SseConnectionPool extends EventEmitter {
  private connections: Map<string, ServerResponse> = new Map();
  private connectionCounter: number = 0;

  addConnection(id: string, res: ServerResponse) {
    // 设置超时和错误处理
    res.on('close', () => {
      this.removeConnection(id);
    });
    
    res.on('error', (err) => {
      console.error(`SSE connection error for ${id}:`, err);
      this.removeConnection(id);
    });
    
    this.connections.set(id, res);
    this.connectionCounter++;
    
    // 更新指标
    const metrics = (globalThis as any).metrics;
    if (metrics) {
      metrics.activeConnections.set(this.connectionCounter);
    }
    
    this.emit('connectionAdded', id);
  }

  removeConnection(id: string) {
    const connection = this.connections.get(id);
    if (connection) {
      connection.end();
      this.connections.delete(id);
      this.connectionCounter--;
      
      // 更新指标
      const metrics = (globalThis as any).metrics;
      if (metrics) {
        metrics.activeConnections.set(this.connectionCounter);
      }
      
      this.emit('connectionRemoved', id);
    }
  }

  broadcast(data: any) {
    const json = JSON.stringify(data);
    const message = `data: ${json}\n\n`;
    
    for (const [id, connection] of this.connections.entries()) {
      if (connection.writable) {
        connection.write(message);
      } else {
        this.removeConnection(id);
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

// 全局 SSE 连接池
export const ssePool = new SseConnectionPool();

// SSE 响应处理
export function setupSseResponse(res: ServerResponse, clientId: string) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // 发送初始连接确认
  res.write(`data: {"type":"connected","clientId":"${clientId}"}\n\n`);

  // 添加到连接池
  ssePool.addConnection(clientId, res);

  // 发送心跳包
  const heartbeatInterval = setInterval(() => {
    if (res.writable) {
      res.write('data: {"type":"heartbeat"}\n\n');
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // 清理资源
  res.on('close', () => {
    clearInterval(heartbeatInterval);
    ssePool.removeConnection(clientId);
  });
}
