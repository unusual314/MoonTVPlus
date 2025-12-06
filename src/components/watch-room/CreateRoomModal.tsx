// 创建房间弹窗
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { useWatchRoomContext } from '@/components/WatchRoomProvider';

interface CreateRoomModalProps {
  onClose: () => void;
}

export default function CreateRoomModal({ onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const { createRoom } = useWatchRoomContext();

  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomName.trim()) {
      setError('请输入房间名称');
      return;
    }

    if (!userName.trim()) {
      setError('请输入您的昵称');
      return;
    }

    setLoading(true);

    try {
      const room = await createRoom({
        name: roomName.trim(),
        description: description.trim(),
        password: password.trim() || undefined,
        isPublic,
        userName: userName.trim(),
      });

      console.log('[WatchRoom] Room created:', room);
      onClose();

      // 创建成功后跳转到播放页面（等待播放）
      // router.push(`/play?roomId=${room.id}`);
    } catch (err: any) {
      setError(err.message || '创建房间失败');
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
        <h2 className="mb-6 text-2xl font-bold text-white">创建观影室</h2>

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
              className="w-full rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={20}
            />
          </div>

          {/* 房间名 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">房间名称</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="输入房间名称"
              className="w-full rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={30}
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">房间简介（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入房间简介"
              rows={3}
              className="w-full resize-none rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <Lock className="h-4 w-4" />
              密码（可选）
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="不设置则无需密码"
              className="w-full rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={20}
            />
          </div>

          {/* 公开/隐藏 */}
          <div className="flex items-center justify-between rounded-lg bg-gray-700 px-4 py-3">
            <div className="flex items-center gap-2">
              {isPublic ? <Eye className="h-5 w-5 text-green-400" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-300">
                {isPublic ? '公开房间' : '隐藏房间'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isPublic ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 transform rounded-full bg-white transition-transform ${
                  isPublic ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
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
              className="flex-1 rounded-lg bg-blue-500 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建房间'}
            </button>
          </div>
        </form>

        {/* 提示 */}
        <p className="mt-4 text-center text-xs text-gray-400">
          创建后您将成为房主，可以控制播放内容
        </p>
      </div>
    </div>
  );
}
