export type Comment = {
  id: string;
  storyId: string;
  chapterNumber?: number;
  parentId?: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    role: 'member' | 'mod' | 'admin';
  };
  content: string;
  isSpoiler: boolean;
  likes: number;
  status: 'visible' | 'pending' | 'hidden';
  createdAt: string;
};
