import type { Metadata } from 'next';
import { ChatPanel } from '@/features/chat/components/ChatPanel';
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
