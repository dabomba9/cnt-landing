import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent, FocusTrapDirective } from '@cnt-workspace/ui';
import {
  HostListingDraftService, IDraftListing, SeoService, ToastService,
} from '@cnt-workspace/data-access';
import { Phase1DescriptorsComponent } from './steps/phase1-descriptors.component';
import { Phase1AddressComponent } from './steps/phase1-address.component';
import { Phase1BasicsComponent } from './steps/phase1-basics.component';
import { Phase1AmenitiesComponent } from './steps/phase1-amenities.component';
import { Phase1VehiclesComponent } from './steps/phase1-vehicles.component';
import { Phase2PhotosComponent } from './steps/phase2-photos.component';
import { Phase2NameDescriptionComponent } from './steps/phase2-name-description.component';
import { Phase2ConditionsComponent } from './steps/phase2-conditions.component';
import { Phase2ProfilePhotoComponent } from './steps/phase2-profile-photo.component';
import { Phase3BookingsComponent } from './steps/phase3-bookings.component';
import { Phase3RulesComponent } from './steps/phase3-rules.component';
import { Phase3PricingComponent } from './steps/phase3-pricing.component';
import { Phase3AddonsComponent } from './steps/phase3-addons.component';
import { Phase3ReviewComponent } from './steps/phase3-review.component';
import { PhaseHubComponent } from './phase-hub/phase-hub.component';

/**
 * Step descriptor for the wizard. `phase` 0 means the phase-hub landing screen
 * (one per phase). Real steps start at `step` 0 within a phase.
 */
interface IStepDescriptor {
  phase: 1 | 2 | 3;
  step: number;          // -1 for the phase hub, 0+ for actual steps
  label: string;         // short label for the progress bar
}

/** Steps within each phase, in order. The shell renders them by index. */
const PHASE1_STEPS = ['Property type', 'Address', 'Site basics', 'Amenities', 'Vehicles'];
const PHASE2_STEPS = ['Photos', 'Name & description', 'Site conditions', 'Profile photo'];
const PHASE3_STEPS = ['Bookings', 'House rules', 'Pricing', 'Review'];
const PHASE3_STEPS_EDIT = ['Bookings', 'House rules', 'Pricing', 'Add-ons', 'Review'];

@Component({
  selector: 'cnt-hosting-new-listing',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    NavbarComponent, FooterComponent, FocusTrapDirective,
    PhaseHubComponent,
    Phase1DescriptorsComponent, Phase1AddressComponent, Phase1BasicsComponent,
    Phase1AmenitiesComponent, Phase1VehiclesComponent,
    Phase2PhotosComponent, Phase2NameDescriptionComponent, Phase2ConditionsComponent,
    Phase2ProfilePhotoComponent,
    Phase3BookingsComponent, Phase3RulesComponent, Phase3PricingComponent,
    Phase3AddonsComponent, Phase3ReviewComponent,
  ],
  templateUrl: './hosting-new-listing.component.html',
  styleUrl: './hosting-new-listing.component.scss',
})
export class HostingNewListingComponent implements OnInit, OnDestroy {
  draft: IDraftListing | null = null;

  /** True when the wizard was opened from /hosting/listings/:id/edit. */
  editing = false;
  editingListingId: number | null = null;

  /** 1, 2, 3 = phase; -1 step = phase hub landing, 0+ = actual step within phase. */
  phase: 1 | 2 | 3 = 1;
  step = -1;                // -1 → phase hub, 0+ → step index

  /** Step labels for the active phase, drives the progress chip strip. */
  get stepsForPhase(): string[] {
    switch (this.phase) {
      case 1: return PHASE1_STEPS;
      case 2: return PHASE2_STEPS;
      case 3: return this.editing ? PHASE3_STEPS_EDIT : PHASE3_STEPS;
    }
  }

  /** Total step count for the active phase, used by the progress bar. */
  get stepsTotal(): number { return this.stepsForPhase.length; }

  /** 0-based progress percentage for the active phase. */
  get phaseProgressPct(): number {
    if (this.step < 0) return 0;
    return Math.round(((this.step + 1) / this.stepsTotal) * 100);
  }

  /** Step labels per phase — drives the edit-mode TOC sidebar. */
  stepsByPhase(phase: number): string[] {
    switch (phase) {
      case 1: return PHASE1_STEPS;
      case 2: return PHASE2_STEPS;
      case 3: return this.editing ? PHASE3_STEPS_EDIT : PHASE3_STEPS;
      default: return [];
    }
  }

