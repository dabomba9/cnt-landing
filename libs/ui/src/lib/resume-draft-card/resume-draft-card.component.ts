import { Component, ElementRef, EventEmitter, Inject, Input, OnDestroy, OnInit, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (draft && completion) {
      <div class="rounded-2xl border p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6"
        [ngClass]="shelvedDraft
          ? 'border-jungle-green/30 bg-jungle-green/8'
          : 'border-gold/40 bg-gold/8'">
        <!-- Icon + label -->
        <div class="flex items-start gap-3 md:flex-1 min-w-0">
          <span class="w-12 h-12 rounded-full inline-flex items-center justify-center shrink-0"
            [ngClass]="shelvedDraft ? 'bg-jungle-green/15 text-jungle-green' : 'bg-gold/25'"
            [style.color]="shelvedDraft ? null : '#8a5a00'">
            <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">{{ shelvedDraft ? 'inventory_2' : 'drafts' }}</span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold"
                [ngClass]="shelvedDraft ? 'text-jungle-green' : ''"
                [style.color]="shelvedDraft ? null : '#8a5a00'">
                {{ shelvedDraft ? 'Saved copy' : 'Draft in progress' }}
              </span>
              <span class="text-[0.65rem] font-body text-muted-text">· {{ updatedLabel }}</span>
              @if (shelvedDraft && isStale) {
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-dark-text/10 text-muted-text text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold">
                  <span class="material-symbols-outlined text-[10px]">history</span>
                  Stale
                </span>
              }
            </div>
            @if (editingTitle && shelvedDraft) {
              <input #titleInput type="text" [(ngModel)]="titleDraft" maxlength="80"
                (blur)="commitTitleEdit()"
                (keydown.enter)="commitTitleEdit()"
                (keydown.escape)="cancelTitleEdit()"
                class="mt-0.5 w-full font-headline font-bold text-dark-text text-lg md:text-xl leading-tight bg-white border border-jungle-green/40 rounded-md px-2 py-1 focus:outline-none focus:border-jungle-green">
            } @else {
              <h3 class="font-headline font-bold text-dark-text text-lg md:text-xl leading-tight mt-0.5 truncate"
                [class.cursor-text]="shelvedDraft"
                [attr.title]="shelvedDraft ? 'Click to rename' : null"
                (click)="startTitleEdit()">
                {{ draft.title || 'Untitled listing' }}
              </h3>
            }
            @if (shelvedDraft && sourceTitle) {
              <div class="text-[0.65rem] font-body text-muted-text mt-1 flex items-center gap-1 min-w-0">
                <span class="material-symbols-outlined text-[12px]">subdirectory_arrow_right</span>
                <span class="truncate">Copied from {{ sourceTitle }}</span>
              </div>
            }
            @if (shelvedDraft && isAncient) {
              <div class="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-dark-text/[0.04] text-muted-text text-[0.65rem] font-body">
                <span class="material-symbols-outlined text-sm">schedule</span>
                Untouched for 60+ days — still need this copy?
                <button type="button" (click)="discard()"
                  class="text-trinidad font-button font-bold uppercase tracking-[0.1em] text-[0.6rem] hover:underline">
                  Discard
                </button>
              </div>
            }

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
          @if (shelvedDraft) {
            <button type="button" (click)="resume.emit()"
              class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-jungle-green text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(41,93,66,0.25)] transition-opacity">
              Resume
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          } @else {
            <a routerLink="/hosting/new"
              class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity no-underline">
              Continue
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </a>
            <button type="button" (click)="duplicate.emit()"
              class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white border border-jungle-green/30 text-jungle-green text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:bg-jungle-green/10 transition-colors">
              <span class="material-symbols-outlined text-sm">content_copy</span>
              Save a copy
            </button>
          }
          <button type="button" (click)="discard()"
            class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white border border-trinidad/30 text-trinidad text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold hover:bg-trinidad/10 transition-colors">
            <span class="material-symbols-outlined text-sm">delete</span>
            Discard
          </button>
        </div>
      </div>
    }
  `,
})
export class ResumeDraftCardComponent implements OnInit, OnDestroy {
  /** Set this to render the card in "shelved" mode — Resume + Discard action
   *  row, jungle-green palette, draft data sourced from the input rather than
   *  the active in-flight draft. Leave unset for the default active mode. */
  @Input() shelvedDraft: IDraftListing | null = null;
  /** Title of the listing this shelved draft was copied from — drives the
   *  "↳ Copied from X" breadcrumb on multi-copy shelves. Resolved by the
   *  parent via ALL_LISTINGS lookup; empty when the lineage doesn't resolve
   *  (or the draft was a raw fork). */
  @Input() sourceTitle = '';

  /** Fires after the host discards the draft (active or shelved), so parent
   *  pages can refresh + the parent owns the actual discard side effect. */
  @Output() discarded = new EventEmitter<void>();
  /** Fires when the host taps "Save a copy" on the active card. */
  @Output() duplicate = new EventEmitter<void>();
  /** Fires when the host taps Resume on a shelved card — parent owns the
   *  swap-in side effect via HostListingDraftService.resumeShelvedDraftById. */
  @Output() resume = new EventEmitter<void>();
  /** Fires when an inline title edit commits on a shelved card. The parent
   *  routes the new title through HostListingDraftService.renameShelvedDraft. */
  @Output() renamed = new EventEmitter<string>();

  @ViewChild('titleInput') titleInputEl?: ElementRef<HTMLInputElement>;

  /** Inline-rename state for shelved cards only. */
  editingTitle = false;
  titleDraft = '';

  draft: IDraftListing | null = null;
  completion: { stepsDone: number; stepsTotal: number; pct: number; phasesDone: [boolean, boolean, boolean] } | null = null;
  private sub?: Subscription;

  constructor(
    private drafts: HostListingDraftService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    if (this.shelvedDraft) {
      this.draft = this.shelvedDraft;
      this.completion = this.drafts.completionFor(this.shelvedDraft);
      return;
    }
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
    // For shelved cards, the parent owns the actual remove side effect so it
    // can target the right id; the active card wipes the in-flight slot.
    if (!this.shelvedDraft) this.drafts.discardDraft();
    this.discarded.emit();
  }

  // ─────────────── Inline rename (shelved cards only) ───────────────

  startTitleEdit(): void {
    if (!this.shelvedDraft || !this.draft) return;
    this.titleDraft = this.draft.title ?? '';
    this.editingTitle = true;
    queueMicrotask(() => {
      const el = this.titleInputEl?.nativeElement;
      if (!el) return;
      el.focus();
      el.select();
    });
  }

  commitTitleEdit(): void {
    if (!this.editingTitle) return;
    const trimmed = this.titleDraft.trim();
    if (trimmed && this.draft && trimmed !== this.draft.title) {
      this.renamed.emit(trimmed);
      this.draft = { ...this.draft, title: trimmed };
    }
    this.editingTitle = false;
  }

  cancelTitleEdit(): void {
    this.editingTitle = false;
    this.titleDraft = '';
  }

  // ─────────────── Age (shelved cards only) ───────────────

  /** True when the shelved draft hasn't been updated in 30+ days — drives
   *  the muted "Stale" chip next to the eyebrow. */
  get isStale(): boolean {
    return this.daysSinceUpdate >= 30;
  }
  /** True at 60+ days — drives the soft "still need this copy?" prompt
   *  inside the card body. */
  get isAncient(): boolean {
    return this.daysSinceUpdate >= 60;
  }
  private get daysSinceUpdate(): number {
    const iso = this.draft?.updatedAt;
    if (!iso) return 0;
    const diff = Date.now() - Date.parse(iso);
    if (Number.isNaN(diff) || diff < 0) return 0;
    return Math.floor(diff / 86_400_000);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
