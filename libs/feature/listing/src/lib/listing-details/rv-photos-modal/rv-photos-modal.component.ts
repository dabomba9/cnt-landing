import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnDestroy, AfterViewInit, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { IMyRv, emptyMyRv } from '@cnt-workspace/data-access';
import { ToastService } from '@cnt-workspace/data-access';
import { FocusTrapDirective } from '@cnt-workspace/ui';
import { gsap } from 'gsap';

type Step = 1 | 2;

@Component({
  selector: 'cnt-rv-photos-modal',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './rv-photos-modal.component.html',
  styleUrls: ['./rv-photos-modal.component.scss'],
})
export class RvPhotosModalComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() open = false;
  /** Current MyRv state — modal seeds itself from this and emits the next state on success. */
  @Input() myRv: IMyRv | null = null;
  @Output() closed = new EventEmitter<void>();
  /** Fires once both photos are attached and the user submits. Carries the updated MyRv. */
  @Output() saved = new EventEmitter<IMyRv>();

  @ViewChild('modalRoot') modalRoot?: ElementRef<HTMLDivElement>;
  @ViewChild('successCheck') successCheck?: ElementRef<HTMLDivElement>;
  @ViewChild('rvBtn') rvBtn?: ElementRef<HTMLLabelElement>;

  step: Step = 1;
  rvFilename: string | null = null;
  rvPreview: string | null = null;
  licenseFilename: string | null = null;
  licensePreview: string | null = null;
  submitting = false;
  showLossGuard = false;
  showSuccess = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private toasts: ToastService,
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('keydown', this.onKey);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('keydown', this.onKey);
      this.unlockBody();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (changes['open']) {
      if (this.open) {
        this.lockBody();
        // Seed previews from incoming myRv if those photos already exist
        if (this.myRv) {
          this.rvFilename = this.myRv.rvPhoto ? 'Existing RV photo' : null;
          this.rvPreview = this.myRv.rvPhoto;
          this.licenseFilename = this.myRv.licensePhoto ? 'Existing license photo' : null;
          this.licensePreview = this.myRv.licensePhoto;
        }
        setTimeout(() => this.rvBtn?.nativeElement.focus(), 30);
      } else {
        this.unlockBody();
      }
    }
  }

  private onKey = (e: KeyboardEvent): void => {
    if (!this.open) return;
    if (e.key === 'Escape') { this.attemptClose(); return; }
    if (e.key === 'Tab') this.trapFocus(e);
  };

  private trapFocus(e: KeyboardEvent): void {
    const root = this.modalRoot?.nativeElement;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), label, [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  private lockBody(): void {
    if (isPlatformBrowser(this.platformId)) document.body.classList.add('cnt-modal-open');
  }
  private unlockBody(): void {
    if (isPlatformBrowser(this.platformId)) document.body.classList.remove('cnt-modal-open');
  }

  private readPreview(file: File, set: (url: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => set(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  }

  onRvPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.rvFilename = file.name;
    if (file.type.startsWith('image/')) this.readPreview(file, url => (this.rvPreview = url));
  }

  onLicensePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.licenseFilename = file.name;
    if (file.type.startsWith('image/')) this.readPreview(file, url => (this.licensePreview = url));
  }

  clearRv(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.rvFilename = null;
    this.rvPreview = null;
  }

  clearLicense(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.licenseFilename = null;
    this.licensePreview = null;
  }

  proceedToReview(): void {
    if (!this.rvPreview || !this.licensePreview) return;
    this.step = 2;
  }

  goBack(): void {
    if (this.step === 2) this.step = 1;
  }

  confirmSubmit(): void {
    if (!this.rvPreview || !this.licensePreview) return;
    this.submitting = true;
    setTimeout(() => {
      this.submitting = false;
      this.showSuccess = true;
      const reduced = isPlatformBrowser(this.platformId) && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        setTimeout(() => {
          if (this.successCheck) {
            gsap.from(this.successCheck.nativeElement, { scale: 0.4, opacity: 0, duration: 0.45, ease: 'back.out(2)' });
          }
        }, 20);
      }
      const dwell = reduced ? 350 : 700;
      setTimeout(() => {
        this.toasts.success('Photos saved to your RV profile.');
        const base: IMyRv = this.myRv || emptyMyRv();
        this.saved.emit({ ...base, rvPhoto: this.rvPreview, licensePhoto: this.licensePreview });
        this.reset();
      }, dwell);
    }, 600);
  }

  attemptClose(): void {
    if (this.submitting || this.showSuccess) return;
    // Loss guard if user attached at least one new file that wasn't already on profile
    const attachedSomething = (this.rvPreview && this.rvPreview !== this.myRv?.rvPhoto)
      || (this.licensePreview && this.licensePreview !== this.myRv?.licensePhoto);
    if (attachedSomething) {
      this.showLossGuard = true;
      return;
    }
    this.close();
  }

  discardAndClose(): void {
    this.showLossGuard = false;
    this.reset();
    this.closed.emit();
  }

  cancelLossGuard(): void { this.showLossGuard = false; }

  close(): void {
    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.step = 1;
    this.rvFilename = null;
    this.rvPreview = null;
    this.licenseFilename = null;
    this.licensePreview = null;
    this.submitting = false;
    this.showLossGuard = false;
    this.showSuccess = false;
    this.unlockBody();
  }

  isStepDone(n: number): boolean { return this.step > n; }
  isStepCurrent(n: number): boolean { return this.step === n; }
}
