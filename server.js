// Next.js 自定义服务器 + Socket.IO
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 观影室服务器类
class WatchRoomServer {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.members = new Map();
    this.socketToRoom = new Map();
    this.cleanupInterval = null;
    this.setupEventHandlers();
    this.startCleanupTimer();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[WatchRoom] Client connected: ${socket.id}`);

      // 创建房间
      socket.on('room:create', (data, callback) => {
        try {
          const roomId = this.generateRoomId();
          const userId = socket.id;

          const room = {
            id: roomId,
            name: data.name,
            description: data.description,
            password: data.password,
            isPublic: data.isPublic,
            ownerId: userId,
            ownerName: data.userName,
            memberCount: 1,
            currentState: null,
            createdAt: Date.now(),
            lastOwnerHeartbeat: Date.now(),
          };

          const member = {
            id: userId,
            name: data.userName,
            isOwner: true,
            lastHeartbeat: Date.now(),
          };

          this.rooms.set(roomId, room);
          this.members.set(roomId, new Map([[userId, member]]));
          this.socketToRoom.set(socket.id, {
            roomId,
            userId,
            userName: data.userName,
            isOwner: true,
          });

          socket.join(roomId);

          console.log(`[WatchRoom] Room created: ${roomId} by ${data.userName}`);
          callback({ success: true, room });
        } catch (error) {
          console.error('[WatchRoom] Error creating room:', error);
          callback({ success: false, error: '创建房间失败' });
        }
      });

      // 加入房间
      socket.on('room:join', (data, callback) => {
        try {
          const room = this.rooms.get(data.roomId);
          if (!room) {
            return callback({ success: false, error: '房间不存在' });
          }

          if (room.password && room.password !== data.password) {
            return callback({ success: false, error: '密码错误' });
          }

          const userId = socket.id;
          const member = {
            id: userId,
            name: data.userName,
            isOwner: false,
            lastHeartbeat: Date.now(),
          };

          const roomMembers = this.members.get(data.roomId);
          if (roomMembers) {
            roomMembers.set(userId, member);
            room.memberCount = roomMembers.size;
            this.rooms.set(data.roomId, room);
          }

          this.socketToRoom.set(socket.id, {
            roomId: data.roomId,
            userId,
            userName: data.userName,
            isOwner: false,
          });

          socket.join(data.roomId);
          socket.to(data.roomId).emit('room:member-joined', member);

          console.log(`[WatchRoom] User ${data.userName} joined room ${data.roomId}`);

          const members = Array.from(roomMembers?.values() || []);
          callback({ success: true, room, members });
        } catch (error) {
          console.error('[WatchRoom] Error joining room:', error);
          callback({ success: false, error: '加入房间失败' });
        }
      });

      // 离开房间
      socket.on('room:leave', () => {
        this.handleLeaveRoom(socket);
      });

      // 获取房间列表
      socket.on('room:list', (callback) => {
        const publicRooms = Array.from(this.rooms.values()).filter((room) => room.isPublic);
        callback(publicRooms);
      });

      // 播放状态更新
      socket.on('play:update', (state) => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo || !roomInfo.isOwner) return;

        const room = this.rooms.get(roomInfo.roomId);
        if (room) {
          room.currentState = state;
          this.rooms.set(roomInfo.roomId, room);
          socket.to(roomInfo.roomId).emit('play:update', state);
        }
      });

      // 播放进度跳转
      socket.on('play:seek', (currentTime) => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo) return;
        socket.to(roomInfo.roomId).emit('play:seek', currentTime);
      });

      // 播放
      socket.on('play:play', () => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo) return;
        socket.to(roomInfo.roomId).emit('play:play');
      });

      // 暂停
      socket.on('play:pause', () => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo) return;
        socket.to(roomInfo.roomId).emit('play:pause');
      });

      // 切换视频/集数
      socket.on('play:change', (state) => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo || !roomInfo.isOwner) return;

        const room = this.rooms.get(roomInfo.roomId);
        if (room) {
          room.currentState = state;
          this.rooms.set(roomInfo.roomId, room);
          socket.to(roomInfo.roomId).emit('play:change', state);
        }
      });

      // 切换直播频道
      socket.on('live:change', (state) => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo || !roomInfo.isOwner) return;

        const room = this.rooms.get(roomInfo.roomId);
        if (room) {
          room.currentState = state;
          this.rooms.set(roomInfo.roomId, room);
          socket.to(roomInfo.roomId).emit('live:change', state);
        }
      });

      // 聊天消息
      socket.on('chat:message', (data) => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo) return;

        const message = {
          id: this.generateMessageId(),
          userId: roomInfo.userId,
          userName: roomInfo.userName,
          content: data.content,
          type: data.type,
          timestamp: Date.now(),
        };

        this.io.to(roomInfo.roomId).emit('chat:message', message);
      });

      // WebRTC 信令
      socket.on('voice:offer', (data) => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo) return;
        this.io.to(data.targetUserId).emit('voice:offer', {
          userId: socket.id,
          offer: data.offer,
        });
      });

      socket.on('voice:answer', (data) => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo) return;
        this.io.to(data.targetUserId).emit('voice:answer', {
          userId: socket.id,
          answer: data.answer,
        });
      });

      socket.on('voice:ice', (data) => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo) return;
        this.io.to(data.targetUserId).emit('voice:ice', {
          userId: socket.id,
          candidate: data.candidate,
        });
      });

      // 心跳
      socket.on('heartbeat', () => {
        const roomInfo = this.socketToRoom.get(socket.id);
        if (!roomInfo) return;

        const roomMembers = this.members.get(roomInfo.roomId);
        const member = roomMembers?.get(roomInfo.userId);
        if (member) {
          member.lastHeartbeat = Date.now();
          roomMembers?.set(roomInfo.userId, member);
        }

        if (roomInfo.isOwner) {
          const room = this.rooms.get(roomInfo.roomId);
          if (room) {
            room.lastOwnerHeartbeat = Date.now();
            this.rooms.set(roomInfo.roomId, room);
          }
        }
      });

      // 断开连接
      socket.on('disconnect', () => {
        console.log(`[WatchRoom] Client disconnected: ${socket.id}`);
        this.handleLeaveRoom(socket);
      });
    });
  }

  handleLeaveRoom(socket) {
    const roomInfo = this.socketToRoom.get(socket.id);
    if (!roomInfo) return;

    const { roomId, userId, isOwner } = roomInfo;
    const roomMembers = this.members.get(roomId);

    if (roomMembers) {
      roomMembers.delete(userId);

      const room = this.rooms.get(roomId);
      if (room) {
        room.memberCount = roomMembers.size;
        this.rooms.set(roomId, room);
      }

      socket.to(roomId).emit('room:member-left', userId);

      if (isOwner) {
        console.log(`[WatchRoom] Owner left room ${roomId}, will auto-delete after 5 minutes`);
      }

      if (roomMembers.size === 0) {
        this.deleteRoom(roomId);
      }
    }

    socket.leave(roomId);
    this.socketToRoom.delete(socket.id);
  }

  deleteRoom(roomId) {
    console.log(`[WatchRoom] Deleting room ${roomId}`);
    this.io.to(roomId).emit('room:deleted');
    this.rooms.delete(roomId);
    this.members.delete(roomId);
  }

  startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5分钟

      for (const [roomId, room] of this.rooms.entries()) {
        if (now - room.lastOwnerHeartbeat > timeout) {
          console.log(`[WatchRoom] Room ${roomId} owner timeout, deleting...`);
          this.deleteRoom(roomId);
        }
      }
    }, 30000); // 每30秒检查一次
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // 初始化 Socket.IO
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // 初始化观影室服务器
  const watchRoomServer = new WatchRoomServer(io);
  console.log('[WatchRoom] Socket.IO server initialized');

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO ready on ws://${hostname}:${port}`);
    });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    watchRoomServer.destroy();
    httpServer.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n[Server] Shutting down...');
    watchRoomServer.destroy();
    httpServer.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });
});
