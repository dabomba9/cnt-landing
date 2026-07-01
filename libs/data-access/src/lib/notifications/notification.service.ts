import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { IBooking } from '@cnt-workspace/models';
import { BookingService, REVIEW_CREDIT_PER_NIGHT } from '../booking/booking.service';
import { MessageService } from '../messaging/message.service';
import { ReviewService, IUserReview } from '../reviews/review.service';
import { AuthService, AppView, IPublicUser } from '../auth/auth.service';
import { getMyListings } from '../host/mock-host-data';

export type NotificationKind =
  | 'message_new'
  | 'booking_approved'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_request'        // host: new pending request on their listing
  | 'review_received'        // host: a guest left a review on their listing
  | 'review_eligible'        // guest: completed trip that hasn't been reviewed
  | 'trip_reminder';         // guest: upcoming stay within 7 days

export interface INotification {
  /** Deterministic id so read-state survives reloads. */
  id: string;
  kind: NotificationKind;
  icon: string;              // material-symbols name
  tone: 'trinidad' | 'jungle' | 'gold' | 'muted';
  title: string;
  subtitle: string;
  /** ISO timestamp the underlying event fired. */
  timestamp: string;
  routerLink: string;
  read: boolean;
}

const READ_KEY = 'cnt-notifications-read';
const SEVEN_DAYS = 7 * 86_400_000;
const THIRTY_DAYS = 30 * 86_400_000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);
  private bookings = inject(BookingService);
  private messages = inject(MessageService);
  private reviews = inject(ReviewService);

  private readonly _readIds$ = new BehaviorSubject<Set<string>>(new Set());

  /** Live, derived feed for the current user + view. Sorted newest first. */
  readonly notifications$: Observable<INotification[]>;
  /** Count of unread notifications. */
  readonly unreadCount$: Observable<number>;

  constructor() {
    this._readIds$.next(this.readPersisted());

    this.notifications$ = combineLatest([
      this.auth.currentUser$,
      this.auth.currentView$,
      this.bookings.bookings$,
      this.messages.threads$,
      this.reviews.reviews$,
      this._readIds$,
    ]).pipe(
      map(([user, view, allBookings, _threads, reviews, readIds]) =>
        this.derive(user, view, allBookings, reviews, readIds)),
    );

    this.unreadCount$ = this.notifications$.pipe(
      map(list => list.filter(n => !n.read).length),
    );
  }

  markRead(id: string): void {
    const next = new Set(this._readIds$.value);
    if (next.has(id)) return;
    next.add(id);
    this.persist(next);
    this._readIds$.next(next);
  }

  markAllRead(notifications: INotification[]): void {
    const next = new Set(this._readIds$.value);
    for (const n of notifications) next.add(n.id);
    this.persist(next);
    this._readIds$.next(next);
  }

  // ---------- derivation ----------

  private derive(
    user: IPublicUser | null,
    view: AppView,
    allBookings: IBooking[],
    reviews: IUserReview[],
    readIds: Set<string>,
  ): INotification[] {
    if (!user) return [];
    const now = Date.now();
    const out: INotification[] = [];

    // ----- Messages: one notification per thread with unread inbound messages -----
    const userThreads = this.messages.threadsForUser(user.email);
    for (const t of userThreads) {
      const lastMsg = t.messages[t.messages.length - 1];
      if (!lastMsg) continue;
      const isHostSide = t.hostEmail === user.email;
      // Only inbound (from the other party) counts toward notifications
      const fromOther = isHostSide ? lastMsg.author === 'guest' : lastMsg.author === 'host';
      if (!fromOther) continue;
      const lastRead = t.lastReadAt[user.email];
      if (lastRead && lastRead >= lastMsg.createdAt) continue;
      const otherName = isHostSide ? t.guestName : t.hostName;
      out.push({
        id: `msg-${t.id}-${lastMsg.id}`,
        kind: 'message_new',
        icon: 'forum',
        tone: 'trinidad',
        title: `${otherName} sent a message`,
        subtitle: this.truncate(lastMsg.body, 80),
        timestamp: lastMsg.createdAt,
        routerLink: `/inbox/${t.id}`,
        read: readIds.has(`msg-${t.id}-${lastMsg.id}`),
      });
    }

    if (view === 'guest') {
      const myBookings = allBookings.filter(b => b.userEmail === user.email);
      for (const b of myBookings) {
        // Status-change events from past 30 days
        if (b.status === 'approved' && this.recent(b.createdAt, THIRTY_DAYS)) {
          out.push({
            id: `bk-approved-${b.id}`,
            kind: 'booking_approved',
            icon: 'check_circle',
            tone: 'jungle',
            title: `${b.hostName} approved your stay`,
            subtitle: `${b.listingTitle} · ${this.dateRange(b)}`,
            timestamp: b.createdAt,
            routerLink: `/booking/confirm/${b.id}`,
            read: readIds.has(`bk-approved-${b.id}`),
          });
        }
        if (b.status === 'declined' && this.recent(b.createdAt, THIRTY_DAYS)) {
          out.push({
            id: `bk-declined-${b.id}`,
            kind: 'booking_declined',
            icon: 'block',
            tone: 'muted',
            title: `${b.hostName} declined your request`,
            subtitle: `${b.listingTitle} · ${this.dateRange(b)}`,
            timestamp: b.createdAt,
            routerLink: `/trips`,
            read: readIds.has(`bk-declined-${b.id}`),
          });
        }
        if (b.status === 'cancelled' && this.recent(b.createdAt, THIRTY_DAYS)) {
          out.push({
            id: `bk-cancelled-${b.id}`,
            kind: 'booking_cancelled',
            icon: 'event_busy',
            tone: 'muted',
            title: 'Trip cancelled',
            subtitle: `${b.listingTitle} · ${this.dateRange(b)}`,
            timestamp: b.createdAt,
            routerLink: `/trips`,
            read: readIds.has(`bk-cancelled-${b.id}`),
          });
        }

        // Upcoming reminders — within 7 days, not cancelled/declined
        if (b.status === 'confirmed' || b.status === 'approved') {
          const startMs = new Date(b.dates.start).getTime();
          const diff = startMs - now;
          if (diff > 0 && diff <= SEVEN_DAYS) {
            const days = Math.ceil(diff / 86_400_000);
            out.push({
              id: `bk-reminder-${b.id}-${this.dayKey(b.dates.start)}`,
              kind: 'trip_reminder',
              icon: 'luggage',
              tone: 'gold',
              title: days <= 1 ? 'Your trip starts tomorrow' : `Your trip starts in ${days} days`,
              subtitle: `${b.listingTitle} · ${this.dateRange(b)}`,
              timestamp: new Date(now).toISOString(),
              routerLink: `/booking/confirm/${b.id}`,
              read: readIds.has(`bk-reminder-${b.id}-${this.dayKey(b.dates.start)}`),
            });
          }
        }

        // Review-eligible: past trip, not declined/cancelled, not reviewed
        if (
          b.status !== 'declined' && b.status !== 'cancelled' && !b.reviewedAt &&
          new Date(b.dates.end).getTime() < now &&
          this.recent(b.dates.end, THIRTY_DAYS)
        ) {
          out.push({
            id: `bk-review-${b.id}`,
            kind: 'review_eligible',
            icon: 'redeem',
            tone: 'gold',
            title: `Earn $${REVIEW_CREDIT_PER_NIGHT}/night credit`,
            subtitle: `Leave a review for ${b.listingTitle}`,
            timestamp: b.dates.end,
            routerLink: `/trips?review=${b.id}`,
            read: readIds.has(`bk-review-${b.id}`),
          });
        }
      }
    } else {
      // Host view
      const myListingIds = new Set(getMyListings(user.email).map(l => l.id));
      const hostBookings = allBookings.filter(b => myListingIds.has(b.listingId));

      for (const b of hostBookings) {
        // New requests waiting for host action
        if (b.status === 'pending' && this.recent(b.createdAt, THIRTY_DAYS)) {
          out.push({
            id: `host-request-${b.id}`,
            kind: 'booking_request',
            icon: 'inbox',
            tone: 'trinidad',
            title: 'New booking request',
            subtitle: `${b.listingTitle} · ${this.dateRange(b)}`,
            timestamp: b.createdAt,
            routerLink: `/hosting`,
            read: readIds.has(`host-request-${b.id}`),
          });
        }
        // Cancellations on accepted bookings sting — surface them
        if (b.status === 'cancelled' && this.recent(b.createdAt, THIRTY_DAYS)) {
          out.push({
            id: `host-cancel-${b.id}`,
            kind: 'booking_cancelled',
            icon: 'event_busy',
            tone: 'muted',
            title: 'Guest cancelled their stay',
            subtitle: `${b.listingTitle} · ${this.dateRange(b)}`,
            timestamp: b.createdAt,
            routerLink: `/hosting`,
            read: readIds.has(`host-cancel-${b.id}`),
          });
        }
      }

      for (const r of reviews) {
        if (!myListingIds.has(r.listingId)) continue;
        if (!this.recent(r.createdAt, THIRTY_DAYS)) continue;
        out.push({
          id: `host-review-${r.id}`,
          kind: 'review_received',
          icon: 'star',
          tone: 'jungle',
          title: `${r.authorName} left a ${r.rating}-star review`,
          subtitle: this.truncate(r.text || 'Tap to read', 80),
          timestamp: r.createdAt,
          routerLink: `/hosting`,
          read: readIds.has(`host-review-${r.id}`),
        });
      }
    }

    return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 25);
  }

  private recent(iso: string, ms: number): boolean {
    return Date.now() - new Date(iso).getTime() < ms;
  }

  private dayKey(iso: string): string {
    return iso.slice(0, 10);
  }

  private dateRange(b: IBooking): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${new Date(b.dates.start).toLocaleDateString('en-US', opts)} – ${new Date(b.dates.end).toLocaleDateString('en-US', opts)}`;
  }

  private truncate(s: string, n: number): string {
    return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s;
  }

  private readPersisted(): Set<string> {
    if (!isPlatformBrowser(this.platformId)) return new Set();
    try {
      const raw = localStorage.getItem(READ_KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  }

  private persist(ids: Set<string>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(READ_KEY, JSON.stringify([...ids])); } catch { /* quota */ }
  }
}
