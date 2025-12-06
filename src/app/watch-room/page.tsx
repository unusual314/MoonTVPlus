// 观影室首页
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, List } from 'lucide-react';
import CreateRoomModal from '@/components/watch-room/CreateRoomModal';
import JoinRoomModal from '@/components/watch-room/JoinRoomModal';

export default function WatchRoomPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const buttons = [
    {
      icon: Users,
      label: '创建房间',
      description: '创建一个新的观影室',
      onClick: () => setShowCreateModal(true),
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      icon: UserPlus,
      label: '加入房间',
      description: '通过房间号加入观影室',
      onClick: () => setShowJoinModal(true),
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      icon: List,
      label: '房间列表',
      description: '查看所有公开的观影室',
      onClick: () => router.push('/watch-room/list'),
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* 标题 */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">观影室</h1>
          <p className="text-lg text-gray-400">与好友一起看视频，实时同步播放</p>
        </div>

        {/* 按钮网格 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {buttons.map((button, index) => {
            const Icon = button.icon;
            return (
              <button
                key={index}
                onClick={button.onClick}
                className={`group flex flex-col items-center justify-center gap-4 rounded-2xl p-8 transition-all duration-300 ${button.color} transform hover:scale-105 hover:shadow-2xl`}
              >
                <div className="rounded-full bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/20">
                  <Icon className="h-12 w-12 text-white md:h-16 md:w-16" />
                </div>
                <div className="text-center">
                  <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">{button.label}</h2>
                  <p className="text-sm text-white/80 md:text-base">{button.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 使用说明 */}
        <div className="mt-16 rounded-2xl bg-gray-800/50 p-6 backdrop-blur-sm md:p-8">
          <h3 className="mb-4 text-xl font-bold text-white">使用说明</h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-blue-400">•</span>
              <span>
                <strong className="text-white">创建房间：</strong>作为房主创建观影室，可以设置房间名称、密码和公开状态
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400">•</span>
              <span>
                <strong className="text-white">加入房间：</strong>通过房间号加入别人创建的观影室
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400">•</span>
              <span>
                <strong className="text-white">房间列表：</strong>浏览所有公开的观影室，点击即可加入
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400">•</span>
              <span>
                <strong className="text-white">实时同步：</strong>
                房主的播放操作会实时同步给所有成员，包括播放、暂停、进度、换集等
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-pink-400">•</span>
              <span>
                <strong className="text-white">语音聊天：</strong>在观影过程中可以使用文字和语音与房间成员交流
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* 弹窗 */}
      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} />}
      {showJoinModal && <JoinRoomModal onClose={() => setShowJoinModal(false)} />}
    </div>
  );
}
