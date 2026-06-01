import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { AuthService, IPublicUser } from '@cnt-workspace/data-access';
import { SeoService } from '@cnt-workspace/data-access';
import { MessageService } from '@cnt-workspace/data-access';
import { QuickReplyService, IQuickReply } from '@cnt-workspace/data-access';
import { BookingService } from '@cnt-workspace/data-access';
import { HostReviewService } from '@cnt-workspace/data-access';
import { IThread, MessageAuthor, IMessage, IBooking, STATUS_META, BookingStatus } from '@cnt-workspace/models';

type ListFilter = 'all' | 'unread';

interface IStreamRow {
  kind: 'divider' | 'message' | 'typing';
  /** Stable key for *ngFor trackBy. */
  key: string;
  /** Divider label ("Today", "Yesterday", "Tue, May 6"). */
  dividerLabel?: string;
  message?: IMessage;
  /** True when this message is the *first* of a same-author run — only this row gets the bubble tail + a top margin. */
  isFirstInRun?: boolean;
  /** True when this message is the *last* of its run AND has a timestamp visible after it. */
  showTimestamp?: boolean;
  /** Typing-bubble side (only when kind === 'typing'). */
  typingFromOther?: boolean;
}

interface ISystemPillMeta {
  tone: 'jungle' | 'gold' | 'muted' | 'trinidad';
  icon: string;
}

@Component({
  selector: 'cnt-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.scss'],
})
export class InboxComponent implements OnInit, OnDestroy, AfterViewChecked {
  user: IPublicUser | null = null;
  threads: IThread[] = [];
  activeThreadId: string | null = null;
  composeBody = '';

  /** Thread-list polish state. */
  searchQuery = '';
  listFilter: ListFilter = 'all';

  /** Live "now" updated every 10s — drives the typing-indicator visibility + relative timestamps. */
  nowMs = Date.now();
  private nowTimer: ReturnType<typeof setInterval> | null = null;

  private subs: Subscription[] = [];
  private shouldScroll = false;

  @ViewChild('thread') threadEl?: ElementRef<HTMLDivElement>;
  @ViewChild('composerTextarea') composerTextarea?: ElementRef<HTMLTextAreaElement>;

  STATUS_META = STATUS_META;

  /** Host-side quick-reply chips (only rendered when the current user is the
   *  host in the active thread). */
  quickReplies: IQuickReply[] = [];
  /** Inline editor state for adding/editing a quick reply. */
  quickReplyEditorOpen = false;
  quickReplyEditingId: string | null = null;
  quickReplyDraftLabel = '';
  quickReplyDraftBody = '';
  /** Two-tap confirm: holds the id of the chip the host just tapped × on. */
  confirmingDeleteQuickReplyId: string | null = null;

