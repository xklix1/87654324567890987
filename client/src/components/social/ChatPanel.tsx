import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ChatMessageRecord, ChatChannel } from '../../types/social';
import { ComponentState } from '../../types/common';
import { SocialService } from '../../services/social.service';
import { SocketService } from '../../services/socket.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { Send, Globe, Lock } from 'lucide-react';

interface ChatPanelProps {
  forcedState?: ComponentState;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ forcedState }) => {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [channel, setChannel] = useState<ChatChannel>('GLOBAL');
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchHistory = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (channel === 'GLOBAL') {
        const history = await SocialService.getGlobalChat(token, 50);
        setMessages(history);
      } else {
        // Direct messages will populate dynamically on interaction or user selection
        setMessages([]);
      }
    } catch (err: unknown) {
      setError('Failed to fetch chat history.');
    } finally {
      setLoading(false);
    }
  }, [token, channel]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Subscribe to real-time incoming socket messages
  useEffect(() => {
    const unsubMessage = SocketService.onMessage((newMsg: ChatMessageRecord) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    const unsubNotification = SocketService.onNotification((notif) => {
      showToast('info', `رسالة جديدة من ${notif.sender_username}`, notif.message);
    });

    return () => {
      unsubMessage();
      unsubNotification();
    };
  }, [showToast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!token || !inputText.trim()) return;

    const trimmed = inputText.trim();
    if (trimmed.length > 500) {
      showToast('error', 'الرسالة طويلة جداً', 'الحد الأقصى المسموح به 500 حرف.');
      return;
    }

    SocketService.sendChatMessage(channel, trimmed);
    setInputText('');
  };

  let activeState: ComponentState = 'success';
  if (forcedState) {
    activeState = forcedState;
  } else if (loading) {
    activeState = 'loading';
  } else if (error) {
    activeState = 'error';
  } else if (messages.length === 0) {
    activeState = 'empty';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-100 font-cairo">
            {t('nav_chat')}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            محادثات فورية مشفرة بين المستثمرين مع حماية أمنية متقدمة.
          </p>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center gap-2 bg-dark-900 border border-dark-800 p-1 rounded-xl">
          <button
            onClick={() => setChannel('GLOBAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-cairo font-bold transition-all ${
              channel === 'GLOBAL'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>الغرفة العامة</span>
          </button>
          <button
            onClick={() => setChannel('DIRECT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-cairo font-bold transition-all ${
              channel === 'DIRECT'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>المحادثات المباشرة</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="glass-panel rounded-2xl border border-dark-800 flex flex-col h-[480px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <ComponentStateWrapper
            state={activeState}
            errorMessage={error ?? undefined}
            emptyMessage="لا توجد رسائل حتى الآن. كن أول من يبدأ المحادثة."
            onRetry={fetchHistory}
          >
            {messages.map((msg) => {
              const isSelf = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-bold font-mono text-slate-400">
                      {isSelf ? 'أنت' : msg.sender_username}
                    </span>
                    <span className="text-[9px] font-mono text-slate-600">
                      {new Date(msg.created_at).toLocaleTimeString('ar-EG')}
                    </span>
                  </div>

                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs font-cairo leading-relaxed break-words ${
                      isSelf
                        ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-br-none'
                        : 'bg-dark-900 text-slate-200 border border-dark-700 rounded-bl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </ComponentStateWrapper>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-800 bg-dark-950/60 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="اكتب رسالتك للمستثمرين..."
            maxLength={500}
            className="flex-1 bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-xs font-cairo text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-xs font-cairo shadow-emerald-glow transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{t('action_send_msg')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
