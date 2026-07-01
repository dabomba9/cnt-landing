import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { IMessage, MessageAuthor, IThread, IBooking, BookingStatus } from '@cnt-workspace/models';
import { BookingService } from '../booking/booking.service';
import { AuthService, IPublicUser } from '../auth/auth.service';
import { ToastService } from '../toast/toast.service';
import { getListingDetail, MOCK_LISTINGS } from '../listings/mock-listings.data';
import { getMyListings, getPendingRequests, IHostRequest } from '../host/mock-host-data';

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
  private platformId = inject<Object>(PLATFORM_ID);
  private bookings = inject(BookingService);
  private auth = inject(AuthService);
  private toasts = inject(ToastService);

  private readonly _threads$ = new BehaviorSubject<IThread[]>([]);
  readonly threads$: Observable<IThread[]> = this._threads$.asObservable();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private lastSeenStatus = new Map<string, BookingStatus>();
  private lastSeenModifiedAt = new Map<string, string | undefined>();

  constructor() {
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

  /** True when the user is the host of the thread's listing (via getMyListings). */
  private isHostOfListing(listingId: number, email: string): boolean {
    return getMyListings(email).some(l => l.id === listingId);
  }

  /** What role does this user play in this thread? null = no relationship. */
  roleForUser(t: IThread, email: string): 'guest' | 'host' | null {
    if (t.guestEmail === email) return 'guest';
    if (t.hostEmail === email) return 'host';
    if (this.isHostOfListing(t.listingId, email)) return 'host';
    return null;
  }

  /** The thread participant key to use for lastReadAt — matches stored thread emails. */
  private readKeyFor(t: IThread, email: string): string | null {
    const role = this.roleForUser(t, email);
    if (role === 'guest') return t.guestEmail;
    if (role === 'host') return t.hostEmail;
    return null;
  }

  threadsForUser(email: string): IThread[] {
    return this._threads$.value
      .filter(t => this.roleForUser(t, email) !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getThread(id: string): IThread | null {
    return this._threads$.value.find(t => t.id === id) ?? null;
  }

  unreadFor$(email: string): Observable<number> {
    return this.threads$.pipe(
      map(list => list.filter(t => this.isUnread(t, email)).length),
    );
  }

  isUnread(t: IThread, email: string): boolean {
    if (t.messages.length === 0) return false;
    const last = t.messages[t.messages.length - 1];
    if (last.author === 'system') return false;
    const role = this.roleForUser(t, email);
    if (!role) return false;
    if (last.author === role) return false;
    const key = this.readKeyFor(t, email);
    if (!key) return false;
    const lastRead = t.lastReadAt[key];
    return !lastRead || lastRead < last.createdAt;
  }

  /** True when the counterparty's lastReadAt is newer than this message's
   *  createdAt — drives the "Seen ✓✓" indicator on outgoing bubbles. */
  hasBeenReadBy(t: IThread, m: IMessage, viewerEmail: string): boolean {
    if (m.author === 'system') return false;
    const viewerRole = this.roleForUser(t, viewerEmail);
    if (!viewerRole) return false;
    // Counterparty key — opposite end of the thread.
    const otherKey = viewerRole === 'guest' ? t.hostEmail : t.guestEmail;
    const lastRead = t.lastReadAt?.[otherKey];
    if (!lastRead) return false;
    return Date.parse(lastRead) >= Date.parse(m.createdAt);
  }

  markRead(threadId: string, email: string): void {
    const all = this.read();
    const idx = all.findIndex(t => t.id === threadId);
    if (idx === -1) return;
    const t = all[idx];
    const key = this.readKeyFor(t, email);
    if (!key) return;
    all[idx] = { ...t, lastReadAt: { ...t.lastReadAt, [key]: new Date().toISOString() } };
    this.write(all);
  }

  sendMessage(threadId: string, author: MessageAuthor, body: string): IMessage | null {
    const trimmed = body.trim();
    if (!trimmed) return null;
    const all = this.read();
    const idx = all.findIndex(t => t.id === threadId);
    if (idx === -1) return null;
    const t = all[idx];
    const authorName = author === 'guest' ? t.guestName : author === 'host' ? t.hostName : 'CurbNTurf';
    const msg: IMessage = {
      id: newId('m'),
      threadId,
      author,
      authorName,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };
    const senderEmail = author === 'guest' ? t.guestEmail : t.hostEmail;
    const updated: IThread = {
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
  ensureThreadForRequest(req: IHostRequest, hostUser: IPublicUser): IThread {
    const id = `req-${req.id}`;
    const existing = this.getThread(id);
    if (existing) return existing;
    const listing = MOCK_LISTINGS.find(l => l.id === req.listingId);
    const photo = listing ? getListingDetail(listing).photos[0] : '';
    const hostName = `${hostUser.firstName} ${hostUser.lastName}`.trim();
    const now = new Date().toISOString();
    const messages: IMessage[] = [];
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
    const thread: IThread = {
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

  private reconcileBookings(bookings: IBooking[]): void {
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
        const sysBody = this.systemBodyForStatus(b.status, b);
        if (sysBody) {
          thread = this.appendSystem(thread, sysBody);
          const idx = all.findIndex(t => t.id === thread!.id);
          if (idx !== -1) all[idx] = thread;
          mutated = true;
        }
      }
      this.lastSeenStatus.set(b.id, b.status);

      // Detect modify (dates/guests) transitions.
      const prevModified = this.lastSeenModifiedAt.get(b.id);
      if (b.modifiedAt && b.modifiedAt !== prevModified) {
        // Only emit if we've seen this booking before (i.e. modification, not initial seed).
        if (prevModified !== undefined || this.lastSeenStatus.has(b.id)) {
          const body = this.modifyBody(b);
          thread = this.appendSystem(thread, body);
          const idx = all.findIndex(t => t.id === thread!.id);
          if (idx !== -1) all[idx] = thread;
          mutated = true;
        }
      }
      this.lastSeenModifiedAt.set(b.id, b.modifiedAt);
    }
    if (mutated) this.write(all);
  }

  private appendSystem(thread: IThread, body: string): IThread {
    const sys: IMessage = {
      id: newId('m'),
      threadId: thread.id,
      author: 'system',
      authorName: 'CurbNTurf',
      body,
      createdAt: new Date().toISOString(),
    };
    return { ...thread, messages: [...thread.messages, sys], updatedAt: sys.createdAt };
  }

  private modifyBody(b: IBooking): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = new Date(b.dates.start).toLocaleDateString('en-US', opts);
    const end = new Date(b.dates.end).toLocaleDateString('en-US', opts);
    const base = `Trip updated to ${start} – ${end} · ${b.guests} guest${b.guests === 1 ? '' : 's'}`;
    const addOns = b.addOns || [];
    if (addOns.length === 0) return `${base}.`;
    const names = addOns.map(a => a.label).join(', ');
    return `${base} · Add-ons: ${names}.`;
  }

  private buildThreadFromBooking(b: IBooking): IThread {
    const hostEmail = deriveHostEmail(b.listingId);
    const hostName = b.hostName || 'Host';
    const guestUser = this.auth.currentUser;
    const guestName = guestUser && guestUser.email === b.userEmail
      ? `${guestUser.firstName} ${guestUser.lastName}`.trim()
      : b.userEmail;
    const messages: IMessage[] = [];
    const requestMessage = (b as IBooking & { requestMessage?: string }).requestMessage;
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

  private systemBodyForStatus(status: BookingStatus, b: IBooking): string | null {
    switch (status) {
      case 'approved': return `${b.hostName} approved the request — your stay is locked in.`;
      case 'declined': return `${b.hostName} declined the request.`;
      case 'cancelled':
        return b.cancelReason
          ? `Booking cancelled — "${b.cancelReason}"`
          : `Booking cancelled.`;
      case 'confirmed': return null;
      case 'pending': return null;
      default: return null;
    }
  }

  // ---- Host-side request thread seeding --------------------------------

  private seedHostRequestThreads(user: IPublicUser): void {
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
    const msg: IMessage = {
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

    // Toast only if the current user is the recipient AND has notifPrefs.hostResponses enabled.
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      const recipientEmail = author === 'host' ? t.guestEmail : t.hostEmail;
      const hostResponsesOn = currentUser.notifPrefs?.hostResponses !== false; // default true
      if (recipientEmail === currentUser.email && hostResponsesOn) {
        const senderName = author === 'host' ? t.hostName : t.guestName;
        this.toasts.info(`New message from ${senderName}`);
      }
    }
  }

  // ---- Storage ---------------------------------------------------------

  private read(): IThread[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(THREADS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(threads: IThread[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    this._threads$.next(threads);
  }
}
