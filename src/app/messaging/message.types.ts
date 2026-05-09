export type MessageAuthor = 'guest' | 'host' | 'system';

export interface Message {
  id: string;
  threadId: string;
  author: MessageAuthor;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface Thread {
  id: string;
  bookingId?: string;
  requestId?: string;
  listingId: number;
  listingTitle: string;
  listingPhoto: string;
  guestEmail: string;
  guestName: string;
  guestInitials: string;
  hostEmail: string;
  hostName: string;
  hostInitials: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  lastReadAt: Record<string, string>;
  pendingReplyAt?: string;
  pendingReplyFor?: MessageAuthor;
}
