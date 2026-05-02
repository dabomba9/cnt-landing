import {
  Component, EventEmitter, HostListener, Inject, Input, OnChanges, Output,
  PLATFORM_ID, SimpleChanges,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

/**
 * Self-contained photo lightbox overlay. Owns all internal UI state
 * (current index, fade state, swipe handlers, focus trap, body scroll lock,
 * keyboard navigation). Parent only flips `open` and provides photos/title.
 */
@Component({
  selector: 'cnt-listing-photo-lightbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listing-photo-lightbox.component.html',
})
export class ListingPhotoLightboxComponent implements OnChanges {
  @Input() photos: string[] = [];
  @Input() title = '';
  @Input() open = false;
  @Input() startIndex = 0;
  @Output() closed = new EventEmitter<void>();

  index = 0;
  fading = false;
  private lastFocusedTrigger: HTMLElement | null = null;
  private touchStartX = 0;
  private touchStartY = 0;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) return;
    if (this.open) this.onOpen();
    else this.onClose();
  }

  private onOpen(): void {
    this.index = this.startIndex;
    if (!isPlatformBrowser(this.platformId)) return;
    this.lastFocusedTrigger = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      document.querySelector<HTMLButtonElement>('#lightbox-root [aria-label="Close gallery"]')?.focus();
    }, 0);
  }

  private onClose(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.style.overflow = '';
    this.lastFocusedTrigger?.focus();
    this.lastFocusedTrigger = null;
  }

  close(): void {
    this.closed.emit();
  }

  fadeSwap(nextIndex: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.index = nextIndex;
      return;
    }
    this.fading = true;
    setTimeout(() => {
      this.index = nextIndex;
      requestAnimationFrame(() => this.fading = false);
    }, 130);
  }

  prev(): void {
    const n = this.photos.length;
    this.fadeSwap((this.index - 1 + n) % n);
  }

  next(): void {
    const n = this.photos.length;
    this.fadeSwap((this.index + 1) % n);
  }

  onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  onTouchEnd(e: TouchEvent): void {
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) this.next(); else this.prev();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.open) return;
    if (e.key === 'Escape')     { this.close(); return; }
    if (e.key === 'ArrowLeft')  { this.prev();  return; }
    if (e.key === 'ArrowRight') { this.next();  return; }
    if (e.key !== 'Tab') return;
    if (!isPlatformBrowser(this.platformId)) return;

    const root = document.getElementById('lightbox-root');
    if (!root) return;
    const focusables = Array.from(root.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }
}
