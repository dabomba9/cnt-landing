import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { NavbarComponent, FooterComponent, ResumeDraftCardComponent } from '@cnt-workspace/ui';
import {
  SeoService, AuthService, BookingService, ToastService,
  IPrivateListing, getMyListings, getHostBookings, HostListingMetaService,
} from '@cnt-workspace/data-access';
import { IBooking } from '@cnt-workspace/models';

interface IRowModel {
  listing: IPrivateListing;
  paused: boolean;
  archived: boolean;
  upcomingCount: number;
  monthEarnings: number;
}

@Component({
  selector: 'cnt-hosting-listings',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, ResumeDraftCardComponent],
  templateUrl: './hosting-listings.component.html',
})
export class HostingListingsComponent implements OnInit, OnDestroy {
  rows: IRowModel[] = [];
  showArchived = false;
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private bookings: BookingService,
    private meta: HostListingMetaService,
    private router: Router,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Manage listings — CurbNTurf',
      description: 'Edit, pause, and archive your CurbNTurf listings.',
      url: '/hosting/listings',
      robots: 'noindex, nofollow',
    });
    const user = this.auth.currentUser;
    if (!user) return;
    const myListings = getMyListings(user.email);
    this.subs.push(
      combineLatest([this.bookings.bookings$, this.meta.meta$]).subscribe(([allBookings, metaMap]) => {
        const hostBookings = getHostBookings(user.email, allBookings);
        const now = Date.now();
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        this.rows = myListings.map(l => {
          const m = metaMap[l.id] || { paused: false, archived: false };
          const upcoming = hostBookings.filter(b =>
            b.listingId === l.id
            && (b.status === 'approved' || b.status === 'confirmed')
            && new Date(b.dates.end).getTime() >= now
          ).length;
          const earnings = hostBookings
            .filter(b =>
              b.listingId === l.id
              && (b.status === 'approved' || b.status === 'confirmed')
              && new Date(b.createdAt).getTime() >= monthStart.getTime()
            )
            .reduce((sum, b) => sum + (b.total || 0), 0);
          return { listing: l, paused: m.paused, archived: m.archived, upcomingCount: upcoming, monthEarnings: earnings };
        });
      }),
    );
  }

  ngOnDestroy(): void { for (const s of this.subs) s.unsubscribe(); }

  get visibleRows(): IRowModel[] {
    return this.showArchived ? this.rows : this.rows.filter(r => !r.archived);
  }

  get archivedCount(): number {
    return this.rows.filter(r => r.archived).length;
  }

  togglePaused(row: IRowModel): void {
    const next = !row.paused;
    this.meta.setPaused(row.listing.id, next);
    this.toasts.info(next ? `${row.listing.title} paused.` : `${row.listing.title} is live again.`);
  }

  toggleArchived(row: IRowModel): void {
    const next = !row.archived;
    this.meta.setArchived(row.listing.id, next);
    this.toasts.info(next ? `${row.listing.title} archived.` : `${row.listing.title} restored.`);
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }

  statusLabel(row: IRowModel): { label: string; tone: 'live' | 'paused' | 'archived' } {
    if (row.archived) return { label: 'Archived', tone: 'archived' };
    if (row.paused) return { label: 'Paused', tone: 'paused' };
    return { label: 'Live', tone: 'live' };
  }

  editPath(listingId: number): unknown[] { return ['/hosting/listings', listingId, 'edit']; }
  editQuery(_listingId: number) { return {}; }
}
