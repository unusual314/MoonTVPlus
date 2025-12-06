// 全局聊天悬浮窗
'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Smile, Minimize2, Maximize2 } from 'lucide-react';
import { useWatchRoomContextSafe } from '@/components/WatchRoomProvider';

const EMOJI_LIST = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👏', '🎉', '❤️', '🔥', '⭐'];

export default function ChatFloatingWindow() {
  const watchRoom = useWatchRoomContextSafe();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current && watchRoom?.currentRoom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [watchRoom?.chatMessages, watchRoom?.currentRoom]);

  // 如果没有加入房间，不显示聊天按钮
  if (!watchRoom?.currentRoom) {
    return null;
  }

  const { chatMessages, sendChatMessage, members, isOwner } = watchRoom;

  const handleSendMessage = () => {
    if (!message.trim()) return;

    sendChatMessage(message.trim(), 'text');
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleSendEmoji = (emoji: string) => {
    sendChatMessage(emoji, 'emoji');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 悬浮按钮
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[700] flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl transition-all hover:scale-110 hover:bg-green-600 md:bottom-4"
        aria-label="打开聊天"
      >
        <MessageCircle className="h-6 w-6" />
        {chatMessages.length > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {chatMessages.length > 99 ? '99+' : chatMessages.length}
          </span>
        )}
      </button>
    );
  }

  // 最小化状态
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 z-[700] flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 shadow-2xl md:bottom-4">
        <MessageCircle className="h-5 w-5 text-white" />
        <span className="text-sm text-white">聊天室</span>
        <button
          onClick={() => setIsMinimized(false)}
          className="ml-2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          aria-label="展开"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // 完整聊天窗口
  return (
    <div className="fixed bottom-20 right-4 z-[700] flex w-80 flex-col rounded-2xl bg-gray-800 shadow-2xl md:bottom-4 md:w-96">
      {/* 头部 */}
      <div className="flex items-center justify-between rounded-t-2xl bg-green-500 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-white" />
          <div>
            <h3 className="text-sm font-bold text-white">聊天室</h3>
            <p className="text-xs text-white/80">{members.length} 人在线</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="最小化"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '400px' }}>
        {chatMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <MessageCircle className="mx-auto mb-2 h-12 w-12 text-gray-600" />
              <p className="text-sm text-gray-400">还没有消息</p>
              <p className="text-xs text-gray-500">发送第一条消息吧</p>
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-green-400">{msg.userName}</span>
                  <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.type === 'emoji'
                      ? 'text-3xl'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-700 p-3">
        {/* 表情选择器 */}
        {showEmojiPicker && (
          <div className="mb-2 grid grid-cols-6 gap-2 rounded-lg bg-gray-700 p-2">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendEmoji(emoji)}
                className="rounded p-1 text-2xl transition-colors hover:bg-gray-600"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="rounded-lg bg-gray-700 p-2 text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
            aria-label="表情"
          >
            <Smile className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            maxLength={200}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="rounded-lg bg-green-500 p-2 text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            aria-label="发送"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 房间信息提示 */}
      <div className="rounded-b-2xl bg-gray-900/50 px-4 py-2 text-center text-xs text-gray-400">
        {isOwner ? (
          <span className="text-yellow-400">👑 您是房主</span>
        ) : (
          <span>房间: {watchRoom.currentRoom.name}</span>
        )}
      </div>
    </div>
  );
}
