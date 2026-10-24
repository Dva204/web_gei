export type Comment = {
  id: string;
  storyId: string;
  chapterNumber?: number;
  parentId?: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    role: 'member' | 'mod' | 'admin' | 'editor' | 'author' | 'beta';
  };
  content: string;
  isSpoiler: boolean;
  likes: number;
  likedByMe?: boolean;
  pinned?: boolean;
  status: 'visible' | 'pending' | 'hidden' | 'deleted';
  createdAt: string;
};
