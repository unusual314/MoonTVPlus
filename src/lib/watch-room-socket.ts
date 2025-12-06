// Socket.IO 客户端管理
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  WatchRoomConfig,
} from '@/types/watch-room';

export type WatchRoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class WatchRoomSocketManager {
  private socket: WatchRoomSocket | null = null;
  private config: WatchRoomConfig | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async connect(config: WatchRoomConfig): Promise<WatchRoomSocket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.config = config;

    const socketOptions: any = {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    };

    if (config.serverType === 'internal') {
      // 内部服务器 - 连接到同一个域名的Socket.IO服务器
      this.socket = io({
        ...socketOptions,
        path: '/socket.io', // 使用服务器配置的path
      });
    } else {
      // 外部服务器
      if (!config.externalServerUrl) {
        throw new Error('External server URL is required');
      }

      this.socket = io(config.externalServerUrl, {
        ...socketOptions,
        auth: {
          token: config.externalServerAuth,
        },
        extraHeaders: config.externalServerAuth
          ? {
              Authorization: `Bearer ${config.externalServerAuth}`,
            }
          : undefined,
      });
    }

    // 设置事件监听
    this.setupEventListeners();

    // 开始心跳
    this.startHeartbeat();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.on('connect', () => {
        console.log('[WatchRoom] Connected to server');
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WatchRoom] Connection error:', error);
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): WatchRoomSocket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WatchRoom] Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WatchRoom] Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('[WatchRoom] Socket error:', error);
    });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 5000); // 每5秒发送一次心跳
  }
}

// 单例实例
export const watchRoomSocketManager = new WatchRoomSocketManager();
