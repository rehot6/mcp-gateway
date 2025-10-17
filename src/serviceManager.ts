// src/serviceManager.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

interface ServiceConfig {
  id: string;
  command: string[];
}

const SERVICES_FILE = join(process.cwd(), 'services', 'services.json');

// 确保services目录存在
function ensureServicesDir() {
  const servicesDir = join(process.cwd(), 'services');
  if (!existsSync(servicesDir)) {
    const fs = require('fs');
    fs.mkdirSync(servicesDir, { recursive: true });
  }
}

// 加载服务配置
function loadServices(): Record<string, ServiceConfig> {
  ensureServicesDir();
  
  if (!existsSync(SERVICES_FILE)) {
    return {};
  }
  
  try {
    const data = readFileSync(SERVICES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    logger.error('Failed to load services', { error: error.message });
    return {};
  }
}

// 保存服务配置
function saveServices(services: Record<string, ServiceConfig>): void {
  ensureServicesDir();
  
  try {
    writeFileSync(SERVICES_FILE, JSON.stringify(services, null, 2), 'utf8');
  } catch (error: any) {
    logger.error('Failed to save services', { error: error.message });
  }
}

let services: Record<string, ServiceConfig> = loadServices();

export function registerService(id: string, command: string[]): void {
  // 验证命令参数安全性
  if (!Array.isArray(command) || command.length === 0) {
    throw new Error('Invalid command format');
  }
  
  // 防止命令注入攻击
  for (const arg of command) {
    if (arg.includes(';') || arg.includes('&&') || arg.includes('||')) {
      throw new Error('Command contains potentially dangerous characters');
    }
  }
  
  services[id] = { id, command };
  saveServices(services);
}

export function getService(): Record<string, ServiceConfig> {
  return { ...services };
}

export function getAllServices(): ServiceConfig[] {
  return Object.values(services);
}

export function removeService(id: string | undefined): boolean {
  if (id && services[id]) {
    delete services[id];
    saveServices(services);
    return true;
  }
  return false;
}

// 导出持久化相关函数
export { SERVICES_FILE };
