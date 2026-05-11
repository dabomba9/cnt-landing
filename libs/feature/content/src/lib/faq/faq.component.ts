import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { CinematicRollDirective } from '@cnt-workspace/ui';
import { MagneticBtnDirective } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

export type FaqCategory = 'guests' | 'hosts' | 'general';

export interface FaqItem {
  id: number;
  category: FaqCategory;
  q: string;
  a: string;
}

export const FAQ_CATEGORIES: { id: FaqCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all',     label: 'All',         icon: 'all_inclusive' },
  { id: 'guests',  label: 'For Guests',  icon: 'rv_hookup' },
  { id: 'hosts',   label: 'For Hosts',   icon: 'home_work' },
  { id: 'general', label: 'General',     icon: 'info' },
];

const FAQS: FaqItem[] = [
  // ===== Guests =====
  { id: 1, category: 'guests', q: 'How do I book an RV spot?',
    a: 'Find a stay you love, pick your dates, and tap "Reserve". Your host approves or rejects within 2 hours when instant bookings is not enabled. Once confirmed you\'ll get arrival details and the host\'s contact info, and CurbNTurf processes payment from there.' },
  { id: 2, category: 'guests', q: 'Are there any membership fees?',
    a: 'No. CurbNTurf is free to browse, free to book, and free to favorite stays. You only pay the host\'s nightly rate plus the platform\'s fees as listed on the listing page.' },
  { id: 3, category: 'guests', q: 'What\'s your cancellation policy?',
    a: 'Each host picks one of four tiers — Easy Goin\' (free cancellation up to 1 day before check-in), Moderate (free up to 3 days before, half refund for early check-outs falling within 24h of cancellation), Strict (half refund up to 7 days before, no refund for early check-outs), or Exclusive (non-refundable). Refunds are issued as CurbNTurf Cash. See the full policy on our <a href="/terms">Terms page</a>.' },
  { id: 4, category: 'guests', q: 'How do I know what hookups and amenities a site has?',
    a: 'Every listing shows the full amenity list — electricity, sewage, dump station, Wi-Fi, pets allowed, campfires, and more. Filter the search page by the exact amenities you need before browsing.' },
  { id: 5, category: 'guests', q: 'Can I bring my pet?',
    a: 'Many of our hosts welcome pets — filter by "Pets Allowed" in search. Always check the individual listing rules; some hosts limit number of pets, breeds, or have working farm animals on site.' },
  { id: 6, category: 'guests', q: 'What if my RV won\'t fit?',
    a: 'Use the "My RV" filter to enter your length, height, and width. Listings that can\'t accommodate your rig are automatically excluded. If you\'re unsure, message the host before booking.' },
  { id: 7, category: 'guests', q: 'What is CurbNTurf Cash?',
    a: 'CurbNTurf Cash is a balance attached to your account. It\'s earned by leaving honest reviews after a stay, or as the way refunds are issued. It\'s automatically used as your first payment method on your next reservation. You can also withdraw it as US dollars (1 CurbNTurf Cash = $1) — withdrawals are subject to a $5 processing fee.' },
  { id: 8, category: 'guests', q: 'Do I need liability insurance to book?',
    a: 'Yes. Per our <a href="/terms">Guest Agreement</a>, guests maintain liability insurance on all vehicles (including ATVs, boats, and trailers) and carry proof of insurance in those vehicles when staying at a host\'s property.' },

  // ===== Hosts =====
  { id: 10, category: 'hosts', q: 'How much do hosts earn per booking?',
    a: 'CurbNTurf adds the following surcharges to your take-home price per site per night: (1) the greater of a $5 fee or 15% commission, and (2) a $5 CurbNTurf Cash Guest Incentive. Once a stay completes, your host share is deposited into your Account Balance. There are no setup fees and no listing fees. Full breakdown in our <a href="/terms">Terms</a>.' },
  { id: 11, category: 'hosts', q: 'How does the host payout work?',
    a: 'Your Account Balance accumulates as guests complete bookings. We process payouts the first business day of each month via mailed checks — please allow 5–7 business days for delivery. There is no minimum payout threshold and no fees on the check-based payout system. If your annual withdrawals reach the IRS <a href="https://www.irs.gov/forms-pubs/about-form-1099-misc" target="_blank" rel="noopener">1099-MISC</a> reporting threshold, we\'ll prompt you to upload a <a href="https://www.irs.gov/forms-pubs/about-form-w-9" target="_blank" rel="noopener">W-9</a>.' },
  { id: 12, category: 'hosts', q: 'Will direct deposit or electronic payouts be available?',
    a: 'We\'re exploring direct deposit and immediate-payout options. Future electronic payment methods may incur small processing fees. Updates to the payout system will be communicated through our website and email notifications.' },
  { id: 13, category: 'hosts', q: 'How fast do I need to respond to a booking request?',
    a: 'Within 2 hours, per the <a href="/terms">Host Agreement</a>, unless you\'ve enabled Instant Bookings. Quick responses keep guests booking — slow responses lose them.' },
  { id: 14, category: 'hosts', q: 'Why does communication need to stay on the platform?',
    a: 'Per the <a href="/terms">Host Agreement</a>, moving guest communication off the secure CurbNTurf channel triggers a penalty fee calculated as three nights × the greater of 15% of your historic base site rate or $5. Keep messaging on-platform to avoid the fee and keep both sides protected.' },
  { id: 15, category: 'hosts', q: 'Do I need insurance to host?',
    a: 'Yes. For non-commercial use (charging $0), homeowner\'s insurance typically covers associated risks and liabilities. When earning consistent income, obtain commercial insurance. CurbNTurf offers a $1 million liability insurance policy at an average cost of approximately $560 per year, which covers multiple glamping sites on a single property. Per the <a href="/terms">Host Agreement</a>, hosts maintain property and/or commercial insurance on all listed sites.' },
  { id: 16, category: 'hosts', q: 'How should I handle my neighbors?',
    a: 'Consider how visible your hosted RVs will be to neighboring properties. If they\'ll be close and visible, ask your neighbor first — let them know friends may be staying in RVs on your property, and emphasize they can reach you immediately about any concerns. Maintaining good neighbor relations is a priority for both you and CurbNTurf.' },
  { id: 17, category: 'hosts', q: 'Do I need to contact my city or check zoning before listing?',
    a: 'Yes — research your local zoning and ordinance laws first. Determine what\'s permitted for friends visiting in RVs, including duration limits and annual day restrictions. Then assess your comfort level with semi-commercial use. Operations are similar to Airbnb — generally you can proceed until your local government defines specific regulations.' },
  { id: 18, category: 'hosts', q: 'How do taxes work for hosts?',
    a: 'Two taxes typically apply: (1) income tax — personal or business taxes split between the <a href="https://www.irs.gov" target="_blank" rel="noopener">IRS</a> and your State, and (2) sales tax — added at the point of sale. Contact <a href="https://www.taxadmin.org/state-tax-agencies" target="_blank" rel="noopener">your State Department overseeing Sales Tax</a> and describe the activity as an "Airbnb-like shared economy overnight campsite stay transaction" for guidance on licensing requirements. Per the <a href="/terms">Host Agreement</a>, hosts are responsible for any related sales tax.' },
  { id: 19, category: 'hosts', q: 'Can I host on my farm or vineyard?',
    a: 'Absolutely — agritourism stays are some of the most popular on CurbNTurf. Working farms, ranches, breweries, and vineyards consistently rank as guest favorites.' },
  { id: 20, category: 'hosts', q: 'What\'s the Grow Program?',
    a: 'Grow is our referral program for invited members. After you refer a new host who lists a site and a guest completes a stay, you receive 3% of every reservation on that property for the lifetime of the published listing. (That\'s 20% of CurbNTurf\'s standard 15% commission.) Eligibility is by invitation; CurbNTurf reserves the right to terminate participation at any time. Full program terms in our <a href="/terms">Terms</a>.' },
  { id: 21, category: 'hosts', q: 'How does Boondocking work?',
    a: 'Boondocking listings accept donations rather than fixed nightly rates. Donations on virtual Boondocking bookings are split 50/50 between the listing caretaker and CurbNTurf. The caretaker receives their portion as CurbNTurf Cash. See the Boondocking section in our <a href="/terms">Terms</a>.' },

  // ===== General =====
  { id: 20, category: 'general', q: 'What is CurbNTurf?',
    a: 'CurbNTurf is a marketplace connecting RVers with private landowners — farms, vineyards, ranches, breweries, and unique destinations — for direct, no-membership-fee stays. We\'re reimagining RV travel as the freedom experience it was meant to be.' },
  { id: 21, category: 'general', q: 'How is this different from Harvest Hosts or Hipcamp?',
    a: 'No annual membership fees. Hosts set their own rates and policies. Stays range from quick overnighters to multi-week adventures. Built specifically for RVers — every filter, listing, and tool is tailored to rig requirements and the way RVers actually travel.' },
  { id: 22, category: 'general', q: 'How do I contact support?',
    a: 'Call our customer service team at <a href="tel:+18008775005">(800) 877-5005</a>, Monday – Friday, 9 am – 5 pm MST. You can also send a message through our <a href="/contact">Contact page</a> any time and we\'ll get back to you as soon as we can.' },
  { id: 23, category: 'general', q: 'Where is CurbNTurf based?',
    a: 'Our corporate office is at 6150 Little Willow Rd, Payette, ID 83661, USA. The marketplace is currently focused on the United States.' },
  { id: 24, category: 'general', q: 'How do you handle my data?',
    a: 'All data we collect about you is used exclusively by CurbNTurf to provide and market its service — we don\'t share, sell, or distribute it externally for unrelated activities. You can request deletion at any time through our <a href="/contact">Contact page</a>. See our <a href="/privacy">Privacy Policy</a> for full details.' },
  { id: 25, category: 'general', q: 'Where can I read the full terms?',
    a: 'Our <a href="/terms">Terms &amp; Conditions</a> page covers the Guest Agreement, Host Agreement, CurbNTurf Cash &amp; Account Balance, Pricing/Payouts/Fees, the Cancellation Policy, and the Grow Program — each section dated independently. Our <a href="/privacy">Privacy Policy</a> and <a href="/cookies">Cookies Policy</a> are linked from the footer.' },
];

