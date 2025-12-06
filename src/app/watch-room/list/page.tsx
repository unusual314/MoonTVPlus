// 房间列表页面
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Lock, RefreshCw } from 'lucide-react';
import { useWatchRoomContext } from '@/components/WatchRoomProvider';
import JoinRoomModal from '@/components/watch-room/JoinRoomModal';
import type { Room } from '@/types/watch-room';

export default function RoomListPage() {
  const router = useRouter();
  const { getRoomList, isConnected } = useWatchRoomContext();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const loadRooms = async () => {
    if (!isConnected) return;

    setLoading(true);
    try {
      const roomList = await getRoomList();
      setRooms(roomList);
    } catch (error) {
      console.error('[WatchRoom] Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    // 每5秒刷新一次房间列表
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleJoinRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowJoinModal(true);
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* 顶部栏 */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
            返回
          </button>

          <button
            onClick={loadRooms}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* 标题 */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">公开房间列表</h1>
          <p className="text-gray-400">
            找到{rooms.length}个公开的观影室
          </p>
        </div>

        {/* 加载中 */}
        {loading && rooms.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-gray-400" />
              <p className="text-gray-400">加载中...</p>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!loading && rooms.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Users className="mx-auto mb-4 h-16 w-16 text-gray-600" />
              <p className="mb-2 text-xl text-gray-400">暂无公开房间</p>
              <p className="text-sm text-gray-500">创建一个新房间或通过房间号加入私密房间</p>
            </div>
          </div>
        )}

        {/* 房间列表 */}
        {rooms.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="group rounded-xl bg-gray-800/50 p-6 backdrop-blur-sm transition-all hover:bg-gray-800/70 hover:shadow-xl"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-bold text-white">{room.name}</h3>
                    {room.description && (
                      <p className="mb-2 text-sm text-gray-400 line-clamp-2">{room.description}</p>
                    )}
                  </div>
                  {room.password && (
                    <Lock className="h-5 w-5 flex-shrink-0 text-yellow-400" title="需要密码" />
                  )}
                </div>

                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-gray-500">房间号:</span>
                    <span className="font-mono text-lg font-bold text-white">{room.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>{room.memberCount} 人在线</span>
                  </div>
                  <div className="text-gray-400">
                    <span className="text-gray-500">房主:</span> {room.ownerName}
                  </div>
                  <div className="text-gray-400">
                    <span className="text-gray-500">创建时间:</span> {formatTime(room.createdAt)}
                  </div>
                  {room.currentState && (
                    <div className="mt-2 rounded-lg bg-blue-500/20 px-3 py-2">
                      <p className="text-xs text-blue-300">
                        {room.currentState.type === 'play'
                          ? `正在播放: ${room.currentState.videoName}`
                          : `正在观看: ${room.currentState.channelName}`}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleJoinRoom(room.id)}
                  className="w-full rounded-lg bg-purple-500 py-3 font-medium text-white transition-colors hover:bg-purple-600"
                >
                  加入房间
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 加入房间弹窗 */}
      {showJoinModal && selectedRoomId && (
        <JoinRoomModal
          roomId={selectedRoomId}
          onClose={() => {
            setShowJoinModal(false);
            setSelectedRoomId(null);
          }}
        />
      )}
    </div>
  );
}