  /** Partial-progress badge for a top-level phase chip. `phase` is 1/2/3 at runtime. */
  phaseProgress(phase: number): { done: number; total: number; complete: boolean } {
    const total = this.stepsByPhase(phase).length;
    let done = 0;
    for (let i = 0; i < total; i++) {
      if (this.drafts.isStepValid(phase as 1 | 2 | 3, i)) done++;
    }
    return { done, total, complete: total > 0 && done === total };
  }

  /** Phase labels for the top-of-page phase nav. */
  readonly PHASE_LABELS = [
    'Tell us about your place',
    'Make it stand out',
    'Finish up & publish',
  ];

  /** Short labels for the breadcrumb (the long PHASE_LABELS read awkwardly there). */
  readonly PHASE_SHORT_LABELS = ['Basics', 'Showcase', 'Finish up'];

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private drafts: HostListingDraftService,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    // Detect edit mode from the route's :id param. When present, load the
    // listing's snapshot into the draft service so the wizard pre-fills with
    // the existing data; saves route back to the snapshot in place.
    this.subs.push(this.route.paramMap.subscribe(p => {
      const idRaw = p.get('id');
      const id = idRaw ? Number(idRaw) : NaN;
      if (Number.isFinite(id)) {
        const loaded = this.drafts.loadForEdit(id);
        if (loaded) {
          this.editing = true;
          this.editingListingId = id;
        } else {
          // No snapshot — fall back to dashboard.
          this.toasts.error('Listing not found — it may have been removed.');
          this.router.navigate(['/hosting/listings']);
        }
      }
    }));
    this.seo.update({
      title: this.editing ? 'Edit listing — CurbNTurf' : 'List your property — CurbNTurf',
      description: 'Create your CurbNTurf listing and start earning.',
      url: this.editing ? `/hosting/listings/${this.editingListingId}/edit` : '/hosting/new',
      robots: 'noindex, nofollow',
    });
    // Hydrate from query params so refresh + back-button work.
    this.subs.push(this.route.queryParams.subscribe(q => {
      const phaseRaw = parseInt(q['phase'], 10);
      const stepRaw = parseInt(q['step'], 10);
      if (phaseRaw === 1 || phaseRaw === 2 || phaseRaw === 3) this.phase = phaseRaw;
      else this.phase = 1;
      this.step = Number.isFinite(stepRaw) ? stepRaw : -1;
    }));
    this.subs.push(this.drafts.draft$.subscribe(d => { this.draft = d; }));
  }

  /** Step components emit patches; we merge + persist + flash the saved indicator. */
  onPatch(patch: Partial<IDraftListing>): void {
    this.drafts.saveDraft(patch);
    this.justSaved = true;
    if (this.justSavedTimer) clearTimeout(this.justSavedTimer);
    this.justSavedTimer = setTimeout(() => { this.justSaved = false; }, 1200);
  }

  /** Toggles a small "Saved" pulse next to the Save & exit button after each patch. */
  justSaved = false;
  private justSavedTimer: ReturnType<typeof setTimeout> | null = null;

  /** Human-readable "Saved N s/m/h ago" derived from the draft's updatedAt. */
  get lastSavedLabel(): string {
    const iso = this.draft?.updatedAt;
    if (!iso) return '';
    const diff = Date.now() - Date.parse(iso);
    if (Number.isNaN(diff)) return '';
    if (diff < 5_000) return 'Saved just now';
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Saved ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Saved ${hours}h ago`;
    return 'Saved earlier';
  }

  /** Thin proxy so the chip strip + TOC sidebar can ask completion-state per step.
   * Accepts a plain number so template `p + 1` arithmetic works without casts. */
  stepValid(phase: number, step: number): boolean {
    if (phase !== 1 && phase !== 2 && phase !== 3) return false;
    return this.drafts.isStepValid(phase, step);
  }

  /** True when the current step's requirements are satisfied. Disables Next when false. */
  get currentStepValid(): boolean {
    if (this.step < 0) return true; // phase hub — no constraints
    if (this.editing && this.phase === 3) {
      // Edit-mode reorders the phase-3 steps: add-ons sits at index 3, review at 4.
      if (this.step === 3) return true;             // add-ons optional
      if (this.step === 4) return this.drafts.isStepValid(3, 3); // review uses same gate
    }
    return this.drafts.isStepValid(this.phase, this.step);
  }

  /** Inline hint when Next is disabled. */
  get currentStepHint(): string {
    if (this.step < 0 || this.currentStepValid) return '';
    if (this.editing && this.phase === 3 && this.step === 4) {
      return this.drafts.stepValidationHint(3, 3);
    }
    return this.drafts.stepValidationHint(this.phase, this.step);
  }

  /** True when the active step is the review step (last in the phase 3 sequence). */
  get isReviewStep(): boolean {
    return this.phase === 3 && this.step === (this.editing ? 4 : 3);
  }

  /** True when the active step is the edit-only add-ons step. */
  get isAddonsStep(): boolean {
    return this.editing && this.phase === 3 && this.step === 3;
  }

  /** Navigation primitives. */
  next(): void {
    if (this.step + 1 < this.stepsTotal) {
      this.go(this.phase, this.step + 1);
    } else if (this.phase < 3) {
      // End of phase → back to next phase's hub.
      this.go((this.phase + 1) as 1 | 2 | 3, -1);
    } else {
      // End of phase 3 → review step is the last (already there).
    }
  }
  prev(): void {
    if (this.step > 0) {
      this.go(this.phase, this.step - 1);
    } else if (this.step === 0) {
      // Step 0 → back to the phase hub.
      this.go(this.phase, -1);
    } else if (this.phase > 1) {
      // Phase hub → last step of previous phase.
      const prevPhase = (this.phase - 1) as 1 | 2 | 3;
      const prevSteps = prevPhase === 1 ? PHASE1_STEPS.length : PHASE2_STEPS.length;
      this.go(prevPhase, prevSteps - 1);
    }
  }
  /** Phase hub "Start" / "Continue" → first incomplete step (here just step 0). */
  startPhase(phase: 1 | 2 | 3): void { this.go(phase, 0); }

  /** Jump to any step the user has reached. The progress chips + TOC sidebar wire to this. */
  jumpToStep(phase: number, step: number): void {
    if (phase !== 1 && phase !== 2 && phase !== 3) return;
    this.go(phase, step);
  }
  /** Phase-chip click in the top nav — sends the user to that phase's hub. */
  jumpToPhaseHub(phase: number): void {
    if (phase === 1 || phase === 2 || phase === 3) this.go(phase, -1);
  }

  /** Save and bail. Behavior differs between new-listing draft and edit modes. */
  saveAndExit(): void {
    if (this.editing && this.editingListingId !== null) {
      this.drafts.saveEdit();
      this.toasts.success('Changes saved.');
      this.router.navigate(['/listing'], { queryParams: { id: this.editingListingId } });
      return;
    }
    this.toasts.info('Draft saved — pick it back up anytime.');
    this.router.navigate(['/hosting']);
  }

  /** Edit-mode "Save changes" CTA on the review screen. */
  saveChanges(): void {
    if (!this.editing || this.editingListingId === null) return;
    this.drafts.saveEdit();
    this.toasts.success('Changes saved.');
    this.router.navigate(['/listing'], { queryParams: { id: this.editingListingId } });
  }

  /** Discard-confirmation modal. */
  discardModalOpen = false;
  openDiscardModal(): void { this.discardModalOpen = true; }
  closeDiscardModal(): void { this.discardModalOpen = false; }
  confirmDiscard(): void {
    this.discardModalOpen = false;
    this.drafts.discardDraft();
    this.toasts.info('Draft discarded.');
    this.router.navigate(['/hosting']);
  }

  private go(phase: 1 | 2 | 3, step: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { phase, step },
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.editing) this.drafts.exitEdit();
  }

  /**
   * Keyboard shortcuts:
   *  - 1 / 2 / 3 → jump to phase hub
   *  - ArrowLeft  → prev step (same as the Previous button)
   *  - ArrowRight → next step (only when current step is valid)
   *
   * Skips when focus is on an input, textarea, select, or contenteditable —
   * otherwise a host typing "2" in the price field would teleport away mid-edit.
   */
  @HostListener('window:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const target = ev.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (target.isContentEditable) return;
    }
    if (this.discardModalOpen) return;
    if (ev.key === '1' || ev.key === '2' || ev.key === '3') {
      this.jumpToPhaseHub(Number(ev.key));
      ev.preventDefault();
    } else if (ev.key === 'ArrowLeft') {
      this.prev();
      ev.preventDefault();
    } else if (ev.key === 'ArrowRight') {
      if (this.currentStepValid) this.next();
      ev.preventDefault();
    }
  }
}
