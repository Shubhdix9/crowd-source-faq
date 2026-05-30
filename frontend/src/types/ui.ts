// Shared types across UI components

export interface Post {
  _id: string;
  title: string;
  body?: string;
  status?: 'answered' | 'open' | string;
  author?: { name?: string; _id?: string };
  createdAt?: string;
  upvotes?: (string | { _id?: string })[];
  comments?: unknown[];
  answer?: string | null;
  answerIsExpert?: boolean;
  [key: string]: unknown;
}

export interface TrendingQuery {
  query: string;
  count: number;
}

export interface FAQItem {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  // Freshness system
  reviewStatus?: 'verified' | 'pending_review' | 'update_requested';
  lastVerifiedDate?: string;
  reviewIntervalDays?: number;
  freshnessTier?: 'evergreen' | 'seasonal' | 'volatile';
  helpfulVotes?: number;
  unhelpfulVotes?: number;
}

export interface SearchResult {
  _id: string;
  question?: string;
  title?: string;
  answer?: string;
  body?: string;
  source?: 'faq' | 'community';
  status?: 'answered' | 'open' | string;
  category?: string;
  upvotes?: unknown[];
  comments?: unknown[];
  vectorScore?: number;
  textScore?: number;
}

export interface FAQMatch {
  _id: string;
  question: string;
  answer?: string;
  category?: string;
  similarity?: number;
}

export interface Category {
  name: string;
  icon: React.ReactNode;
}