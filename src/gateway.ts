// src/gateway.ts (补充部分)
import express from 'express';
import dotenv from 'dotenv';
import { authMiddleware } from './auth.js';
import { registerService, getService, removeService } from './serviceManager.js';
import { setupMetrics, setupMetricsEndpoint } from './metrics.js';
import { startGatewayStdioServer } from './transports/stdioServer.js';
import { forwardToStdioService } from './transports/httpHandler.js';
import { setupSseResponse } from './transports/sseHandler.js';

dotenv.config();

// 初始化 Express 应用
const app = express();
app.use(express.json({ limit: '10mb' }));

// 设置 Prometheus 指标
setupMetrics();

// 设置指标端点
setupMetricsEndpoint(app);

// 注册服务 API
app.post('/services', authMiddleware, (req, res) => {
  try {
    const { id, command } = req.body;
    if (!id || !command) {
      res.status(400).json({ error: 'Missing service ID or command' });
      return;
    }
    
    registerService(id, command);
    
    // 更新服务计数指标
    const metrics = (globalThis as any).metrics;
    if (metrics) {
      metrics.serviceCount.set(Object.keys(getService()).length);
    }
    
    res.json({ message: `Service ${id} registered successfully` });
  } catch (error) {
    console.error('Service registration error:', error);
    res.status(500).json({ error: 'Failed to register service' });
  }
});

// 获取服务列表 API
app.get('/services', authMiddleware, (_req, res) => {
  try {
    const services = Object.keys(getService());
    res.json({ services });
  } catch (error) {
    console.error('Service listing error:', error);
    res.status(500).json({ error: 'Failed to list services' });
  }
});

// 删除服务 API
app.delete('/services/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const services = getService();
    if (id && services[id]) {
      removeService(id);
      
      // 更新服务计数指标
      const metrics = (globalThis as any).metrics;
      if (metrics) {
        metrics.serviceCount.set(Object.keys(getService()).length);
      }
      
      res.json({ message: `Service ${id} removed successfully` });
    } else {
      res.status(404).json({ error: 'Service not found' });
    }
  } catch (error) {
    console.error('Service removal error:', error);
    res.status(500).json({ error: 'Failed to remove service' });
  }
});

// SSE 连接端点
app.get('/sse/:clientId', authMiddleware, (req, res) => {
  const { clientId } = req.params;
  if (clientId) {
    setupSseResponse(res, clientId);
  } else {
    res.status(400).json({ error: 'Missing clientId' });
  }
});

// HTTP POST 端点：转发到指定服务
app.post('/mcp/:serviceId', authMiddleware, async (req, res) => {
  const { serviceId } = req.params;
  
  try {
    const services = getService();
    if (serviceId && services[serviceId]) {
      const service = services[serviceId];
      const startTime = Date.now();
      const response = await forwardToStdioService(service.command, req.body);
      const duration = Date.now() - startTime;
      
      // 记录 Prometheus 指标
      const metrics = (globalThis as any).metrics;
      if (metrics) {
        metrics.requestDuration.observe({ service: serviceId }, duration / 1000);
        metrics.requestsTotal.inc({ service: serviceId });
      }
      
      res.json(response);
    } else {
      res.status(404).json({ error: 'Service not found' });
    }
  } catch (error) {
    console.error('Service error:', error);
    res.status(500).json({ error: 'Service invocation failed' });
  }
});

// 启动 HTTP 服务
const PORT = process.env['PORT'] || 3000;
app.listen(PORT, async () => {
  console.log(`MCP Gateway HTTP running on http://localhost:${PORT}`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
  
  // 自动登录affine服务
  try {
    const { persistentServiceManager } = await import('./persistentServiceManager.js');
    await persistentServiceManager.autoLoginAffine();
  } catch (error) {
    console.error('Auto login initialization failed:', error);
  }
});

// 启动 STDIO 服务（用于被其他 MCP 客户端直接调用）
if (process.stdin.isTTY === false) {
  // 检测是否在 STDIO 模式（无 TTY 表示被父进程调用）
  startGatewayStdioServer().catch(console.error);
}

export { app };
