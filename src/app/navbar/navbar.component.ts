import { Component, ElementRef, HostListener, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';

@Component({
  selector: 'cnt-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, CinematicRollDirective],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit {
  isNavbarVisible = true;
  mobileNavOpen = false;
  scrolled = false;
  isHome = false;
  searchQuery = '';
  favoritesCount = 0;
  private lastScrollY = 0;
  private readonly TRANSPARENT_THRESHOLD = 80;
  private readonly FAV_KEY = 'cnt-favorites';

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private router: Router) {}

  ngOnInit(): void {
    this.isHome = this.router.url === '/' || this.router.url.startsWith('/?');
    this.hydrateFavoritesCount();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.isHome = e.urlAfterRedirects === '/' || e.urlAfterRedirects.startsWith('/?');
        this.mobileNavOpen = false;
        this.hydrateFavoritesCount();
      });
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
    if (!q) return;
    this.router.navigate(['/search'], { queryParams: { dest: q } });
    this.searchQuery = '';
    this.searchInput?.nativeElement.blur();
  }

  private hydrateFavoritesCount(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(this.FAV_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      this.favoritesCount = Array.isArray(arr) ? arr.length : 0;
    } catch {
      this.favoritesCount = 0;
    }
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
