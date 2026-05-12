import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnDestroy, ElementRef, ViewChild, ViewChildren, QueryList, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, IdType } from '@cnt-workspace/data-access';
import { ToastService } from '@cnt-workspace/data-access';
import { gsap } from 'gsap';

interface IIdOption {
  id: IdType;
  label: string;
  icon: string;
  hint: string;
}

type Step = 1 | 2 | 3 | 4; // 4 = success micro-pause

@Component({
  selector: 'cnt-id-verify-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './id-verify-modal.component.html',
  styleUrls: ['./id-verify-modal.component.scss'],
})
export class IdVerifyModalComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() verified = new EventEmitter<void>();

  @ViewChild('modalRoot') modalRoot?: ElementRef<HTMLDivElement>;
  @ViewChild('successCheck') successCheck?: ElementRef<HTMLDivElement>;
  @ViewChildren('typeBtn') typeButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  step: Step = 1;
  selectedType: IdType | null = null;
  idLastFour = '';

  frontFilename: string | null = null;
  selfieFilename: string | null = null;
  frontPreview: string | null = null;
  selfiePreview: string | null = null;

  submitting = false;
  showLossGuard = false;

  options: IIdOption[] = [
    { id: 'drivers-license', label: "Driver's license", icon: 'badge',         hint: 'Most common — issued by your state DMV.' },
    { id: 'passport',        label: 'Passport',         icon: 'travel_explore', hint: 'US or international passports accepted.' },
    { id: 'state-id',        label: 'State ID',         icon: 'contact_page',   hint: 'Non-driver identity card.' },
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService,
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
        // Focus first ID-type button on next tick
        setTimeout(() => this.typeButtons?.first?.nativeElement.focus(), 30);
      } else {
        this.unlockBody();
      }
    }
  }

  private onKey = (e: KeyboardEvent): void => {
    if (!this.open) return;
    if (e.key === 'Escape') {
      this.attemptClose();
      return;
    }
    if (e.key === 'Tab') {
      this.trapFocus(e);
    }
  };

  private trapFocus(e: KeyboardEvent): void {
    const root = this.modalRoot?.nativeElement;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private lockBody(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.classList.add('cnt-modal-open');
  }

  private unlockBody(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.classList.remove('cnt-modal-open');
  }

  selectType(type: IdType): void {
    this.selectedType = type;
    this.step = 2;
  }

  goBack(): void {
    if (this.step === 2) this.step = 1;
    else if (this.step === 3) this.step = 2;
  }

  /** Read picked file as data-URL preview (no localStorage persistence). */
  private readPreview(file: File, set: (url: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => set(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  }

  onFrontPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.frontFilename = file.name;
    if (file.type.startsWith('image/')) this.readPreview(file, url => (this.frontPreview = url));
    else this.frontPreview = null;
  }

  onSelfiePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selfieFilename = file.name;
    this.readPreview(file, url => (this.selfiePreview = url));
  }

  clearFront(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.frontFilename = null;
    this.frontPreview = null;
  }

  clearSelfie(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.selfieFilename = null;
    this.selfiePreview = null;
  }

  proceedToReview(): void {
    if (!this.frontFilename || !this.selfieFilename) return;
    this.step = 3;
  }

  confirmSubmit(): void {
    if (!this.selectedType) return;
    this.submitting = true;
    setTimeout(() => {
      this.auth.markVerified({
        idType: this.selectedType!,
        idLastFour: this.idLastFour ? this.idLastFour.slice(-4) : '****',
      });
      this.submitting = false;
      this.step = 4; // success micro-pause
      const reduced = isPlatformBrowser(this.platformId) && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        setTimeout(() => {
          if (this.successCheck) {
            gsap.from(this.successCheck.nativeElement, { scale: 0.4, opacity: 0, duration: 0.45, ease: 'back.out(2)' });
          }
        }, 20);
      }
      const dwell = reduced ? 350 : 750;
      setTimeout(() => {
        this.toasts.success('Identity verified — you can book any stay.');
        this.verified.emit();
        this.reset();
      }, dwell);
    }, 700);
  }

  attemptClose(): void {
    if (this.submitting || this.step === 4) return;
    if (this.frontFilename || this.selfieFilename) {
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

  cancelLossGuard(): void {
    this.showLossGuard = false;
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.step = 1;
    this.selectedType = null;
    this.idLastFour = '';
    this.frontFilename = null;
    this.selfieFilename = null;
    this.frontPreview = null;
    this.selfiePreview = null;
    this.submitting = false;
    this.showLossGuard = false;
    this.unlockBody();
  }

  selectedOption(): IIdOption | null {
    return this.options.find(o => o.id === this.selectedType) || null;
  }

  isStepDone(n: number): boolean { return this.step > n; }
  isStepCurrent(n: number): boolean { return this.step === n; }
}
