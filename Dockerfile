# Dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装curl工具（用于健康检查）
RUN apk add --no-cache curl

# 安装生产依赖
RUN npm ci --only=production

# 复制源码
COPY . .

# 构建 TypeScript 代码
RUN npm run build

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/metrics || exit 1

# 启动命令
CMD ["npm", "start"]
