import { Component, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';

@Component({
  selector: 'cnt-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, CinematicRollDirective],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  isNavbarVisible = true;
  private lastScrollY = 0;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  toggleMobileNav(): void {
    const navMenu = document.querySelector('.nav-menu');
    navMenu?.classList.toggle('is-open');
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    this.isNavbarVisible = !(currentScrollY > this.lastScrollY && currentScrollY > 100);
    this.lastScrollY = currentScrollY;
  }
}
