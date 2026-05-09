import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { AuthService, PublicUser } from '../auth/auth.service';
import { SeoService } from '../seo.service';
import { MessageService } from '../messaging/message.service';
import { Thread, MessageAuthor } from '../messaging/message.types';

@Component({
  selector: 'cnt-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.scss'],
})
export class InboxComponent implements OnInit, OnDestroy, AfterViewChecked {
  user: PublicUser | null = null;
  threads: Thread[] = [];
  activeThreadId: string | null = null;
  composeBody = '';
  private subs: Subscription[] = [];
  private shouldScroll = false;

  @ViewChild('thread') threadEl?: ElementRef<HTMLDivElement>;

  constructor(
    private auth: AuthService,
    private msg: MessageService,
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
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScroll) return;
    const el = this.threadEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
    this.shouldScroll = false;
  }

  ngOnDestroy(): void {
    for (const s of this.subs) s.unsubscribe();
  }

  private refreshThreads(): void {
    if (!this.user) return;
    this.threads = this.msg.threadsForUser(this.user.email);
    if (this.activeThreadId && this.user) {
      this.msg.markRead(this.activeThreadId, this.user.email);
    }
  }

  get activeThread(): Thread | null {
    if (!this.activeThreadId) return null;
    return this.threads.find(t => t.id === this.activeThreadId) ?? null;
  }

  /** Author label for the *current user* writing in this thread. */
  authorForCurrentUser(t: Thread): MessageAuthor | null {
    if (!this.user) return null;
    if (t.guestEmail === this.user.email) return 'guest';
    if (t.hostEmail === this.user.email) return 'host';
    return null;
  }

  /** Display name of the counter-party (the other participant). */
  counterpartyName(t: Thread): string {
    const me = this.authorForCurrentUser(t);
    if (me === 'guest') return t.hostName;
    if (me === 'host') return t.guestName;
    return t.hostName;
  }

  counterpartyInitials(t: Thread): string {
    const me = this.authorForCurrentUser(t);
    if (me === 'guest') return t.hostInitials;
    if (me === 'host') return t.guestInitials;
    return t.hostInitials;
  }

  unreadCount(t: Thread): number {
    if (!this.user) return 0;
    return this.msg.isUnread(t, this.user.email) ? 1 : 0;
  }

  selectThread(t: Thread): void {
    this.router.navigate(['/inbox', t.id]);
  }

  back(): void {
    this.router.navigate(['/inbox']);
  }

  send(): void {
    const t = this.activeThread;
    if (!t || !this.user) return;
    const author = this.authorForCurrentUser(t);
    if (!author) return;
    const body = this.composeBody.trim();
    if (!body) return;
    this.msg.sendMessage(t.id, author, body);
    this.composeBody = '';
    this.shouldScroll = true;
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
    return `${Math.round(diff / 86_400_000)}d`;
  }

  preview(t: Thread): string {
    const last = t.messages[t.messages.length - 1];
    if (!last) return 'No messages yet.';
    const prefix = last.author === 'system' ? '' : last.author === this.authorForCurrentUser(t) ? 'You: ' : '';
    return `${prefix}${last.body}`;
  }
}
