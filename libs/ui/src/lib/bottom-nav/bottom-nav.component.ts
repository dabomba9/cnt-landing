import { Component, OnDestroy, OnInit } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, AppView, IPublicUser, MessageService } from '@cnt-workspace/data-access';

interface INavSlot {
  label: string;
  icon: string;
  routerLink: string;
  fragment?: string;
  /** When true, render with the unread-messages badge. */
  isMessages?: boolean;
}

const GUEST_SLOTS: INavSlot[] = [
  { label: 'Explore',   icon: 'explore',   routerLink: '/search' },
  { label: 'Favorites', icon: 'favorite',  routerLink: '/wishlists' },
  { label: 'Trips',     icon: 'luggage',   routerLink: '/trips' },
  { label: 'Inbox',     icon: 'forum',     routerLink: '/inbox', isMessages: true },
  { label: 'Account',   icon: 'person',    routerLink: '/account' },
];

const HOST_SLOTS: INavSlot[] = [
  { label: 'Hosting',   icon: 'dashboard', routerLink: '/hosting' },
  { label: 'Listings',  icon: 'storefront', routerLink: '/hosting/listings' },
  { label: 'Inbox',     icon: 'forum',     routerLink: '/inbox', isMessages: true },
  { label: 'Earnings',  icon: 'payments',  routerLink: '/hosting', fragment: 'earnings' },
  { label: 'Account',   icon: 'person',    routerLink: '/account' },
];

@Component({
  selector: 'cnt-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (user) {
      <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-dark-text/8 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
        style="padding-bottom: env(safe-area-inset-bottom, 0);">
        <ul class="grid grid-cols-5">
          @for (slot of slots; track slot.label) {
            <li class="min-w-0">
              <a [routerLink]="slot.routerLink" [fragment]="slot.fragment || undefined"
                routerLinkActive="text-trinidad"
                [routerLinkActiveOptions]="{ exact: false }"
                class="relative flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 text-muted-text hover:text-dark-text transition-colors min-h-[44px]">
                <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 0;">{{ slot.icon }}</span>
                <span class="text-[0.6rem] uppercase tracking-[0.1em] font-button font-bold leading-none">{{ slot.label }}</span>
                @if (slot.isMessages && unreadCount > 0) {
                  <span class="absolute top-1 right-1/2 translate-x-[14px] inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-trinidad text-white text-[0.55rem] font-button font-bold leading-none">
                    {{ unreadCount > 9 ? '9+' : unreadCount }}
                  </span>
                }
              </a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
})
export class BottomNavComponent implements OnInit, OnDestroy {
  user: IPublicUser | null = null;
  view: AppView = 'guest';
  unreadCount = 0;
  private subs: Subscription[] = [];
  private unreadSub: Subscription | null = null;

  constructor(private auth: AuthService, private msg: MessageService) {}

  ngOnInit(): void {
    this.subs.push(this.auth.currentUser$.subscribe(u => {
      this.user = u;
      this.unreadSub?.unsubscribe();
      this.unreadSub = null;
      this.unreadCount = 0;
      if (u) {
        this.unreadSub = this.msg.unreadFor$(u.email).subscribe(n => (this.unreadCount = n));
      }
    }));
    this.subs.push(this.auth.currentView$.subscribe(v => (this.view = v)));
  }

  ngOnDestroy(): void {
    for (const s of this.subs) s.unsubscribe();
    this.unreadSub?.unsubscribe();
  }

  get slots(): INavSlot[] {
    return this.view === 'host' ? HOST_SLOTS : GUEST_SLOTS;
  }
}
