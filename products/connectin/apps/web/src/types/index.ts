/**
 * Shared types for ConnectIn frontend.
 * Aligned with backend data model from PRD section 11.
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "recruiter" | "admin";
  emailVerified: boolean;
  languagePreference: "ar" | "en";
  status: "active" | "suspended" | "deleted";
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  headlineAr?: string;
  headlineEn?: string;
  summaryAr?: string;
  summaryEn?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
  slug?: string;
  completenessScore: number;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  description?: string;
  isCurrent: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  description?: string;
  startYear: number;
  endYear?: number;
}

export interface Skill {
  id: string;
  nameEn: string;
  nameAr?: string;
  endorsementCount?: number;
}

export interface Post {
  id: string;
  author: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    headline?: string;
  };
  content: string;
  textDirection: "rtl" | "ltr" | "auto";
  createdAt: string;
  images?: Array<{
    url: string;
    alt: string;
    width: number;
    height: number;
  }>;
  hashtags?: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLikedByMe: boolean;
}

export interface Connection {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  headline?: string;
  mutualConnections?: number;
  status: "connected" | "pending_received" | "pending_sent";
  requestMessage?: string;
  connectedSince?: string;
  requestedAt?: string;
}

export interface PendingRequest {
  connectionId: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    headlineEn?: string;
  };
  requestedAt: string;
}

export type ConnectionStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  workType: "ONSITE" | "HYBRID" | "REMOTE";
  experienceLevel: "ENTRY" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE";
  description: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  language: string;
  status: "OPEN" | "CLOSED" | "ARCHIVED";
  applicantCount: number;
  createdAt: string;
  isApplied?: boolean;
  isSaved?: boolean;
  applicationId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string;
  status: "sending" | "sent" | "delivered" | "read";
}

export interface Conversation {
  id: string;
  contact: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    headline?: string;
    isOnline: boolean;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
}

export interface SearchPersonResult {
  id: string;
  displayName: string;
  headlineEn: string | null;
  headlineAr: string | null;
  avatarUrl: string | null;
}

export interface SearchPostResult {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface SearchJobResult {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workType: string;
  experienceLevel: string;
  createdAt: string;
}

export interface SearchResults {
  query: string;
  people: SearchPersonResult[];
  posts: SearchPostResult[];
  jobs: SearchJobResult[];
}

export type SearchType = "people" | "posts" | "jobs";

export interface Bookmark {
  id: string;
  userId: string;
  targetId: string;
  targetType: "post" | "job";
  createdAt: string;
  target?: Post | Job;
}

export interface ProfileViewer {
  id: string;
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  viewerHeadline?: string;
  viewedAt: string;
}

export type NotificationType =
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "MESSAGE"
  | "POST_LIKE"
  | "POST_COMMENT"
  | "JOB_APPLICATION"
  | "SYSTEM";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  referenceId: string | null;
  referenceType: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
