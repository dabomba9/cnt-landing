import { Component, ElementRef, HostListener, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';
import { AuthService, IPublicUser, AppView } from '@cnt-workspace/data-access';
import { ToastService } from '@cnt-workspace/data-access';
import { MessageService } from '@cnt-workspace/data-access';
import { NotificationService, INotification } from '@cnt-workspace/data-access';
import { readFavorites, hasOwnedListings } from '@cnt-workspace/data-access';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cnt-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, CinematicRollDirective],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private platformId = inject<Object>(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private toasts = inject(ToastService);
  private msg = inject(MessageService);
  private notifSvc = inject(NotificationService);

  isNavbarVisible = true;
  mobileNavOpen = false;
  userMenuOpen = false;
  scrolled = false;
  isHome = false;
  searchQuery = '';
  favoritesCount = 0;
  unreadMessages = 0;
  user: IPublicUser | null = null;
  view: AppView = 'guest';
  /** True when the signed-in user owns at least one listing — drives
   *  the navbar Hosting-calendar shortcut on the user dropdown. */
  hasOwned = false;

  /** Notifications dropdown. */
  notificationsOpen = false;
  notifications: INotification[] = [];
  unreadNotifications = 0;

  private lastScrollY = 0;
  private unreadSub: Subscription | null = null;
  private notifSub: Subscription | null = null;
  private readonly TRANSPARENT_THRESHOLD = 80;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('userMenuWrapper') userMenuWrapper?: ElementRef<HTMLDivElement>;
  @ViewChild('notificationsWrapper') notificationsWrapper?: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    this.isHome = this.router.url === '/' || this.router.url.startsWith('/?');
    this.hydrateFavoritesCount();
    this.auth.currentUser$.subscribe(u => {
      this.user = u;
      this.hasOwned = !!u && hasOwnedListings(u.email);
      this.unreadSub?.unsubscribe();
      this.unreadSub = null;
      this.unreadMessages = 0;
      if (u) {
        this.unreadSub = this.msg.unreadFor$(u.email).subscribe(n => (this.unreadMessages = n));
      }
    });
    this.auth.currentView$.subscribe(v => (this.view = v));
    this.notifSub = this.notifSvc.notifications$.subscribe(list => {
      this.notifications = list;
      this.unreadNotifications = list.filter(n => !n.read).length;
    });
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.isHome = e.urlAfterRedirects === '/' || e.urlAfterRedirects.startsWith('/?');
        this.mobileNavOpen = false;
        this.userMenuOpen = false;
        this.notificationsOpen = false;
        this.hydrateFavoritesCount();
      });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.notifSub?.unsubscribe();
  }

  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; this.notificationsOpen = false; }
  closeUserMenu(): void { this.userMenuOpen = false; }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    this.userMenuOpen = false;
  }
  closeNotifications(): void { this.notificationsOpen = false; }

  onNotificationClick(n: INotification): void {
    this.notifSvc.markRead(n.id);
    this.notificationsOpen = false;
    this.router.navigateByUrl(n.routerLink);
  }

  markAllNotificationsRead(): void {
    this.notifSvc.markAllRead(this.notifications);
  }

  /** Tailwind text-* color class for a notification icon based on its tone. */
  notifIconClass(n: INotification): string {
    switch (n.tone) {
      case 'trinidad': return 'text-trinidad bg-trinidad/10';
      case 'jungle':   return 'text-jungle-green bg-jungle-green/10';
      case 'gold':     return 'bg-gold/20';
      default:         return 'text-muted-text bg-cream/60';
    }
  }

  notifIconStyle(n: INotification): Record<string, string> | null {
    // Inline color for the gold tone — the brand gold doesn't have a built-in text utility.
    return n.tone === 'gold' ? { color: '#b3760e' } : null;
  }

  notifTimeLabel(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'just now';
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
    if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`;
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return ''; }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.userMenuOpen = false;
    this.toasts.info('Signed out.');
    this.router.navigate(['/']);
  }

  switchView(): void {
    const next: AppView = this.view === 'host' ? 'guest' : 'host';
    this.auth.setView(next);
    this.userMenuOpen = false;
    this.router.navigate([next === 'host' ? '/hosting' : '/dashboard']);
  }

  get userInitials(): string {
    if (!this.user) return '';
    const f = this.user.firstName?.[0] || '';
    const l = this.user.lastName?.[0] || '';
    return (f + l).toUpperCase();
  }

  get verifiedSinceLabel(): string {
    if (!this.user?.verifiedAt) return '';
    try {
      const d = new Date(this.user.verifiedAt);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
    } catch {
      return '';
    }
  }

  /** True when the navbar should render its translucent over-hero state. */
  get transparent(): boolean {
    return this.isHome && !this.scrolled;
  }

  toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    const queryParams = q ? { dest: q } : {};
    this.router.navigate(['/search'], { queryParams });
    this.searchQuery = '';
    this.searchInput?.nativeElement.blur();
  }

  private hydrateFavoritesCount(): void {
    this.favoritesCount = readFavorites(this.platformId).length;
  }

  @HostListener('window:storage')
  onStorage(): void {
    this.hydrateFavoritesCount();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    this.scrolled = currentScrollY > this.TRANSPARENT_THRESHOLD;
    this.isNavbarVisible = !(currentScrollY > this.lastScrollY && currentScrollY > 100);
    this.lastScrollY = currentScrollY;
  }

  /** Close any open popovers when clicking outside their wrappers. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.userMenuOpen) {
      const w = this.userMenuWrapper?.nativeElement;
      if (w && !w.contains(event.target as Node)) this.userMenuOpen = false;
    }
    if (this.notificationsOpen) {
      const w = this.notificationsWrapper?.nativeElement;
      if (w && !w.contains(event.target as Node)) this.notificationsOpen = false;
    }
  }

  /** Close on Escape too. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.userMenuOpen) this.userMenuOpen = false;
    if (this.notificationsOpen) this.notificationsOpen = false;
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    if (e.key !== '/') return;
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const tag = t.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || t.isContentEditable) return;
    e.preventDefault();
    this.searchInput?.nativeElement.focus();
  }
}
