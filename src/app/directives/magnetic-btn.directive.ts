import {
  Directive, ElementRef, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, NgZone,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

/**
 * Magnetic-button cursor pull. Auto-attaches to any element with the
 * `.magnetic-btn` class within a component's template (selector matches
 * the class). Replaces the duplicated `initMagneticButtons()` methods
 * previously living in home + faq components.
 *
 * Usage: add `MagneticBtnDirective` to a component's `imports: []` array.
 * Any element rendered with `class="… magnetic-btn …"` inside that
 * component will receive the cursor-following pull behavior.
 */
@Directive({
  selector: '.magnetic-btn',
  standalone: true,
})
export class MagneticBtnDirective implements AfterViewInit, OnDestroy {
  private mousemoveHandler?: (e: MouseEvent) => void;
  private mouseleaveHandler?: () => void;

  constructor(
    private el: ElementRef<HTMLElement>,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const btn = this.el.nativeElement;

    this.zone.runOutsideAngular(() => {
      this.mousemoveHandler = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.6, ease: 'power3.out' });
      };
      this.mouseleaveHandler = () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
      };
      btn.addEventListener('mousemove', this.mousemoveHandler);
      btn.addEventListener('mouseleave', this.mouseleaveHandler);
    });
  }

  ngOnDestroy(): void {
    const btn = this.el.nativeElement;
    if (this.mousemoveHandler) btn.removeEventListener('mousemove', this.mousemoveHandler);
    if (this.mouseleaveHandler) btn.removeEventListener('mouseleave', this.mouseleaveHandler);
    gsap.killTweensOf(btn);
  }
}
