export interface QuotedMessagePreview {
  id: string;
  role: 'user' | 'model';
  senderName: string;
  snippet: string;
}

export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
  thoughtDuration?: number; // In seconds, e.g. 4
  replyTo?: QuotedMessagePreview;
}

export type AIModelTier = 'low' | 'medium' | 'high';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  prompt?: string;
  summary?: string;
  messages: JournalMessage[];
  tags: string[];
  pinned?: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export type ReflectionMode = 'reflective' | 'brainstorm' | 'summary';

export interface PromptOfTheDay {
  prompt: string;
  theme: string;
  category: string;
  guidance: string;
}

export interface EmotionalTrendPoint {
  id: string;
  dateStr: string;
  timestamp: number;
  title: string;
  sentimentScore: number; // 0 - 100
  clarityScore: number;   // 0 - 100
  energyScore: number;    // 0 - 100
  dominantMood: string;
  moodColor: string;
}

