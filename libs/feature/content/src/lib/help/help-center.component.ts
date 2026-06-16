import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent, AccordionCardComponent } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';

/** A topic group in the help center — a heading + a short blurb +
 *  N Q/A pairs that render as accordion cards. The accordion shape
 *  is the same one P4.1 already locked. */
interface IHelpTopic {
  id: string;
  label: string;
  icon: string;
  blurb: string;
  items: { q: string; a: string }[];
}

const HELP_TOPICS: IHelpTopic[] = [
  {
    id: 'booking',
    label: 'Booking',
    icon: 'event_available',
    blurb: 'How reservations work — from picking dates to checking out.',
    items: [
      { q: 'How do I book a stay?', a: 'Find a listing, pick your dates, choose your RV, and tap Reserve. Instant Book listings confirm immediately; others go to the host for approval within a few hours.' },
      { q: 'When am I charged?', a: 'Your card is authorized at the time of booking and charged once the host confirms (or immediately for Instant Book). The breakdown on the listing page shows everything up-front — no surprises at checkout.' },
      { q: 'Can I modify my booking?', a: 'Yes — open the booking in your /trips list and tap Modify. You can change dates, guest count, or add-ons up to check-in. Refunds follow the host\'s cancellation tier.' },
      { q: 'How do cancellation policies work?', a: 'Each host picks one of four tiers — Easy Goin\', Moderate, Strict, or Exclusive. The tier and exact dates appear right on the listing detail page and in the booking review.' },
      { q: 'What if I need to cancel close to check-in?', a: 'You can cancel from the booking confirmation page. Your refund depends on the host\'s policy tier and how close to check-in you are.' },
    ],
  },
  {
    id: 'hosting',
    label: 'Hosting',
    icon: 'home_work',
    blurb: 'Listing your land, managing the calendar, and getting paid.',
    items: [
      { q: 'How do I list my space?', a: 'Tap Become a host (or visit /hosting/new). The setup wizard walks you through location, photos, amenities, pricing, and house rules — usually under 15 minutes.' },
      { q: 'How do I block dates?', a: 'Open /hosting/calendar (bulk) or /hosting/listings/:id/calendar (single listing). Drag-select dates and choose Block. You can also import an iCal feed from Airbnb / VRBO so external bookings sync automatically.' },
      { q: 'Can I set seasonal pricing?', a: 'Yes. In the single-listing calendar, add Pricing tiers with a date range and nightly price. Per-day overrides on top of that take precedence.' },
      { q: 'How do payouts work?', a: 'Payouts are processed through our payment provider after each completed stay. Payment integration is in active development — your test bookings won\'t move real money yet.' },
      { q: 'How do I message a guest?', a: 'Every booking opens a thread in /inbox. From there you can approve, decline, and message right inline.' },
    ],
  },
  {
    id: 'trips',
    label: 'Trip planning',
    icon: 'route',
    blurb: 'Multi-stop trips, RV fit, and sharing with travel partners.',
    items: [
      { q: 'How do I plan a multi-stop trip?', a: 'From any listing or /search, tap Add to trip. Build the route in /trip-planner — drag to reorder stops, set per-stop dates, and the map shows the full route.' },
      { q: 'Can I share a trip with someone?', a: 'Yes. Open the trip and tap Share — you get a link that opens the route in read-only mode for friends or family.' },
      { q: 'How does RV fit checking work?', a: 'Add your RV in /account, then every listing card and detail page shows whether your rig fits the site (length, slide-outs, towing).' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: 'manage_accounts',
    blurb: 'Profile, RV, identity verification, notifications.',
    items: [
      { q: 'How do I add my RV?', a: 'Visit /account → My RV. You can save multiple profiles (class A, fifth wheel, van, etc.) and pick the active one per booking.' },
      { q: 'Why do I need identity verification?', a: 'For trust + safety. Verification keeps the marketplace healthy — hosts know who\'s coming, guests know hosts are real. The flow is in /account → Identity.' },
      { q: 'How do I manage notifications?', a: '/account → Notifications. You can opt into / out of new-booking alerts, message notifications, and host updates per channel.' },
      { q: 'Can I delete my account?', a: 'Yes. Contact us via /contact and we\'ll process the deletion within 30 days, per the privacy policy.' },
    ],
  },
  {
    id: 'trust',
    label: 'Trust & safety',
    icon: 'shield',
    blurb: 'Reviews, reports, and the dispute process.',
    items: [
      { q: 'When can I review a stay?', a: 'After the trip ends, your booking unlocks the review form. Reviews are released to the public after both sides have submitted (or 14 days, whichever comes first).' },
      { q: 'How do I report a listing or host?', a: 'Open the inbox thread or /contact and pick "Report an issue". We follow up within 48 hours.' },
      { q: 'What happens if there\'s a dispute?', a: 'If something goes wrong — incorrect listing, no-show, damage — we mediate between you and the host. Refunds are issued in CurbNTurf Cash or the original payment method depending on the case.' },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: 'accessibility_new',
    blurb: 'How we build for keyboard, screen-reader, and reduced-motion users.',
    items: [
      { q: 'Is CurbNTurf keyboard-navigable?', a: 'Yes. Every interactive surface — calendar cells, filter chips, booking widgets, the inbox — supports keyboard reach with visible focus rings and Enter/Space activation.' },
      { q: 'Does CurbNTurf respect reduced motion?', a: 'Yes. When the OS reports prefers-reduced-motion, decorative scroll animations and entry transitions are skipped or shortened so motion-sensitive users get a static experience.' },
      { q: 'Are listing photos screen-reader friendly?', a: 'Every image carries meaningful alt text. Decorative imagery uses alt="" per WCAG.' },
      { q: 'Where can I report an accessibility issue?', a: 'Email us via /contact with "Accessibility" in the subject. We treat a11y bugs as P0.' },
    ],
  },
];

@Component({
  selector: 'cnt-help-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, AccordionCardComponent],
  template: `
    <cnt-navbar></cnt-navbar>

    <main id="main-content" tabindex="-1" class="pt-24 md:pt-28 pb-24 md:pb-0 min-h-screen bg-cream bg-grid-subtle">
      <section class="px-[2%] pt-8">
        <div class="max-w-[72rem] mx-auto px-4 md:px-8">
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.65rem] font-bold block mb-2">Help center</span>
          <h1 class="font-headline font-bold text-dark-text tracking-tight leading-tight text-3xl md:text-4xl">How can we help?</h1>
          <p class="text-base md:text-lg text-muted-text font-body mt-3 max-w-2xl">Find answers about booking, hosting, your account, and how the marketplace works. Can't find it here? <a routerLink="/contact" class="text-trinidad font-bold hover:underline">Drop us a note</a>.</p>

          <!-- Search filter -->
          <label class="block relative mt-8 mb-10">
            <span class="sr-only">Search help articles</span>
            <span class="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-text" aria-hidden="true">search</span>
            <input type="search" [(ngModel)]="query" (ngModelChange)="onQueryChange()"
              placeholder="Search help articles…"
              class="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-dark-text/10 text-base font-body text-dark-text focus:outline-none focus:border-trinidad transition-colors">
            @if (query) {
              <button type="button" (click)="clearQuery()"
                class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-cream/80"
                aria-label="Clear search">
                <span class="material-symbols-outlined text-muted-text">close</span>
              </button>
            }
          </label>

          <!-- Topic chip rail (jumps to section) -->
          @if (!query) {
            <nav aria-label="Help sections" class="flex flex-wrap gap-2 mb-10">
              @for (topic of topics; track topic.id) {
                <a [href]="'#' + topic.id"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-dark-text/10 text-xs font-button uppercase tracking-[0.12em] font-bold text-dark-text hover:border-trinidad hover:text-trinidad transition-colors">
                  <span class="material-symbols-outlined text-base" aria-hidden="true">{{ topic.icon }}</span>
                  {{ topic.label }}
                </a>
              }
            </nav>
          }

          <!-- Sections -->
          @if (visibleTopics.length === 0) {
            <div class="bg-white rounded-2xl border border-dark-text/10 px-6 py-10 text-center">
              <span class="material-symbols-outlined text-3xl text-muted-text" aria-hidden="true">search_off</span>
              <p class="text-base font-body text-dark-text mt-3">No results for "{{ query }}".</p>
              <p class="text-sm text-muted-text font-body mt-1">Try a different keyword, or <a routerLink="/contact" class="text-trinidad font-bold hover:underline">contact us</a>.</p>
            </div>
          }

          @for (topic of visibleTopics; track topic.id) {
            <section [id]="topic.id" class="scroll-mt-32 mb-12">
              <div class="flex items-center gap-3 mb-4">
                <span class="w-12 h-12 rounded-full bg-trinidad/10 inline-flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-trinidad" style="font-variation-settings: 'FILL' 1;" aria-hidden="true">{{ topic.icon }}</span>
                </span>
                <div class="min-w-0">
                  <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight">{{ topic.label }}</h2>
                  <p class="text-sm text-muted-text font-body mt-0.5">{{ topic.blurb }}</p>
                </div>
              </div>
              <div class="space-y-2">
                @for (item of topic.items; track item.q) {
                  <cnt-accordion-card [title]="item.q">
                    <p class="text-sm md:text-base font-body text-dark-text leading-relaxed">{{ item.a }}</p>
                  </cnt-accordion-card>
                }
              </div>
            </section>
          }

          <!-- Still stuck CTA -->
          <div class="mt-12 rounded-2xl bg-jungle-green text-white px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div>
              <h2 class="font-headline font-bold text-2xl md:text-3xl tracking-tight">Still stuck?</h2>
              <p class="text-base text-white/85 font-body mt-1">Our support team usually replies within a few hours.</p>
            </div>
            <a routerLink="/contact"
              class="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-jungle-green text-xs uppercase tracking-[0.14em] font-button font-bold hover:bg-cream transition-colors no-underline">
              <span class="material-symbols-outlined text-base">forum</span>
              Contact support
            </a>
          </div>
        </div>
      </section>
    </main>

    <curbnturf-footer></curbnturf-footer>
  `,
})
export class HelpCenterComponent implements OnInit {
  readonly topics = HELP_TOPICS;
  query = '';
  /** Filtered set — updated on every query change so the template
   *  doesn't recompute on every change-detection tick. */
  visibleTopics = HELP_TOPICS;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Help center | CurbNTurf',
      description: 'Find answers about booking, hosting, your account, trust & safety, and accessibility on the CurbNTurf RV marketplace.',
      url: '/help',
    });
    if (!isPlatformBrowser(this.platformId)) return;
  }

  onQueryChange(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) { this.visibleTopics = this.topics; return; }
    this.visibleTopics = this.topics
      .map(t => ({
        ...t,
        items: t.items.filter(i =>
          i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q),
        ),
      }))
      .filter(t => t.items.length > 0);
  }

  clearQuery(): void {
    this.query = '';
    this.onQueryChange();
  }
}
