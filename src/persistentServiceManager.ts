// src/persistentServiceManager.ts
import { spawn } from 'child_process';

interface ServiceProcess {
  id: string;
  process: any; // 使用any避免复杂的类型问题
  command: string[];
  lastUsed: number;
}

class PersistentServiceManager {
  private processes: Map<string, ServiceProcess> = new Map();
  private readonly MAX_IDLE_TIME = 5 * 60 * 1000; // 5分钟空闲时间

  constructor() {
    // 定期清理空闲进程
    setInterval(() => this.cleanupIdleProcesses(), 60 * 1000);
  }

  async getProcess(serviceId: string, command: string[]): Promise<ServiceProcess> {
    let serviceProcess = this.processes.get(serviceId);
    
    // 如果进程不存在或已退出，创建新进程
    if (!serviceProcess || serviceProcess.process.killed) {
      serviceProcess = await this.createProcess(serviceId, command);
      this.processes.set(serviceId, serviceProcess);
    }
    
    serviceProcess.lastUsed = Date.now();
    return serviceProcess;
  }

  private async createProcess(serviceId: string, command: string[]): Promise<ServiceProcess> {
    return new Promise((resolve, reject) => {
      console.log(`Creating persistent process for service: ${serviceId}`);
      
      // 验证命令参数
      if (!command[0]) {
        reject(new Error('Invalid command: first argument is undefined'));
        return;
      }
      
      // 构建环境变量
      const env = { ...process.env };
      
      // 为affine服务传递特定的环境变量
      if (serviceId === 'affine') {
        const affineEnvVars = ['AFFINE_BASE_URL', 'AFFINE_EMAIL', 'AFFINE_PASSWORD', 'AFFINE_LOGIN_AT_START'];
        for (const envVar of affineEnvVars) {
          if (process.env[envVar]) {
            env[envVar] = process.env[envVar] as string;
          }
        }
      }
      
      try {
        const childProcess = spawn(command[0], command.slice(1), {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: env
        });

        const serviceProcess: ServiceProcess = {
          id: serviceId,
          process: childProcess,
          command,
          lastUsed: Date.now()
        };

        // 监听进程退出
        childProcess.on('exit', (code, signal) => {
          console.log(`Service process ${serviceId} exited with code ${code}, signal ${signal}`);
          this.processes.delete(serviceId);
        });

        // 监听错误
        childProcess.on('error', (error: Error) => {
          console.error(`Service process ${serviceId} error:`, error);
          this.processes.delete(serviceId);
          reject(error);
        });

        // 监听标准输出，确认进程正常启动
        let startupBuffer = '';
        const startupTimeout = setTimeout(() => {
          childProcess.stdout?.off('data', stdoutHandler);
          childProcess.stderr?.off('data', stderrHandler);
          // 对于affine服务，延长启动时间
          if (serviceId === 'affine') {
            console.log(`Service process ${serviceId} startup timeout, but continuing due to authentication process`);
            resolve(serviceProcess);
          } else {
            reject(new Error(`Service process ${serviceId} startup timeout`));
          }
        }, 10000); // 延长到10秒

        const stdoutHandler = (data: Buffer) => {
          startupBuffer += data.toString();
          // 如果进程输出了任何内容，认为启动成功
          if (startupBuffer.length > 0) {
            clearTimeout(startupTimeout);
            childProcess.stdout?.off('data', stdoutHandler);
            childProcess.stderr?.off('data', stderrHandler);
            console.log(`Service process ${serviceId} started successfully`);
            resolve(serviceProcess);
          }
        };

        const stderrHandler = (data: Buffer) => {
          console.error(`Service process ${serviceId} stderr:`, data.toString());
        };

        childProcess.stdout?.on('data', stdoutHandler);
        childProcess.stderr?.on('data', stderrHandler);

        // 如果进程立即退出，捕获错误
        childProcess.on('exit', (code, signal) => {
          if (code !== 0) {
            clearTimeout(startupTimeout);
            reject(new Error(`Service process ${serviceId} exited immediately with code ${code}`));
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async sendRequest(serviceId: string, command: string[], requestBody: any): Promise<any> {
    const serviceProcess = await this.getProcess(serviceId, command);
    
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const stdoutHandler = (data: Buffer) => {
        stdout += data.toString();
      };

      const stderrHandler = (data: Buffer) => {
        stderr += data.toString();
      };

      serviceProcess.process.stdout?.on('data', stdoutHandler);
      serviceProcess.process.stderr?.on('data', stderrHandler);

      // 设置超时
      const timeout = setTimeout(() => {
        serviceProcess.process.stdout?.off('data', stdoutHandler);
        serviceProcess.process.stderr?.off('data', stderrHandler);
        reject(new Error('Request timeout'));
      }, 30000);

      // 发送请求
      const requestJson = JSON.stringify(requestBody) + '\n';
      serviceProcess.process.stdin?.write(requestJson);

      // 等待响应
      const checkResponse = () => {
        try {
          if (stdout.trim()) {
            const response = JSON.parse(stdout.trim());
            clearTimeout(timeout);
            serviceProcess.process.stdout?.off('data', stdoutHandler);
            serviceProcess.process.stderr?.off('data', stderrHandler);
            resolve(response);
          } else {
            setTimeout(checkResponse, 100);
          }
        } catch (error) {
          // 继续等待完整响应
          setTimeout(checkResponse, 100);
        }
      };

      checkResponse();
    });
  }

  // 自动登录affine服务
  async autoLoginAffine(): Promise<void> {
    if (!process.env['AFFINE_EMAIL'] || !process.env['AFFINE_PASSWORD']) {
      console.log('Auto login skipped: AFFINE_EMAIL or AFFINE_PASSWORD not set');
      return;
    }

    try {
      console.log('Attempting auto login for affine service...');
      
      const loginRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'sign_in',
          arguments: {
            email: process.env['AFFINE_EMAIL'],
            password: process.env['AFFINE_PASSWORD']
          }
        }
      };

      // 获取affine服务命令 - 使用ES模块导入
      const serviceConfig = await import('../services/services.json', { with: { type: 'json' } });
      const affineCommand = serviceConfig.default.affine?.command;
      
      if (!affineCommand) {
        console.log('Auto login skipped: affine service not configured');
        return;
      }

      // 预创建affine进程，确保后续请求使用同一个进程
      await this.getProcess('affine', affineCommand);
      console.log('Affine service process pre-created for auto login');
      
      const response = await this.sendRequest('affine', affineCommand, loginRequest);
      console.log('Auto login response:', response);
      
      if (response.result?.content?.[0]?.text?.includes('"signedIn":true')) {
        console.log('Auto login successful!');
        // 等待一段时间确保认证状态完全建立
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('Auto login may have failed:', response);
      }
    } catch (error) {
      console.error('Auto login failed:', error);
    }
  }

  private cleanupIdleProcesses(): void {
    const now = Date.now();
    for (const [serviceId, serviceProcess] of this.processes.entries()) {
      if (now - serviceProcess.lastUsed > this.MAX_IDLE_TIME) {
        console.log(`Cleaning up idle service process: ${serviceId}`);
        serviceProcess.process.kill();
        this.processes.delete(serviceId);
      }
    }
  }

  shutdown(): void {
    for (const [serviceId, serviceProcess] of this.processes.entries()) {
      console.log(`Shutting down service process: ${serviceId}`);
      serviceProcess.process.kill();
    }
    this.processes.clear();
  }
}

// 创建全局实例
export const persistentServiceManager = new PersistentServiceManager();
