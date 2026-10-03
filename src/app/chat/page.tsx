import type { Metadata } from 'next';
import { ChatPanel } from '@/components/chat/ChatPanel';
export const metadata: Metadata = {
  title: 'Phòng chat',
  robots: { index: false },
};
export default function Chat() {
  return (
    <div className="container section">
      <h1 className="section-title">Phòng trò chuyện</h1>
      <ChatPanel />
    </div>
  );
}
