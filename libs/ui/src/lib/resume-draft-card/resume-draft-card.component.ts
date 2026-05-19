import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  HostListingDraftService, IDraftListing,
} from '@cnt-workspace/data-access';

/**
 * Resume-draft-card — surfaces an in-progress host listing draft so the user
 * can pick up where they left off. Rendered on /hosting (host dashboard) and
 * /hosting/listings (manage listings). Shows progress + last-updated time +
 * Continue / Discard actions.
 *
 * Emits `discarded` so the parent page can refresh any computed view-models
 * that depend on the draft state (most pages don't need this, but the listings
 * index does so the row disappears).
 */
@Component({
  selector: 'cnt-resume-draft-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (draft && completion) {
      <div class="rounded-2xl border border-gold/40 bg-gold/8 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <!-- Icon + label -->
        <div class="flex items-start gap-3 md:flex-1 min-w-0">
          <span class="w-12 h-12 rounded-full bg-gold/25 inline-flex items-center justify-center shrink-0"
            style="color: #8a5a00;">
            <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">drafts</span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold" style="color: #8a5a00;">
                Draft in progress
              </span>
              <span class="text-[0.65rem] font-body text-muted-text">· {{ updatedLabel }}</span>
            </div>
            <h3 class="font-headline font-bold text-dark-text text-lg md:text-xl leading-tight mt-0.5 truncate">
              {{ draft.title || 'Untitled listing' }}
            </h3>

            <!-- Progress bar -->
            <div class="mt-3 flex items-center gap-2.5">
              <div class="flex-1 h-1.5 bg-dark-text/10 rounded-full overflow-hidden max-w-xs">
                <div class="h-full bg-trinidad rounded-full transition-all duration-300"
                  [style.width.%]="completion.pct"></div>
              </div>
              <span class="text-[0.65rem] font-body font-bold text-dark-text shrink-0">
                {{ completion.stepsDone }} of {{ completion.stepsTotal }} steps · {{ completion.pct }}%
              </span>
            </div>

            <!-- Phase chips -->
            <div class="mt-2.5 flex items-center gap-1.5 flex-wrap">
              @for (done of completion.phasesDone; track $index) {
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold"
                  [ngClass]="done
                    ? 'bg-jungle-green text-white'
                    : (currentPhase === $index + 1 ? 'bg-trinidad text-white' : 'bg-white border border-dark-text/15 text-muted-text')">
                  @if (done) {
                    <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">check</span>
                  }
                  Phase {{ $index + 1 }}
                </span>
              }
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0 md:flex-col md:items-stretch md:gap-2">
          <a routerLink="/hosting/new"
            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity no-underline">
            Continue
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </a>
          <button type="button" (click)="discard()"
            class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">
            Discard
          </button>
        </div>
      </div>
    }
  `,
})
export class ResumeDraftCardComponent implements OnInit, OnDestroy {
  /** Fires after the host discards the draft, so parent pages can refresh. */
  @Output() discarded = new EventEmitter<void>();

  draft: IDraftListing | null = null;
  completion: { stepsDone: number; stepsTotal: number; pct: number; phasesDone: [boolean, boolean, boolean] } | null = null;
  private sub?: Subscription;

  constructor(
    private drafts: HostListingDraftService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    this.sub = this.drafts.draft$.subscribe(d => {
      this.draft = d;
      this.completion = this.drafts.completion;
    });
  }

  get currentPhase(): 1 | 2 | 3 { return this.draft?.currentPhase ?? 1; }

  /** Human-readable "Started N days/hours ago" timestamp. */
  get updatedLabel(): string {
    const iso = this.draft?.updatedAt;
    if (!iso) return '';
    const diff = Date.now() - Date.parse(iso);
    if (Number.isNaN(diff)) return '';
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }

  discard(): void {
    if (isPlatformBrowser(this.platformId) && !confirm('Discard your draft? This can\'t be undone.')) return;
    this.drafts.discardDraft();
    this.discarded.emit();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
