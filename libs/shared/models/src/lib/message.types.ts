export type MessageAuthor = 'guest' | 'host' | 'system';

export interface IMessage {
  id: string;
  threadId: string;
  author: MessageAuthor;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface IThread {
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
  messages: IMessage[];
  createdAt: string;
  updatedAt: string;
  lastReadAt: Record<string, string>;
  pendingReplyAt?: string;
  pendingReplyFor?: MessageAuthor;
}
