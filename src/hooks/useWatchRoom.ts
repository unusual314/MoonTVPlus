// React Hook for Watch Room
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { watchRoomSocketManager, type WatchRoomSocket } from '@/lib/watch-room-socket';
import type {
  Room,
  Member,
  PlayState,
  LiveState,
  ChatMessage,
  WatchRoomConfig,
  StoredRoomInfo,
} from '@/types/watch-room';

const STORAGE_KEY = 'watch_room_info';

export function useWatchRoom() {
  const [socket, setSocket] = useState<WatchRoomSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 连接到服务器
  const connect = useCallback(async (config: WatchRoomConfig) => {
    try {
      const sock = await watchRoomSocketManager.connect(config);
      setSocket(sock);
      setIsConnected(true);

      // 尝试自动重连房间
      const storedInfo = getStoredRoomInfo();
      if (storedInfo) {
        console.log('[WatchRoom] Attempting to reconnect to room:', storedInfo.roomId);
        reconnectTimeoutRef.current = setTimeout(() => {
          rejoinRoom(storedInfo);
        }, 1000);
      }
    } catch (error) {
      console.error('[WatchRoom] Failed to connect:', error);
      setIsConnected(false);
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    watchRoomSocketManager.disconnect();
    setSocket(null);
    setIsConnected(false);
    setCurrentRoom(null);
    setMembers([]);
    setChatMessages([]);
  }, []);

  // 创建房间
  const createRoom = useCallback(
    async (data: { name: string; description: string; password?: string; isPublic: boolean; userName: string }) => {
      const sock = watchRoomSocketManager.getSocket();
      if (!sock || !watchRoomSocketManager.isConnected()) {
        throw new Error('Not connected');
      }

      return new Promise<Room>((resolve, reject) => {
        sock.emit('room:create', data, (response) => {
          if (response.success && response.room) {
            setCurrentRoom(response.room);
            setIsOwner(true);
            storeRoomInfo({
              roomId: response.room.id,
              roomName: response.room.name,
              isOwner: true,
              userName: data.userName,
              password: data.password,
              timestamp: Date.now(),
            });
            resolve(response.room);
          } else {
            reject(new Error(response.error || '创建房间失败'));
          }
        });
      });
    },
    []
  );

  // 加入房间
  const joinRoom = useCallback(
    async (data: { roomId: string; password?: string; userName: string }) => {
      const sock = watchRoomSocketManager.getSocket();
      if (!sock || !watchRoomSocketManager.isConnected()) {
        throw new Error('Not connected');
      }

      return new Promise<{ room: Room; members: Member[] }>((resolve, reject) => {
        sock.emit('room:join', data, (response) => {
          if (response.success && response.room && response.members) {
            setCurrentRoom(response.room);
            setMembers(response.members);
            setIsOwner(false);
            storeRoomInfo({
              roomId: response.room.id,
              roomName: response.room.name,
              isOwner: false,
              userName: data.userName,
              password: data.password,
              timestamp: Date.now(),
            });
            resolve({ room: response.room, members: response.members });
          } else {
            reject(new Error(response.error || '加入房间失败'));
          }
        });
      });
    },
    []
  );

  // 离开房间
  const leaveRoom = useCallback(() => {
    const sock = watchRoomSocketManager.getSocket();
    if (!sock) return;

    sock.emit('room:leave');
    setCurrentRoom(null);
    setMembers([]);
    setChatMessages([]);
    setIsOwner(false);
    clearStoredRoomInfo();
  }, []);

  // 获取房间列表
  const getRoomList = useCallback(async (): Promise<Room[]> => {
    const sock = watchRoomSocketManager.getSocket();
    if (!sock || !watchRoomSocketManager.isConnected()) {
      throw new Error('Not connected');
    }

    return new Promise((resolve) => {
      sock.emit('room:list', (rooms) => {
        resolve(rooms);
      });
    });
  }, []);

  // 发送聊天消息
  const sendChatMessage = useCallback(
    (content: string, type: 'text' | 'emoji' = 'text') => {
      const sock = watchRoomSocketManager.getSocket();
      if (!sock || !currentRoom) return;

      sock.emit('chat:message', { content, type });
    },
    [currentRoom]
  );

  // 更新播放状态
  const updatePlayState = useCallback(
    (state: PlayState) => {
      const sock = watchRoomSocketManager.getSocket();
      if (!sock || !isOwner) return;

      sock.emit('play:update', state);
    },
    [isOwner]
  );

  // 跳转播放进度
  const seekPlayback = useCallback(
    (currentTime: number) => {
      const sock = watchRoomSocketManager.getSocket();
      if (!sock) return;

      sock.emit('play:seek', currentTime);
    },
    []
  );

  // 播放
  const play = useCallback(() => {
    const sock = watchRoomSocketManager.getSocket();
    if (!sock) return;

    sock.emit('play:play');
  }, []);

  // 暂停
  const pause = useCallback(() => {
    const sock = watchRoomSocketManager.getSocket();
    if (!sock) return;

    sock.emit('play:pause');
  }, []);

  // 切换视频
  const changeVideo = useCallback(
    (state: PlayState) => {
      const sock = watchRoomSocketManager.getSocket();
      if (!sock || !isOwner) return;

      sock.emit('play:change', state);
    },
    [isOwner]
  );

  // 切换直播频道
  const changeLiveChannel = useCallback(
    (state: LiveState) => {
      const sock = watchRoomSocketManager.getSocket();
      if (!sock || !isOwner) return;

      sock.emit('live:change', state);
    },
    [isOwner]
  );

  // 设置事件监听
  useEffect(() => {
    if (!socket) return;

    // 房间事件
    socket.on('room:joined', (data) => {
      setCurrentRoom(data.room);
      setMembers(data.members);
    });

    socket.on('room:member-joined', (member) => {
      setMembers((prev) => [...prev, member]);
    });

    socket.on('room:member-left', (userId) => {
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    });

    socket.on('room:deleted', () => {
      setCurrentRoom(null);
      setMembers([]);
      setChatMessages([]);
      clearStoredRoomInfo();
    });

    // 播放事件
    socket.on('play:update', (state) => {
      if (currentRoom) {
        setCurrentRoom((prev) => (prev ? { ...prev, currentState: state } : null));
      }
    });

    // 聊天事件
    socket.on('chat:message', (message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // 连接状态
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:member-joined');
      socket.off('room:member-left');
      socket.off('room:deleted');
      socket.off('play:update');
      socket.off('chat:message');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket, currentRoom]);

  // 清理
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    currentRoom,
    members,
    chatMessages,
    isOwner,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomList,
    sendChatMessage,
    updatePlayState,
    seekPlayback,
    play,
    pause,
    changeVideo,
    changeLiveChannel,
  };
}

// 重新加入房间（自动重连）
function rejoinRoom(info: StoredRoomInfo) {
  // 这个函数会在组件中被调用
  console.log('[WatchRoom] Auto-rejoin:', info);
}

// 存储房间信息到 localStorage
function storeRoomInfo(info: StoredRoomInfo) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

// 获取存储的房间信息
function getStoredRoomInfo(): StoredRoomInfo | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const info: StoredRoomInfo = JSON.parse(stored);
    // 检查是否过期（24小时）
    if (Date.now() - info.timestamp > 24 * 60 * 60 * 1000) {
      clearStoredRoomInfo();
      return null;
    }
    return info;
  } catch {
    return null;
  }
}

// 清除存储的房间信息
function clearStoredRoomInfo() {
  localStorage.removeItem(STORAGE_KEY);
}
