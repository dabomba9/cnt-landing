import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { gsap } from 'gsap';

@Component({
  standalone: true,
  imports: [RouterModule],
  selector: 'cnt-workspace-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'cnt-workspace';

  private cursorCleanup: (() => void) | null = null;
  private routerSub: Subscription | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
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
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    let ringX = 0, ringY = 0;
    let dotX = 0, dotY = 0;

    // Use xPercent/yPercent so GSAP centres the element on the cursor point
    gsap.set(dot,  { xPercent: -50, yPercent: -50 });
    gsap.set(ring, { xPercent: -50, yPercent: -50 });

    const onMouseMove = (e: MouseEvent) => {
      dotX = e.clientX;
      dotY = e.clientY;
      gsap.set(dot, { x: dotX, y: dotY });
    };

    const onMouseEnterHoverable = () => {
      document.body.classList.add('cursor-hover');
      gsap.to(ring, { scale: 1.6, backgroundColor: 'white', duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    };
    const onMouseLeaveHoverable = () => {
      document.body.classList.remove('cursor-hover');
      gsap.to(ring, { scale: 1, backgroundColor: 'transparent', duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    };

    const onMouseLeaveDoc = () => document.body.classList.add('cursor-hidden');
    const onMouseEnterDoc = () => document.body.classList.remove('cursor-hidden');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeaveDoc);
    document.addEventListener('mouseenter', onMouseEnterDoc);

    const bindHoverables = () => {
      const hoverables = document.querySelectorAll('a, button, [class*="cursor-pointer"], .magnetic-btn, .btn-3d-wrap');
      hoverables.forEach(el => {
        el.addEventListener('mouseenter', onMouseEnterHoverable);
        el.addEventListener('mouseleave', onMouseLeaveHoverable);
      });
      return hoverables;
    };

    let hoverables = bindHoverables();

    // Re-bind hoverables on route changes (new elements enter DOM)
    const mutationObserver = new MutationObserver(() => {
      hoverables.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnterHoverable);
        el.removeEventListener('mouseleave', onMouseLeaveHoverable);
      });
      hoverables = bindHoverables();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    const ticker = () => {
      ringX += (dotX - ringX) * 0.15;
      ringY += (dotY - ringY) * 0.15;
      gsap.set(ring, { x: ringX, y: ringY });
    };
    gsap.ticker.add(ticker);

    this.cursorCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeaveDoc);
      document.removeEventListener('mouseenter', onMouseEnterDoc);
      hoverables.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnterHoverable);
        el.removeEventListener('mouseleave', onMouseLeaveHoverable);
      });
      mutationObserver.disconnect();
      gsap.ticker.remove(ticker);
      document.body.classList.remove('cursor-hover', 'cursor-hidden');
    };
  }

  ngOnDestroy(): void {
    if (this.cursorCleanup) {
      this.cursorCleanup();
    }
    this.routerSub?.unsubscribe();
  }
}
