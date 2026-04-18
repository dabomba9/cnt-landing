import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initCustomCursor();
    }
  }

  private initCustomCursor(): void {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;

    let ringX = 0, ringY = 0;
    let dotX = 0, dotY = 0;

    const onMouseMove = (e: MouseEvent) => {
      dotX = e.clientX;
      dotY = e.clientY;
      gsap.set(dot, { x: dotX, y: dotY });
    };

    const onMouseEnterHoverable = () => document.body.classList.add('cursor-hover');
    const onMouseLeaveHoverable = () => document.body.classList.remove('cursor-hover');

    document.addEventListener('mousemove', onMouseMove);

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
      ringX += (dotX - ringX) * 0.12;
      ringY += (dotY - ringY) * 0.12;
      gsap.set(ring, { x: ringX, y: ringY });
    };
    gsap.ticker.add(ticker);

    this.cursorCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      hoverables.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnterHoverable);
        el.removeEventListener('mouseleave', onMouseLeaveHoverable);
      });
      mutationObserver.disconnect();
      gsap.ticker.remove(ticker);
      document.body.classList.remove('cursor-hover');
    };
  }

  ngOnDestroy(): void {
    if (this.cursorCleanup) {
      this.cursorCleanup();
    }
  }
}
