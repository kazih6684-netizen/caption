import { Timestamp } from 'firebase/firestore';

export interface AppConfig {
  userPassword?: string;
  mentorPassword?: string;
  adminPassword?: string;
  adminEmail?: string;
  isActivated?: boolean;
}

export interface MainSlot {
  id: string;
  title: string;
  parentId?: string;
  order: number;
  createdAt: Timestamp;
}

export interface ContentItem {
  id: string;
  slotId: string;
  title: string;
  caption?: string;
  description: string;
  imageUrls: string[];
  order: number;
  createdAt: Timestamp;
}

export enum ViewMode {
  USER = 'user',
  MENTOR = 'mentor',
  ADMIN = 'admin'
}
