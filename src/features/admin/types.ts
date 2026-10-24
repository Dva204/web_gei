import type { Story } from '@/features/catalog/types/story';
import type { Paginated } from '@/shared/types/pagination';
import type { ComicPage } from '@/features/catalog/types/chapter';

export type { Paginated };
export type Role = 'member' | 'admin' | 'mod' | 'editor' | 'author' | 'beta';
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  status: 'active' | 'suspended' | 'disabled';
  twoFactor: boolean;
  lastLoginAt?: string;
  createdAt: string;
};
export type ChapterStatus =
  | 'draft'
  | 'translating'
  | 'editing'
  | 'beta'
  | 'ready'
  | 'published'
  | 'scheduled';
export type RightsType =
  'own' | 'agreement' | 'public_domain' | 'open_license' | 'other';
export type StoryAdmin = Story & {
  authorId?: string;
  genreIds?: string[];
  coverStorageKey?: string;
  revision?: number;
  deletedAt?: string;
  visibility: 'draft' | 'public' | 'hidden';
  featured: boolean;
  assigneeIds: string[];
  rightsType?: RightsType;
  rightsNote?: string;
  rightsExpiresAt?: string;
  skipTranslate?: boolean;
  seoTitle?: string;
  seoDescription?: string;
};
export type ChapterAdmin = {
  id?: string;
  revision?: number;
  deletedAt?: string;
  hasPublication?: boolean;
  publicationRevision?: number;
  pageCount?: number;
  storyId: string;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  pages?: ComicPage[];
  status: ChapterStatus;
  assigneeId?: string;
  publishAt?: string;
  publishedAt?: string;
  updatedAt: string;
  updatedBy: string;
};
export type ChapterVersion = {
  revision?: number;
  pageCount?: number;
  id: string;
  storyId: string;
  number: number;
  content: string;
  savedAt: string;
  savedBy: string;
  note?: string;
};
export type ModerationComment = {
  id: string;
  storyId: string;
  chapterNumber?: number;
  user: { id: string; name: string; role: Role | 'member' };
  content: string;
  flags: ('new_account' | 'link' | 'keyword' | 'reported')[];
  reportCount: number;
  status: 'pending' | 'visible' | 'hidden';
  createdAt: string;
};
export type ChapterReport = {
  id: string;
  storyId: string;
  chapterNumber: number;
  type: 'missing' | 'typo' | 'display' | 'takedown';
  message: string;
  status: 'new' | 'in_progress' | 'fixed' | 'ignored';
  assigneeId?: string;
  resolutionNote?: string;
  createdAt: string;
};
export type TakedownRequest = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  organization?: string;
  targetUrls: string[];
  description: string;
  evidence?: string;
  status:
    | 'new'
    | 'content_hidden'
    | 'investigating'
    | 'resolved_removed'
    | 'resolved_rejected';
  dueAt: string;
  log: { at: string; by: string; action: string }[];
  createdAt: string;
};
export type ChatReport = {
  id: string;
  messageId: string;
  roomId: string;
  reason: string;
  reportedBy: string;
  message: { user: string; content: string; createdAt: string };
  status: 'open' | 'resolved';
};
export type AdSlotConfig = {
  placement: string;
  enabled: boolean;
  width: number;
  height: number;
  code?: string;
};
export type AdCampaign = {
  id: string;
  advertiser: string;
  creativeUrl?: string;
  targetUrl: string;
  placement: string;
  startAt: string;
  endAt: string;
  status: 'draft' | 'scheduled' | 'running' | 'ended' | 'paused';
  price?: number;
  note?: string;
};
export type AffiliateLink = {
  id: string;
  slug: string;
  name: string;
  program: string;
  targetUrl: string;
  active: boolean;
  note?: string;
  clicks30d: number;
};
export type ManualRevenue = {
  id: string;
  date: string;
  source: string;
  amount: number;
  note?: string;
};
export type AuditLog = {
  id: string;
  at: string;
  userId: string;
  action: string;
  objectType: string;
  objectId: string;
  summary: string;
};
export type SiteSettings = {
  siteName: string;
  defaultTheme: string;
  chatEnabled: boolean;
  commentsEnabled: boolean;
  commentPremoderation: boolean;
  adsEnabled: boolean;
  contactEmail: string;
  backupReminderDays: number;
  revision?: number;
};
export type StatsBundle = {
  views: number;
  readers: number;
  avgReadMinutes: number;
  previousDelta: number;
  series: { label: string; value: number }[];
  topStories: { name: string; views: number }[];
  dropOff: { story: string; chapter: number; rate: number }[];
};
export type DashboardOverview = {
  stats: StatsBundle;
  queues: { comments: number; takedowns: number };
  stories: { total: number; public: number; editing: number; missingRights: number };
  expiringRights: { id: string; title: string; rightsExpiresAt: string }[];
};
export type ImportPreview = {
  id: string;
  chapters: {
    number: number;
    title: string;
    content: string;
    wordCount: number;
    selected: boolean;
    warnings: string[];
  }[];
};
