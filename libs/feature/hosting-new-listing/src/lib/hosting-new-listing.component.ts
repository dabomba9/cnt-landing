import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
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

@Component({
  selector: 'cnt-hosting-new-listing',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    NavbarComponent, FooterComponent,
    PhaseHubComponent,
    Phase1DescriptorsComponent, Phase1AddressComponent, Phase1BasicsComponent,
    Phase1AmenitiesComponent, Phase1VehiclesComponent,
    Phase2PhotosComponent, Phase2NameDescriptionComponent, Phase2ConditionsComponent,
    Phase2ProfilePhotoComponent,
    Phase3BookingsComponent, Phase3RulesComponent, Phase3PricingComponent,
    Phase3ReviewComponent,
  ],
  templateUrl: './hosting-new-listing.component.html',
  styleUrl: './hosting-new-listing.component.scss',
})
export class HostingNewListingComponent implements OnInit, OnDestroy {
  draft: IDraftListing | null = null;

  /** 1, 2, 3 = phase; -1 step = phase hub landing, 0+ = actual step within phase. */
  phase: 1 | 2 | 3 = 1;
  step = -1;                // -1 → phase hub, 0+ → step index

  /** Step labels for the active phase, drives the progress chip strip. */
  get stepsForPhase(): string[] {
    switch (this.phase) {
      case 1: return PHASE1_STEPS;
      case 2: return PHASE2_STEPS;
      case 3: return PHASE3_STEPS;
    }
  }

  /** Total step count for the active phase, used by the progress bar. */
  get stepsTotal(): number { return this.stepsForPhase.length; }

  /** 0-based progress percentage for the active phase. */
  get phaseProgressPct(): number {
    if (this.step < 0) return 0;
    return Math.round(((this.step + 1) / this.stepsTotal) * 100);
  }

  /** Phase labels for the top-of-page phase nav. */
  readonly PHASE_LABELS = [
    'Tell us about your place',
    'Make it stand out',
    'Finish up & publish',
  ];

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private drafts: HostListingDraftService,
    private seo: SeoService,
    private toasts: ToastService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'List your property — CurbNTurf',
      description: 'Create your CurbNTurf listing and start earning.',
      url: '/hosting/new',
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

  /** Step components emit patches; we merge + persist. */
  onPatch(patch: Partial<IDraftListing>): void {
    this.drafts.saveDraft(patch);
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

  /** Jump to any step the user has reached. The progress chips wire to this. */
  jumpToStep(phase: 1 | 2 | 3, step: number): void { this.go(phase, step); }
  /** Phase-chip click in the top nav — sends the user to that phase's hub. */
  jumpToPhaseHub(phase: number): void {
    if (phase === 1 || phase === 2 || phase === 3) this.go(phase, -1);
  }

  /** Save and bail to the dashboard. The draft is auto-persisted on every patch. */
  saveAndExit(): void {
    this.toasts.info('Draft saved — pick it back up anytime.');
    this.router.navigate(['/hosting']);
  }

  /** Discard the in-progress draft and route back to the dashboard. */
  discard(): void {
    if (!isPlatformBrowser(this.platformId) || confirm('Discard your draft? This can\'t be undone.')) {
      this.drafts.discardDraft();
      this.toasts.info('Draft discarded.');
      this.router.navigate(['/hosting']);
    }
  }

  private go(phase: 1 | 2 | 3, step: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { phase, step },
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
