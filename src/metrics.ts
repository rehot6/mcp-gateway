// src/metrics.ts
import prometheus from 'prom-client';

// 创建指标
export const requestDuration = new prometheus.Histogram({
  name: 'mcp_gateway_request_duration_seconds',
  help: 'Duration of MCP requests in seconds',
  labelNames: ['service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

export const requestsTotal = new prometheus.Counter({
  name: 'mcp_gateway_requests_total',
  help: 'Total number of MCP requests',
  labelNames: ['service']
});

export const activeConnections = new prometheus.Gauge({
  name: 'mcp_gateway_active_connections',
  help: 'Number of active connections'
});

export const serviceCount = new prometheus.Gauge({
  name: 'mcp_gateway_services_count',
  help: 'Number of registered services'
});

// 初始化指标
export function setupMetrics() {
  // 注册指标到 Prometheus
  prometheus.register.registerMetric(requestDuration);
  prometheus.register.registerMetric(requestsTotal);
  prometheus.register.registerMetric(activeConnections);
  prometheus.register.registerMetric(serviceCount);
  
  // 全局变量用于访问指标
  (globalThis as any).metrics = {
    requestDuration,
    requestsTotal,
    activeConnections,
    serviceCount
  };
  
  console.log('Prometheus metrics initialized');
}

// 暴露指标端点
import express from 'express';

export function setupMetricsEndpoint(app: express.Application) {
  app.get('/metrics', async (_req, res) => {
    try {
      const metrics = await prometheus.register.metrics();
      res.set('Content-Type', prometheus.register.contentType);
      res.end(metrics);
    } catch (error) {
      console.error('Error serving metrics:', error);
      res.status(500).end('Error serving metrics');
    }
  });
}
