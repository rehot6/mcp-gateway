# MCP Gateway

[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个基于 TypeScript 的 Model Context Protocol (MCP) 网关，支持 HTTP、STDIO、SSE 传输方式，具备动态服务注册、认证和 Prometheus 监控功能。

## ✨ 特性

- 🔐 **HTTP API 认证** - 使用 Token 进行认证（支持 Bearer 前缀或直接 token）
- 🚀 **动态服务注册** - 通过 API 动态添加 npx 命令服务
- 📊 **Prometheus 监控** - 实时监控请求次数和延迟
- 🔄 **SSE 转发** - 支持服务器主动推送消息
- 🛡️ **安全机制** - 防止命令注入，进程管理
- 🐳 **Docker 部署** - 一键部署到容器环境

## 🚀 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/mcp-gateway.git
cd mcp-gateway

# 安装依赖
npm install
```

### 配置

创建 `.env` 文件：

```env
MCP_GATEWAY_TOKEN=your-secret-token
PORT=3001
```

### 运行

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 📚 API 文档

### 认证
所有 API 需要在请求头中包含认证信息，支持两种格式：

**格式1：直接token**
```
Authorization: your-secret-token
```

**格式2：Bearer token**
```
Authorization: Bearer your-secret-token
```

### 服务管理

#### 注册服务
```bash
POST /services
Content-Type: application/json
Authorization: your-secret-token

{
  "id": "service-id",
  "command": ["npx", "package-name"]
}
```

**示例：注册 affine 服务**
```bash
curl -X POST http://localhost:3001/services \
  -H "Authorization: your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"id":"affine","command":["npx","-y","-p","affine-mcp-server","affine-mcp"]}'
```

#### 获取服务列表
```bash
GET /services
Authorization: your-secret-token
```

**示例：获取所有服务**
```bash
curl -X GET http://localhost:3001/services \
  -H "Authorization: your-secret-token"
```

#### 删除服务
```bash
DELETE /services/{service-id}
Authorization: your-secret-token
```

**示例：删除 affine 服务**
```bash
curl -X DELETE http://localhost:3001/services/affine \
  -H "Authorization: your-secret-token"
```

### MCP 请求转发

#### 发送请求到指定服务
```bash
POST /mcp/{service-id}
Content-Type: application/json
Authorization: your-secret-token

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": {}
}
```

**示例：向 affine 服务发送请求**
```bash
curl -X POST http://localhost:3001/mcp/affine \
  -H "Authorization: your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"list_workspaces"}'
```

### SSE 连接

#### 建立 SSE 连接
```bash
GET /sse/{client-id}
Authorization: your-secret-token
```

**示例：建立 SSE 连接**
```bash
curl -X GET http://localhost:3001/sse/client123 \
  -H "Authorization: your-secret-token"
```

### 监控指标

#### 获取 Prometheus 指标
```bash
GET /metrics
```

**示例：获取监控指标**
```bash
curl -X GET http://localhost:3001/metrics
```

## 🛠️ 开发

### 项目结构

```
mcp-gateway/
├── src/
│   ├── gateway.ts          # 主入口文件
│   ├── auth.ts             # 认证模块
│   ├── metrics.ts          # 监控指标
│   ├── serviceManager.ts   # 服务管理
│   ├── persistentServiceManager.ts # 持久化服务管理
│   └── transports/         # 传输层
│       ├── httpHandler.ts  # HTTP 处理器
│       ├── sseHandler.ts   # SSE 处理器
│       └── stdioServer.ts  # STDIO 服务器
├── services/
│   └── services.json       # 服务配置文件
├── Dockerfile              # Docker 配置
├── package.json            # 项目配置
└── README.md              # 项目文档
```

### 构建

```bash
npm run build
```

## 🐳 Docker 部署

### 构建镜像
```bash
docker build -t mcp-gateway .
```

### 运行容器
```bash
docker run -p 3001:3001 \
  -e MCP_GATEWAY_TOKEN=your-secret-token \
  mcp-gateway
```

## 📊 监控指标

网关提供以下 Prometheus 指标：

- `mcp_gateway_request_duration_seconds` - 请求耗时直方图
- `mcp_gateway_requests_total` - 请求总数计数器
- `mcp_gateway_active_connections` - 活跃连接数
- `mcp_gateway_services_count` - 注册服务数量

## 🔧 故障排除

### 常见问题

1. **认证失败**
   - 检查 `.env` 文件中的 `MCP_GATEWAY_TOKEN` 设置
   - 确认请求头中的 Authorization 格式正确

2. **服务注册失败**
   - 确认 npx 包名正确
   - 检查网络连接

3. **端口占用**
   - 默认端口为 3001，可在 `.env` 文件中修改

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题，请通过以下方式联系：

- 创建 [Issue](https://github.com/your-username/mcp-gateway/issues)
- 发送邮件至：your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给它一个星标！
