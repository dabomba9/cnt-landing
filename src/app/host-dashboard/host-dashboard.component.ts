import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { ListingCardComponent } from '../listing-card/listing-card.component';
import { SeoService } from '../seo.service';
import { AuthService, PublicUser } from '../auth/auth.service';
import { ToastService } from '../toast.service';
import { Listing } from '../search-results/mock-listings.data';
import { getMyListings, getHostStats, getPendingRequests, HostStats, HostRequest } from './mock-host-data';
import { StatTileComponent } from '../dashboard/widgets/stat-tile/stat-tile.component';

@Component({
  selector: 'cnt-host-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, NavbarComponent, FooterComponent, ListingCardComponent,
    StatTileComponent,
  ],
  templateUrl: './host-dashboard.component.html',
})
export class HostDashboardComponent implements OnInit, OnDestroy {
  user: PublicUser | null = null;
  listings: Listing[] = [];
  stats: HostStats = { earningsThisMonth: 0, earningsYearToDate: 0, upcomingNights: 0, occupancyRate: 0, averageRating: 0, totalReviews: 0 };
  requests: HostRequest[] = [];
  private viewSub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService,
    private router: Router,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Host dashboard — CurbNTurf',
      description: 'Manage your CurbNTurf listings, requests, and earnings.',
      url: '/host/dashboard',
      robots: 'noindex, nofollow',
    });
    this.user = this.auth.currentUser;
    if (this.user) {
      this.listings = getMyListings(this.user.email);
      this.stats = getHostStats(this.listings);
      this.requests = getPendingRequests(this.listings);
    }
    // Auto-flip view to host so the navbar/menu reflects it.
    if (this.auth.currentView !== 'host') this.auth.setView('host');
  }

  ngOnDestroy(): void { this.viewSub?.unsubscribe(); }

  get timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  formatRequestDates(req: HostRequest): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = new Date(req.startDate).toLocaleDateString('en-US', opts);
    const end = new Date(req.endDate).toLocaleDateString('en-US', opts);
    return `${start} – ${end}`;
  }

  formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
    return `${Math.round(diff / 86_400_000)}d ago`;
  }

  approveRequest(req: HostRequest): void {
    this.requests = this.requests.filter(r => r.id !== req.id);
    this.toasts.success(`Approved ${req.guestName}'s request.`);
  }

  declineRequest(req: HostRequest): void {
    this.requests = this.requests.filter(r => r.id !== req.id);
    this.toasts.info(`Declined ${req.guestName}'s request.`);
  }

  /** Toggle back to guest view. */
  switchToTraveling(): void {
    this.auth.setView('guest');
    this.router.navigate(['/dashboard']);
  }
}
