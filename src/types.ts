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
  slotId: string | null;
  description: string;
  imageUrls?: string[];
  authorName?: string;
  createdAt: any;
}

export interface Channel {
  id: string;
  name: string;
  url: string;
  createdAt: any;
}

export enum ViewMode {
  USER = 'user',
  MENTOR = 'mentor',
  ADMIN = 'admin'
}
