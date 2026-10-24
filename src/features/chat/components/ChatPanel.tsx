'use client';
import { useEffect, useRef, useState } from 'react';
import { chatClient, reportChatMessage } from '@/features/chat/services';
import type { ChatMessage, ChatRoom } from '@/features/chat/types';
export function ChatPanel() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]),
    [room, setRoom] = useState(''),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [online, setOnline] = useState(0),
    [text, setText] = useState(''),
    [notice, setNotice] = useState(''),
    end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatClient.getRooms().then((items) => { setRooms(items); setRoom((current) => current || items[0]?.id || ''); }).catch((error) => setNotice(error.message));
  }, []);
  useEffect(() => {
    if (!room) return;
    setMessages([]);
    chatClient.loadOlder(room, '', 40).then(setMessages).catch((error) => setNotice(error.message));
    const unsub = chatClient.subscribe(room, (m) =>
      setMessages((current) => current.some((item) => item.id === m.id) ? current : [...current, m]),
    );
    const presence = chatClient.onPresence(room, setOnline);
    return () => {
      unsub();
      presence();
    };
  }, [room]);
  useEffect(
    () => end.current?.scrollIntoView({ behavior: 'smooth' }),
    [messages],
  );
  async function send() {
    if (!text.trim()) return;
    const value = text;
    setNotice('');
    const r = await chatClient.send(room, value);
    if (r.ok) { setText(''); setMessages((current) => [...current, r.message]); }
    else setNotice(r.message || 'Chưa gửi được tin nhắn. Vui lòng đăng nhập và thử lại.');
  }
  async function report(id: string) {
    const reason = window.prompt('Lý do báo cáo tin nhắn (ít nhất 5 ký tự):');
    if (!reason) return;
    try { await reportChatMessage(id, reason); setNotice('Đã gửi báo cáo tới quản trị viên.'); }
    catch (error) { setNotice((error as Error).message); }
  }
  return (
    <div className="card grid min-h-[70vh] overflow-hidden md:grid-cols-[220px_1fr]">
      <aside className="border-b border-border bg-surface-2 p-3 md:border-b-0 md:border-r">
        <p className="mb-3 text-sm font-semibold">{online} người đang online</p>
        {rooms.map((r) => (
          <button
            key={r.id}
            className={
              room === r.id ? 'btn btn-primary mb-2 w-full' : 'btn mb-2 w-full'
            }
            onClick={() => setRoom(r.id)}
          >
            {r.name}
          </button>
        ))}
      </aside>
      <section className="flex min-h-0 flex-col">
        <div className="border-b border-border p-4">
          <strong>{rooms.find((r) => r.id === room)?.name}</strong>
          <p className="muted text-xs">
            Hãy trò chuyện văn minh và không tiết lộ nội dung truyện.
          </p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <article
              key={m.id}
              className="rounded-[var(--radius-md)] bg-surface-2 p-3"
            >
              <div className="flex gap-2 text-sm">
                <strong>{m.user.name}</strong>
                {m.user.role !== 'member' && (
                  <span className="chip">{m.user.role}</span>
                )}
                <time className="muted ml-auto">
                  {new Date(m.createdAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{m.content}</p>
              {m.status === 'visible' && <button className="btn mt-2 py-1 text-xs" onClick={() => void report(m.id)}>Báo cáo</button>}
            </article>
          ))}
          <div ref={end} />
        </div>
        <div className="border-t border-border p-3">
          {notice && <p className="muted mb-2 text-sm" role="status">{notice}</p>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 300))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Nhập tin nhắn…"
            className="min-h-20 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="muted text-xs">{text.length}/300</span>
            <button className="btn btn-primary" onClick={send}>
              Gửi
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
