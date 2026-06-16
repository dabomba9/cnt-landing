import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';

import { ToastHostComponent, BottomNavComponent, CookieConsentComponent } from '@cnt-workspace/ui';
import { HostListingDraftService } from '@cnt-workspace/data-access';

@Component({
  standalone: true,
  imports: [RouterModule, ToastHostComponent, BottomNavComponent, CookieConsentComponent],
  selector: 'cnt-workspace-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'cnt-workspace';

  private cursorCleanup: (() => void) | null = null;
  private routerSub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    // Injected solely to force construction at app bootstrap. Its constructor
    // hydrates user-published listings from `cnt-published-snapshots` into
    // MOCK_LISTINGS — without this, landing directly on /search or /listing
    // skips hydration because those routes don't inject the service.
    _drafts: HostListingDraftService,
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initCustomCursor();
      this.initPageTransitions();
    }
  }

  private initPageTransitions(): void {
    // Animate the routed page component on every navigation
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      // Small delay so the new component is in the DOM
      requestAnimationFrame(() => {
        const outlet = document.querySelector('router-outlet + *') as HTMLElement;
        if (outlet) {
          gsap.fromTo(outlet,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out', clearProps: 'transform' }
          );
        }
      });
    });
  }

  private initCustomCursor(): void {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    const cursor = document.getElementById('cntCursor');
    if (!cursor) return;

    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.15, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.15, ease: 'power3.out' });

    type BaseState = 'default' | 'link' | 'text';
    let baseState: BaseState = 'default';
    let isDown = false;
    const setState = (s: string) => cursor.setAttribute('data-state', s);

    const onMove = (e: MouseEvent) => {
      const cs = getComputedStyle(cursor);
      const tipX = parseFloat(cs.getPropertyValue('--tip-x')) || 0;
      const tipY = parseFloat(cs.getPropertyValue('--tip-y')) || 0;
      xTo(e.clientX + tipX);
      yTo(e.clientY + tipY);
    };
    const onDown = () => { isDown = true; setState('grab'); };
    const onUp = () => { isDown = false; setState(baseState); };

    const TEXT_SEL = 'input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable=true], [contenteditable=""]';
    const LINK_SEL = 'a, button, [role=button], [class*="cursor-pointer"], .navigation-link, .cnt-nav-link, .magnetic-btn, .btn-3d-wrap, summary, label[for]';

    const onOver = (e: MouseEvent) => {
      if (isDown) return;
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest) return;
      if (t.closest(TEXT_SEL)) baseState = 'text';
      else if (t.closest(LINK_SEL)) baseState = 'link';
      else baseState = 'default';
      setState(baseState);
    };

    const onLeaveDoc = () => document.body.classList.add('cursor-hidden');
    const onEnterDoc = () => document.body.classList.remove('cursor-hidden');

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseleave', onLeaveDoc);
    document.addEventListener('mouseenter', onEnterDoc);

    this.cursorCleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseleave', onLeaveDoc);
      document.removeEventListener('mouseenter', onEnterDoc);
      document.body.classList.remove('cursor-hidden');
    };
  }

  ngOnDestroy(): void {
    if (this.cursorCleanup) {
      this.cursorCleanup();
    }
    this.routerSub?.unsubscribe();
  }
}
