// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types — mirroring backend Prisma models
// ─────────────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'MEMBER';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'WON'
  | 'LOST';

export type ActivityType =
  | 'LEAD_CREATED'
  | 'LEAD_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'NOTE_ADDED'
  | 'LEAD_UPDATED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  status: LeadStatus;
  assignedToId: string | null;
  assignedTo?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  content: string;
  leadId: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  oldValue: string | null;
  newValue: string | null;
  leadId: string;
  userId: string | null;
  user: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}
