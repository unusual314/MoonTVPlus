// 加入房间弹窗
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock } from 'lucide-react';
import { useWatchRoomContext } from '@/components/WatchRoomProvider';

interface JoinRoomModalProps {
  onClose: () => void;
  roomId?: string; // 可选的预填房间号
}

export default function JoinRoomModal({ onClose, roomId: initialRoomId }: JoinRoomModalProps) {
  const router = useRouter();
  const { joinRoom } = useWatchRoomContext();

  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomId.trim()) {
      setError('请输入房间号');
      return;
    }

    if (!userName.trim()) {
      setError('请输入您的昵称');
      return;
    }

    setLoading(true);

    try {
      const { room, members } = await joinRoom({
        roomId: roomId.trim().toUpperCase(),
        password: password.trim() || undefined,
        userName: userName.trim(),
      });

      console.log('[WatchRoom] Joined room:', room, 'Members:', members);
      onClose();

      // 加入成功后跳转到对应页面
      // 如果房主已经在播放，跳转到播放页面
      // 否则等待房主开始播放
    } catch (err: any) {
      setError(err.message || '加入房间失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-gray-800 p-6 shadow-2xl">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 标题 */}
        <h2 className="mb-6 text-2xl font-bold text-white">加入观影室</h2>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 昵称 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">您的昵称</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="输入您的昵称"
              className="w-full rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={20}
            />
          </div>

          {/* 房间号 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">房间号</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="输入6位房间号"
              className="w-full rounded-lg bg-gray-700 px-4 py-3 font-mono text-lg tracking-wider text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={6}
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <Lock className="h-4 w-4" />
              密码（如有）
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="如果房间有密码请输入"
              className="w-full rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={20}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-gray-700 py-3 font-medium text-white transition-colors hover:bg-gray-600"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-green-500 py-3 font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? '加入中...' : '加入房间'}
            </button>
          </div>
        </form>

        {/* 提示 */}
        <p className="mt-4 text-center text-xs text-gray-400">
          加入后将跟随房主的播放内容
        </p>
      </div>
    </div>
  );
}
