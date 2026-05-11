import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { Message, MessageAuthor, Thread, Booking, BookingStatus } from '@cnt-workspace/models';
import { BookingService } from '../booking/booking.service';
import { AuthService, PublicUser } from '../auth/auth.service';
import { ToastService } from '../toast/toast.service';
import { getListingDetail, MOCK_LISTINGS } from '../listings/mock-listings.data';
import { getMyListings, getPendingRequests, HostRequest } from '../host/mock-host-data';

const THREADS_KEY = 'cnt-messages';
const REPLY_DELAY_MS = 10_000;

const HOST_REPLY_POOL = [
  "Hey! Thanks for reaching out — happy to help. Anything specific you're hoping to know?",
  "Glad you're considering the spot. The site is level and we have full hookups — let me know what else I can answer.",
  "Welcome! Looking forward to hosting you. I'll keep an eye on the calendar.",
];
const GUEST_REPLY_POOL = [
  "Thanks for the quick reply! That helps a lot.",
  "Awesome — sounds great. We're really looking forward to it.",
  "Perfect, thanks. We'll plan around that.",
];

function deriveHostEmail(listingId: number): string {
  return `host-${listingId}@curbnturf.demo`;
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly _threads$ = new BehaviorSubject<Thread[]>([]);
  readonly threads$: Observable<Thread[]> = this._threads$.asObservable();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private lastSeenStatus = new Map<string, BookingStatus>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private bookings: BookingService,
    private auth: AuthService,
    private toasts: ToastService,
  ) {
    this._threads$.next(this.read());
    this.replayPendingReplies();
    // Listen to bookings to seed/update threads.
    this.bookings.bookings$.subscribe(list => this.reconcileBookings(list));
    // When the user becomes available in host view, seed mock host-request threads.
    combineLatest([this.auth.currentUser$, this.auth.currentView$]).subscribe(([u]) => {
      if (u) this.seedHostRequestThreads(u);
    });
  }

  // ---- Public API ------------------------------------------------------

  threadsForUser(email: string): Thread[] {
    return this._threads$.value
      .filter(t => t.guestEmail === email || t.hostEmail === email)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getThread(id: string): Thread | null {
    return this._threads$.value.find(t => t.id === id) ?? null;
  }

  unreadFor$(email: string): Observable<number> {
    return this.threads$.pipe(
      map(list => list.filter(t => this.isUnread(t, email)).length),
    );
  }

  isUnread(t: Thread, email: string): boolean {
    if (t.messages.length === 0) return false;
    const last = t.messages[t.messages.length - 1];
    if (last.author === 'system') return false;
    const fromMe = (last.author === 'guest' && t.guestEmail === email)
                || (last.author === 'host' && t.hostEmail === email);
    if (fromMe) return false;
    const lastRead = t.lastReadAt[email];
    return !lastRead || lastRead < last.createdAt;
  }

  markRead(threadId: string, email: string): void {
    const all = this.read();
    const idx = all.findIndex(t => t.id === threadId);
    if (idx === -1) return;
    const t = all[idx];
    if (t.guestEmail !== email && t.hostEmail !== email) return;
    all[idx] = { ...t, lastReadAt: { ...t.lastReadAt, [email]: new Date().toISOString() } };
    this.write(all);
  }

  sendMessage(threadId: string, author: MessageAuthor, body: string): Message | null {
    const trimmed = body.trim();
    if (!trimmed) return null;
    const all = this.read();
    const idx = all.findIndex(t => t.id === threadId);
    if (idx === -1) return null;
    const t = all[idx];
    const authorName = author === 'guest' ? t.guestName : author === 'host' ? t.hostName : 'CurbNTurf';
    const msg: Message = {
      id: newId('m'),
      threadId,
      author,
      authorName,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };
    const senderEmail = author === 'guest' ? t.guestEmail : t.hostEmail;
    const updated: Thread = {
      ...t,
      messages: [...t.messages, msg],
      updatedAt: msg.createdAt,
      lastReadAt: senderEmail ? { ...t.lastReadAt, [senderEmail]: msg.createdAt } : t.lastReadAt,
    };

    // Schedule a counter-party auto-reply if none exists yet from the other side.
    const counter: MessageAuthor = author === 'guest' ? 'host' : 'guest';
    const counterHasReplied = updated.messages.some(m => m.author === counter);
    if (!counterHasReplied && (author === 'guest' || author === 'host')) {
      updated.pendingReplyAt = new Date(Date.now() + REPLY_DELAY_MS).toISOString();
      updated.pendingReplyFor = counter;
    }

    all[idx] = updated;
    this.write(all);
    if (updated.pendingReplyAt) this.scheduleReply(updated.id);
    return msg;
  }

  /** Idempotent — only seeds a thread for a mock host-request if we haven't already. */
  ensureThreadForRequest(req: HostRequest, hostUser: PublicUser): Thread {
    const id = `req-${req.id}`;
    const existing = this.getThread(id);
    if (existing) return existing;
    const listing = MOCK_LISTINGS.find(l => l.id === req.listingId);
    const photo = listing ? getListingDetail(listing).photos[0] : '';
    const hostName = `${hostUser.firstName} ${hostUser.lastName}`.trim();
    const now = new Date().toISOString();
    const messages: Message[] = [];
    if (req.message) {
      messages.push({
        id: newId('m'),
        threadId: id,
        author: 'guest',
        authorName: req.guestName,
        body: req.message,
        createdAt: req.receivedAt,
      });
    }
    const thread: Thread = {
      id,
      requestId: req.id,
      listingId: req.listingId,
      listingTitle: req.listingTitle,
      listingPhoto: photo,
      guestEmail: `guest-${req.id}@curbnturf.demo`,
      guestName: req.guestName,
      guestInitials: req.guestInitials,
      hostEmail: hostUser.email,
      hostName,
      hostInitials: initialsFromName(hostName) || 'H',
      messages,
      createdAt: req.receivedAt,
      updatedAt: messages.length ? req.receivedAt : now,
      lastReadAt: {},
    };
    const all = this.read();
    all.push(thread);
    this.write(all);
    return thread;
  }

  // ---- Booking reconciliation ------------------------------------------

  private reconcileBookings(bookings: Booking[]): void {
    const all = this.read();
    const byBookingId = new Map(all.filter(t => t.bookingId).map(t => [t.bookingId!, t]));
    let mutated = false;

    for (const b of bookings) {
      let thread = byBookingId.get(b.id);
      if (!thread) {
        thread = this.buildThreadFromBooking(b);
        all.push(thread);
        byBookingId.set(b.id, thread);
        mutated = true;
        this.lastSeenStatus.set(b.id, b.status);
        continue;
      }
      // Detect status transitions and append a system message once per transition.
      const prev = this.lastSeenStatus.get(b.id) ?? b.status;
      if (prev !== b.status) {
        const sysBody = this.systemBodyForStatus(b.status, b.hostName);
        if (sysBody) {
          const sys: Message = {
            id: newId('m'),
            threadId: thread.id,
            author: 'system',
            authorName: 'CurbNTurf',
            body: sysBody,
            createdAt: new Date().toISOString(),
          };
          thread = { ...thread, messages: [...thread.messages, sys], updatedAt: sys.createdAt };
          const idx = all.findIndex(t => t.id === thread!.id);
          if (idx !== -1) all[idx] = thread;
          mutated = true;
        }
      }
      this.lastSeenStatus.set(b.id, b.status);
    }
    if (mutated) this.write(all);
  }

  private buildThreadFromBooking(b: Booking): Thread {
    const hostEmail = deriveHostEmail(b.listingId);
    const hostName = b.hostName || 'Host';
    const guestUser = this.auth.currentUser;
    const guestName = guestUser && guestUser.email === b.userEmail
      ? `${guestUser.firstName} ${guestUser.lastName}`.trim()
      : b.userEmail;
    const messages: Message[] = [];
    const requestMessage = (b as Booking & { requestMessage?: string }).requestMessage;
    if (requestMessage) {
      messages.push({
        id: newId('m'),
        threadId: b.id,
        author: 'guest',
        authorName: guestName,
        body: requestMessage,
        createdAt: b.createdAt,
      });
    } else {
      // Always seed a system intro so threads aren't empty.
      messages.push({
        id: newId('m'),
        threadId: b.id,
        author: 'system',
        authorName: 'CurbNTurf',
        body: b.instantBook
          ? `Reservation confirmed for ${b.listingTitle}.`
          : `Request sent to ${hostName}. They typically respond within 24 hours.`,
        createdAt: b.createdAt,
      });
    }
    return {
      id: b.id,
      bookingId: b.id,
      listingId: b.listingId,
      listingTitle: b.listingTitle,
      listingPhoto: b.listingPhoto,
      guestEmail: b.userEmail,
      guestName,
      guestInitials: initialsFromName(guestName) || 'G',
      hostEmail,
      hostName,
      hostInitials: initialsFromName(hostName) || 'H',
      messages,
      createdAt: b.createdAt,
      updatedAt: b.createdAt,
      lastReadAt: {},
    };
  }

  private systemBodyForStatus(status: BookingStatus, hostName: string): string | null {
    switch (status) {
      case 'approved': return `${hostName} approved the request — your stay is locked in.`;
      case 'declined': return `${hostName} declined the request.`;
      case 'cancelled': return `Booking cancelled.`;
      case 'confirmed': return null;
      case 'pending': return null;
      default: return null;
    }
  }

  // ---- Host-side request thread seeding --------------------------------

  private seedHostRequestThreads(user: PublicUser): void {
    const myListings = getMyListings(user.email);
    if (myListings.length === 0) return;
    const requests = getPendingRequests(myListings);
    for (const req of requests) this.ensureThreadForRequest(req, user);
  }

  // ---- Auto-reply timers -----------------------------------------------

  private replayPendingReplies(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    for (const t of this._threads$.value) {
      if (t.pendingReplyAt) this.scheduleReply(t.id);
    }
  }

  private scheduleReply(threadId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.timers.has(threadId)) return;
    const t = this.getThread(threadId);
    if (!t || !t.pendingReplyAt || !t.pendingReplyFor) return;
    const ms = Math.max(0, new Date(t.pendingReplyAt).getTime() - Date.now());
    const timer = setTimeout(() => this.applyReply(threadId), ms);
    this.timers.set(threadId, timer);
  }

  private applyReply(threadId: string): void {
    this.timers.delete(threadId);
    const all = this.read();
    const idx = all.findIndex(t => t.id === threadId);
    if (idx === -1) return;
    const t = all[idx];
    const author = t.pendingReplyFor;
    if (!author || author === 'system') return;
    const pool = author === 'host' ? HOST_REPLY_POOL : GUEST_REPLY_POOL;
    const body = pool[Math.floor(Math.random() * pool.length)];
    const msg: Message = {
      id: newId('m'),
      threadId,
      author,
      authorName: author === 'host' ? t.hostName : t.guestName,
      body,
      createdAt: new Date().toISOString(),
    };
    all[idx] = {
      ...t,
      messages: [...t.messages, msg],
      updatedAt: msg.createdAt,
      pendingReplyAt: undefined,
      pendingReplyFor: undefined,
    };
    this.write(all);

    // Toast only if the current user is the recipient.
    const me = this.auth.currentUser?.email;
    if (me) {
      const recipientEmail = author === 'host' ? t.guestEmail : t.hostEmail;
      if (recipientEmail === me) {
        const senderName = author === 'host' ? t.hostName : t.guestName;
        this.toasts.info(`New message from ${senderName}`);
      }
    }
  }

  // ---- Storage ---------------------------------------------------------

  private read(): Thread[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(THREADS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(threads: Thread[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    this._threads$.next(threads);
  }
}
