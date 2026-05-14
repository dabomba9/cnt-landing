import { AfterViewInit, Directive, ElementRef, EventEmitter, HostListener, Inject, OnDestroy, Output, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Confines keyboard focus inside the host element (Tab wraps both ways),
 * autofocuses the first focusable on attach, restores focus to the trigger
 * on detach, and emits `(escape)` when the user presses Escape.
 *
 * Usage:
 *   <div cntFocusTrap (escape)="close()" role="dialog" aria-modal="true">
 *     ...
 *   </div>
 *
 * No CDK dependency. Re-queries focusables on each Tab cycle so dynamic
 * content (panels expanding mid-dialog) stays correct.
 */
@Directive({
  selector: '[cntFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements AfterViewInit, OnDestroy {
  @Output() escape = new EventEmitter<void>();

  /** The element that had focus before the trap engaged — restored on destroy. */
  private triggerEl: HTMLElement | null = null;

  private static readonly FOCUSABLE = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
  ].join(', ');

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private host: ElementRef<HTMLElement>,
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const active = document.activeElement;
    this.triggerEl = active instanceof HTMLElement ? active : null;
    // Wait a tick so the host has any conditional content rendered.
    setTimeout(() => this.focusFirst(), 0);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.triggerEl && document.contains(this.triggerEl)) {
      this.triggerEl.focus();
    }
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    event.stopPropagation();
    this.escape.emit();
  }

  @HostListener('keydown.tab', ['$event'])
  onTab(event: KeyboardEvent): void {
    const focusables = this.getFocusables();
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusFirst(): void {
    const focusables = this.getFocusables();
    if (focusables.length === 0) {
      // Make the host itself focusable as a fallback so it gets focus and Escape works.
      this.host.nativeElement.setAttribute('tabindex', '-1');
      this.host.nativeElement.focus();
      return;
    }
    focusables[0].focus();
  }

  private getFocusables(): HTMLElement[] {
    const nodes = this.host.nativeElement.querySelectorAll<HTMLElement>(FocusTrapDirective.FOCUSABLE);
    return Array.from(nodes).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }
}
