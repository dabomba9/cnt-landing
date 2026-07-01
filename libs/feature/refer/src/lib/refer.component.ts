import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { AuthService, IPublicUser, SeoService, ToastService } from '@cnt-workspace/data-access';

const REFERRALS_KEY = 'cnt-referrals';

interface IReferral {
  email: string;
  referredAt: string;
  status: 'invited' | 'signed-up';
}

@Component({
  selector: 'cnt-refer',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './refer.component.html',
})
export class ReferComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);
  private seo = inject(SeoService);
  private toasts = inject(ToastService);

  user: IPublicUser | null = null;
  referrals: IReferral[] = [];
  inviteEmail = '';

  ngOnInit(): void {
    this.seo.update({
      title: 'Refer a friend — CurbNTurf',
      description: 'Share CurbNTurf with friends and earn $25 in credit per signup.',
      url: '/refer',
      robots: 'noindex, nofollow',
    });
    this.user = this.auth.currentUser;
    this.hydrate();
  }

  private hydrate(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(REFERRALS_KEY);
      const arr: IReferral[] = raw ? JSON.parse(raw) : [];
      this.referrals = Array.isArray(arr) ? arr : [];
    } catch { this.referrals = []; }
  }

  private persist(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(REFERRALS_KEY, JSON.stringify(this.referrals)); } catch { /* quota */ }
  }

  /** Short hash from email — deterministic, kept readable. */
  get referralCode(): string {
    if (!this.user) return '';
    const base = (this.user.firstName || this.user.email.split('@')[0] || 'friend').toLowerCase().replace(/[^a-z0-9]/g, '');
    let hash = 0;
    for (const c of this.user.email) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
    const tag = Math.abs(hash).toString(36).slice(0, 5);
    return `${base.slice(0, 8)}-${tag}`;
  }

  get shareUrl(): string {
    return `https://curbnturf.com/signup?ref=${this.referralCode}`;
  }

  get shareText(): string {
    return "I've been using CurbNTurf for RV stays on wineries, farms, and off-grid spots — sign up with my link and we both get $25 in credit.";
  }

  copyCode(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard?.writeText(this.referralCode).then(
      () => this.toasts.success('Code copied to clipboard.'),
      () => this.toasts.info('Copy failed — select and copy manually.'),
    );
  }

  copyLink(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard?.writeText(this.shareUrl).then(
      () => this.toasts.success('Link copied to clipboard.'),
      () => this.toasts.info('Copy failed — select and copy manually.'),
    );
  }

  get mailtoHref(): string {
    const subject = encodeURIComponent('Try CurbNTurf with me — $25 in credit');
    const body = encodeURIComponent(`${this.shareText}\n\n${this.shareUrl}`);
    return `mailto:?subject=${subject}&body=${body}`;
  }

  get twitterHref(): string {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.shareText)}&url=${encodeURIComponent(this.shareUrl)}`;
  }

  get facebookHref(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}`;
  }

  get whatsappHref(): string {
    return `https://wa.me/?text=${encodeURIComponent(this.shareText + ' ' + this.shareUrl)}`;
  }

  /** Mock "invite by email" — just records the invite locally. */
  sendInvite(): void {
    const email = this.inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.toasts.info('Enter a valid email.');
      return;
    }
    if (this.referrals.some(r => r.email === email)) {
      this.toasts.info('You already invited that email.');
      return;
    }
    this.referrals = [
      { email, referredAt: new Date().toISOString(), status: 'invited' },
      ...this.referrals,
    ];
    this.persist();
    this.inviteEmail = '';
    this.toasts.success(`Invite sent to ${email}.`);
  }

  get signedUpCount(): number {
    return this.referrals.filter(r => r.status === 'signed-up').length;
  }

  get pendingCount(): number {
    return this.referrals.filter(r => r.status === 'invited').length;
  }

  /** Credit they'd have if every signed-up friend redeemed — purely a mock figure. */
  get potentialCredit(): number {
    return this.signedUpCount * 25;
  }

  formatReferredAt(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  }
}
