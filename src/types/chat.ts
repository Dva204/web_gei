export type ChatMessage = {
  id: string;
  roomId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    role: 'member' | 'mod' | 'admin';
  };
  content: string;
  replyToId?: string;
  isPinned?: boolean;
  status: 'visible' | 'deleted';
  createdAt: string;
};
export type ChatRoom = {
  id: string;
  slug: string;
  name: string;
  adminOnly?: boolean;
  slowModeSec?: number;
};
export interface ChatClient {
  subscribe(roomId: string, onMessage: (m: ChatMessage) => void): () => void;
  send(
    roomId: string,
    content: string,
    replyToId?: string,
  ): Promise<
    | { ok: true }
    | {
        ok: false;
        reason: 'slow_mode' | 'muted' | 'banned' | 'too_long' | 'offline';
      }
  >;
  loadOlder(
    roomId: string,
    beforeId: string,
    limit: number,
  ): Promise<ChatMessage[]>;
  onPresence(roomId: string, cb: (count: number) => void): () => void;
  getRooms(): Promise<ChatRoom[]>;
  getPinned(roomId: string): Promise<ChatMessage | null>;
}