@Component({
  selector: 'cnt-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, CinematicRollDirective, MagneticBtnDirective],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
})
export class FaqComponent implements OnInit, AfterViewInit {
  FAQ_CATEGORIES = FAQ_CATEGORIES;
  selectedCategory: FaqCategory | 'all' = 'all';
  searchQuery = '';
  openIds = new Set<number>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
    private router: Router,
  ) {}

  /** Intercept clicks inside answer HTML so internal href="/foo" routes via Angular Router instead of full reload. External links pass through. */
  handleAnswerClick(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    if (/^(https?:|mailto:|tel:)/.test(href)) return;
    if (href.startsWith('/')) {
      event.preventDefault();
      this.router.navigateByUrl(href);
    }
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'FAQ — CurbNTurf | Frequently Asked Questions',
      description: 'Answers about booking RV stays, hosting your land, payments, the Host Guarantee, and how CurbNTurf works for guests and hosts.',
      url: '/faq',
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    gsap.from('.faq-hero-content > *', {
      y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08,
    });
    gsap.from('.faq-tabs', { y: 12, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.3 });
    gsap.fromTo('.faq-item',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.04, delay: 0.4 }
    );
    // Magnetic-button behavior now handled by MagneticBtnDirective
  }

  get filteredFaqs(): FaqItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    return FAQS.filter(item => {
      if (this.selectedCategory !== 'all' && item.category !== this.selectedCategory) return false;
      if (!q) return true;
      return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
    });
  }

  selectCategory(cat: FaqCategory | 'all'): void {
    this.selectedCategory = cat;
  }

  toggleItem(id: number): void {
    if (this.openIds.has(id)) this.openIds.delete(id);
    else this.openIds.add(id);
  }

  isOpen(id: number): boolean {
    return this.openIds.has(id);
  }

  expandAll(): void {
    this.openIds = new Set(this.filteredFaqs.map(f => f.id));
  }

  collapseAll(): void {
    this.openIds = new Set();
  }

}