  constructor(
    private auth: AuthService,
    private msg: MessageService,
    private bookingSvc: BookingService,
    private hostReviews: HostReviewService,
    private quickRepliesSvc: QuickReplyService,
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Inbox — CurbNTurf',
      description: 'Messages with hosts and guests.',
      url: '/inbox',
      robots: 'noindex, nofollow',
    });
    this.user = this.auth.currentUser;

    this.subs.push(
      this.quickRepliesSvc.replies$.subscribe(list => { this.quickReplies = list; }),
    );

    this.subs.push(
      this.msg.threads$.subscribe(() => {
        this.refreshThreads();
      }),
    );

    this.subs.push(
      this.route.paramMap.subscribe(p => {
        const id = p.get('threadId');
        this.activeThreadId = id || null;
        if (id && this.user) this.msg.markRead(id, this.user.email);
        this.shouldScroll = true;
      }),
    );

    // Refresh "now" so the pending-reply indicator clears itself and relative
    // timestamps stay reasonably fresh without a render storm.
    this.nowTimer = setInterval(() => (this.nowMs = Date.now()), 10_000);
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScroll) return;
    const el = this.threadEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
    this.shouldScroll = false;
  }

  ngOnDestroy(): void {
    for (const s of this.subs) s.unsubscribe();
    if (this.nowTimer) clearInterval(this.nowTimer);
  }

  private refreshThreads(): void {
    if (!this.user) return;
    this.threads = this.msg.threadsForUser(this.user.email);
    if (this.activeThreadId && this.user) {
      this.msg.markRead(this.activeThreadId, this.user.email);
    }
  }

  // ---- Filtered list ----

  get filteredThreads(): IThread[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.threads.filter(t => {
      if (this.listFilter === 'unread' && this.unreadCount(t) === 0) return false;
      if (!q) return true;
      const name = this.counterpartyName(t).toLowerCase();
      const title = (t.listingTitle || '').toLowerCase();
      return name.includes(q) || title.includes(q);
    });
  }

  get totalUnread(): number {
    return this.threads.reduce((sum, t) => sum + (this.unreadCount(t) > 0 ? 1 : 0), 0);
  }

  setFilter(f: ListFilter): void { this.listFilter = f; }
  clearSearch(): void { this.searchQuery = ''; }

  // ---- Active thread ----

  get activeThread(): IThread | null {
    if (!this.activeThreadId) return null;
    return this.threads.find(t => t.id === this.activeThreadId) ?? null;
  }

  /** The booking this thread is tied to, when one exists in the booking store. */
  get activeBooking(): IBooking | null {
    const t = this.activeThread;
    if (!t || !t.bookingId) return null;
    return this.bookingSvc.getById(t.bookingId);
  }

  /** Author label for the *current user* writing in this thread. */
  authorForCurrentUser(t: IThread): MessageAuthor | null {
    if (!this.user) return null;
    return this.msg.roleForUser(t, this.user.email);
  }

  counterpartyName(t: IThread): string {
    const me = this.authorForCurrentUser(t);
    if (me === 'guest') return t.hostName;
    if (me === 'host') return t.guestName;
    return t.hostName;
  }

  counterpartyInitials(t: IThread): string {
    const me = this.authorForCurrentUser(t);
    if (me === 'guest') return t.hostInitials;
    if (me === 'host') return t.guestInitials;
    return t.hostInitials;
  }

  /** When the current user is the host in this thread, the counterparty is
   * the guest — aggregate host-review history for their reputation badge.
   * Returns count = 0 when the counterparty is a host (no badge then). */
  counterpartyGuestRating(t: IThread): { rating: number; count: number } {
    if (this.authorForCurrentUser(t) !== 'host') return { rating: 0, count: 0 };
    const bookings = this.bookingSvc.getAll();
    const map = new Map(bookings.map(b => [b.id, b]));
    return this.hostReviews.aggregateForGuest(t.guestEmail, map);
  }

  unreadCount(t: IThread): number {
    if (!this.user) return 0;
    return this.msg.isUnread(t, this.user.email) ? 1 : 0;
  }

  selectThread(t: IThread): void {
    this.router.navigate(['/inbox', t.id]);
  }

  back(): void {
    this.router.navigate(['/inbox']);
  }

  /** Id of the message most recently sent by the viewer — drives the
   *  transient "Sending…" indicator on the bubble + the disabled send
   *  button. Cleared after a brief delay so the bubble flips to "Sent". */
  sendingMessageId: string | null = null;
  private sendingTimeout: ReturnType<typeof setTimeout> | null = null;

  send(): void {
    const t = this.activeThread;
    if (!t || !this.user) return;
    if (this.sendingMessageId) return; // already mid-send; guard double-tap
    const author = this.authorForCurrentUser(t);
    if (!author) return;
    const body = this.composeBody.trim();
    if (!body) return;
    const msg = this.msg.sendMessage(t.id, author, body);
    this.composeBody = '';
    this.shouldScroll = true;
    if (msg) {
      this.sendingMessageId = msg.id;
      if (this.sendingTimeout) clearTimeout(this.sendingTimeout);
      this.sendingTimeout = setTimeout(() => {
        if (this.sendingMessageId === msg.id) this.sendingMessageId = null;
      }, 600);
    }
  }

  /** True when the given message was authored by the current viewer — used
   *  by the template to decide whether to render the receipt indicator. */
  isOutgoing(t: IThread, m: IMessage): boolean {
    const me = this.authorForCurrentUser(t);
    return !!me && m.author === me;
  }

  /** "sending" | "seen" | "sent" — picks which receipt label to render. */
  receiptState(t: IThread, m: IMessage): 'sending' | 'seen' | 'sent' {
    if (this.sendingMessageId === m.id) return 'sending';
    if (!this.user) return 'sent';
    return this.msg.hasBeenReadBy(t, m, this.user.email) ? 'seen' : 'sent';
  }

  // ============ Quick replies (host-side) ============

  /** Pre-fill the composer with the chip's body, then focus + cursor-to-end. */
  applyQuickReply(r: IQuickReply): void {
    this.composeBody = r.body;
    queueMicrotask(() => {
      const el = this.composerTextarea?.nativeElement;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  }

  /** Open the inline editor in "add" mode. */
  startAddQuickReply(): void {
    this.quickReplyEditingId = null;
    this.quickReplyDraftLabel = '';
    this.quickReplyDraftBody = '';
    this.quickReplyEditorOpen = true;
  }

  /** Open the inline editor pre-filled with the chip's current label + body. */
  startEditQuickReply(r: IQuickReply): void {
    this.quickReplyEditingId = r.id;
    this.quickReplyDraftLabel = r.label;
    this.quickReplyDraftBody = r.body;
    this.quickReplyEditorOpen = true;
  }

  cancelQuickReplyEditor(): void {
    this.quickReplyEditorOpen = false;
    this.quickReplyEditingId = null;
    this.quickReplyDraftLabel = '';
    this.quickReplyDraftBody = '';
  }

  saveQuickReplyDraft(): void {
    const label = this.quickReplyDraftLabel.trim();
    const body = this.quickReplyDraftBody.trim();
    if (!label || !body) return;
    if (this.quickReplyEditingId) {
      this.quickRepliesSvc.update(this.quickReplyEditingId, { label, body });
    } else {
      this.quickRepliesSvc.add(label, body);
    }
    this.cancelQuickReplyEditor();
  }

  /** First tap arms; second tap confirms removal. */
  tapDeleteQuickReply(r: IQuickReply, ev: Event): void {
    ev.stopPropagation();
    if (this.confirmingDeleteQuickReplyId === r.id) {
      this.quickRepliesSvc.remove(r.id);
      this.confirmingDeleteQuickReplyId = null;
    } else {
      this.confirmingDeleteQuickReplyId = r.id;
      // Auto-disarm after 2.5s so a stray hover doesn't leave the chip primed.
      setTimeout(() => {
        if (this.confirmingDeleteQuickReplyId === r.id) this.confirmingDeleteQuickReplyId = null;
      }, 2500);
    }
  }

  /** True when the current user is the host in the active thread — gates the
   *  chip strip render. */
  showQuickReplies(t: IThread | null): boolean {
    if (!t) return false;
    return this.authorForCurrentUser(t) === 'host';
  }

  // ============ Per-stay timeline ============

  /** One step in the booking timeline strip pinned above the message stream. */
  timelineSteps(t: IThread | null): { key: string; label: string; icon: string; state: 'done' | 'current' | 'pending' | 'cancelled' }[] {
    if (!t) return [];
    const b = this.activeBooking;
    if (!b) return [];

    // Short-circuit for terminal-fail states.
    if (b.status === 'declined' || b.status === 'cancelled') {
      const failLabel = b.status === 'declined' ? 'Declined' : 'Cancelled';
      return [
        { key: 'requested', label: 'Requested', icon: 'send',     state: 'done' },
        { key: 'failed',    label: failLabel,   icon: 'cancel',   state: 'cancelled' },
        { key: 'paid',      label: 'Paid',      icon: 'payments', state: 'pending' },
        { key: 'stayed',    label: 'Stayed',    icon: 'nights_stay', state: 'pending' },
        { key: 'reviewed',  label: 'Reviewed',  icon: 'rate_review', state: 'pending' },
      ];
    }

    const now = Date.now();
    const endMs = Date.parse(b.dates.end);
    const stayDone = now > endMs;

    // Approved / Paid derivation.
    const approvedDone = b.status === 'approved' || b.status === 'confirmed';
    const paidDone     = b.status === 'confirmed';

    // Reviewed — per viewer side; otherwise pending.
    const viewerRole = this.authorForCurrentUser(t);
    const reviewedDone = viewerRole === 'host'
      ? !!b.hostReviewedAt
      : !!b.reviewedAt;

    // Pick the current step — the first non-done step (excluding cancelled
    // short-circuit handled above).
    let current: string | null = null;
    if (b.status === 'pending')        current = 'requested';
    else if (!approvedDone)            current = 'approved';
    else if (!paidDone)                current = 'paid';
    else if (!stayDone)                current = 'stayed';
    else if (!reviewedDone)            current = 'reviewed';

    const stateOf = (key: string, done: boolean): 'done' | 'current' | 'pending' => {
      if (done) return 'done';
      return current === key ? 'current' : 'pending';
    };

    return [
      { key: 'requested', label: 'Requested', icon: 'send',        state: stateOf('requested', true) },
      { key: 'approved',  label: 'Approved',  icon: 'task_alt',    state: stateOf('approved', approvedDone) },
      { key: 'paid',      label: 'Paid',      icon: 'payments',    state: stateOf('paid', paidDone) },
      { key: 'stayed',    label: 'Stayed',    icon: 'nights_stay', state: stateOf('stayed', stayDone) },
      { key: 'reviewed',  label: 'Reviewed',  icon: 'rate_review', state: stateOf('reviewed', reviewedDone) },
    ];
  }

  // ---- Stream rendering: date dividers + run grouping + typing indicator ----

  /** Build the renderable rows for the active thread: dividers, grouped messages, and a trailing typing bubble when applicable. */
  get streamRows(): IStreamRow[] {
    const t = this.activeThread;
    if (!t) return [];
    const rows: IStreamRow[] = [];
    const me = this.authorForCurrentUser(t);
    let lastDayKey = '';
    let prevAuthor: MessageAuthor | null = null;

    for (let i = 0; i < t.messages.length; i++) {
      const m = t.messages[i];
      const ts = new Date(m.createdAt).getTime();
      const dayKey = this.dayKey(m.createdAt);
      if (dayKey !== lastDayKey) {
        rows.push({
          kind: 'divider',
          key: `div-${dayKey}-${i}`,
          dividerLabel: this.dividerLabel(m.createdAt),
        });
        lastDayKey = dayKey;
        prevAuthor = null;
      }

      // System messages stand alone — they always break a run and never show a tail.
      const isSystem = m.author === 'system';
      const isFirstInRun = isSystem || m.author !== prevAuthor;

      // Look ahead — show the timestamp on the *last* message of a same-author run,
      // or on any message followed by a ≥15-min gap.
      const next = t.messages[i + 1];
      const nextTs = next ? new Date(next.createdAt).getTime() : Infinity;
      const runBreaks = !next
        || next.author !== m.author
        || isSystem
        || (nextTs - ts) >= 15 * 60_000
        || this.dayKey(next?.createdAt || '') !== dayKey;

      rows.push({
        kind: 'message',
        key: m.id,
        message: m,
        isFirstInRun,
        showTimestamp: runBreaks,
      });

      prevAuthor = isSystem ? null : m.author;
    }

    // Pending auto-reply → typing bubble on the counterparty side.
    if (t.pendingReplyAt && t.pendingReplyFor) {
      const due = new Date(t.pendingReplyAt).getTime();
      if (due > this.nowMs && me && t.pendingReplyFor !== me) {
        rows.push({
          kind: 'typing',
          key: `typing-${t.id}`,
          typingFromOther: true,
        });
      }
    }

    return rows;
  }

  /** YYYY-MM-DD key, used for date-divider boundaries. */
  private dayKey(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  private dividerLabel(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dayStart.getTime() === todayStart.getTime()) return 'Today';
    if (dayStart.getTime() === yest.getTime()) return 'Yesterday';
    // Same year → short. Different year → include year.
    const opts: Intl.DateTimeFormatOptions = d.getFullYear() === today.getFullYear()
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', opts);
  }

  /** Classify a system message body so we can pick a colored pill. */
  systemMeta(body: string): ISystemPillMeta {
    const lower = body.toLowerCase();
    if (lower.includes('approved') || lower.includes('confirmed') || lower.includes('checked in')) return { tone: 'jungle', icon: 'check_circle' };
    if (lower.includes('declined')) return { tone: 'muted', icon: 'block' };
    if (lower.includes('cancelled') || lower.includes('canceled')) return { tone: 'muted', icon: 'event_busy' };
    if (lower.includes('pending') || lower.includes('request')) return { tone: 'gold', icon: 'hourglass_top' };
    if (lower.includes('modified') || lower.includes('updated')) return { tone: 'trinidad', icon: 'edit_calendar' };
    return { tone: 'muted', icon: 'info' };
  }

  systemPillClass(meta: ISystemPillMeta): string {
    switch (meta.tone) {
      case 'jungle':   return 'bg-jungle-green/10 text-jungle-green border-jungle-green/20';
      case 'gold':     return 'bg-gold/20 border-gold/40';
      case 'trinidad': return 'bg-trinidad/10 text-trinidad border-trinidad/20';
      default:         return 'bg-cream/80 text-muted-text border-dark-text/10';
    }
  }

  /** Inline color for the gold tone (no built-in text utility). */
  systemPillStyle(meta: ISystemPillMeta): Record<string, string> | null {
    return meta.tone === 'gold' ? { color: '#b3760e' } : null;
  }

  // ---- Booking context strip ----

  bookingDateRange(b: IBooking): string {
    const start = new Date(b.dates.start);
    const end = new Date(b.dates.end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  }

  bookingStatusMeta(status: BookingStatus) {
    return STATUS_META[status];
  }

  // ---- Misc formatting ----

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  formatRelative(iso: string): string {
    const diff = this.nowMs - new Date(iso).getTime();
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
    return `${Math.round(diff / 86_400_000)}d`;
  }

  preview(t: IThread): string {
    const last = t.messages[t.messages.length - 1];
    if (!last) return 'No messages yet.';
    const prefix = last.author === 'system' ? '' : last.author === this.authorForCurrentUser(t) ? 'You: ' : '';
    return `${prefix}${last.body}`;
  }
}
