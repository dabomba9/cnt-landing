import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { FocusTrapDirective } from '../directives/focus-trap.directive';

/**
 * Slim "Name this copy" modal that pops on every duplicate trigger
 * (dashboard listing card, wizard "Save a copy" pill, resume-draft-card
 * Duplicate ghost). Auto-focuses the input, Enter saves, Esc cancels.
 *
 * The host owns the duplicate side-effect; this component just collects a
 * title or signals cancel.
 */
@Component({
  selector: 'cnt-duplicate-rename-modal',
  standalone: true,
  imports: [FormsModule, FocusTrapDirective],
  template: `
    <div class="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
      <div class="absolute inset-0 bg-dark-text/60 backdrop-blur-sm" (click)="cancel()"></div>
      <div cntFocusTrap (escape)="cancel()"
        class="relative bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.2)] max-w-md w-full p-6 md:p-7">
        <div class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-jungle-green/10 text-jungle-green mb-3">
          <span class="material-symbols-outlined text-2xl">content_copy</span>
        </div>
        <h2 [id]="titleId" class="font-headline font-bold text-dark-text text-xl md:text-2xl tracking-tight mb-1">
          Name your copy
        </h2>
        <p class="text-sm text-muted-text font-body leading-relaxed mb-4">{{ subtitle }}</p>

        <label class="block">
          <span class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text">Title</span>
          <input #input type="text" [(ngModel)]="value" name="copyTitle" maxlength="80"
            (keydown.enter)="save()"
            class="mt-1 w-full bg-cream/60 border border-dark-text/15 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
        </label>

        <div class="flex flex-col sm:flex-row sm:justify-end gap-2 mt-5">
          <button type="button" (click)="cancel()"
            class="px-4 py-2 rounded-full bg-white border border-dark-text/15 text-muted-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">
            Cancel
          </button>
          @if (showSaveToDrafts) {
            <button type="button" (click)="saveToShelf()" [disabled]="!value.trim()"
              class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white border border-jungle-green/30 text-jungle-green text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:bg-jungle-green/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <span class="material-symbols-outlined text-base">bookmark_add</span>
              Save to drafts
            </button>
          }
          <button type="button" (click)="save()" [disabled]="!value.trim()"
            class="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-trinidad text-white text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_16px_rgba(227,83,13,0.25)]">
            <span class="material-symbols-outlined text-base">{{ showSaveToDrafts ? 'open_in_new' : 'save' }}</span>
            {{ showSaveToDrafts ? 'Save copy & open' : 'Save copy' }}
          </button>
        </div>
        @if (showQuickPublish) {
          <div class="mt-3 text-right">
            <button type="button" (click)="quickPublish()" [disabled]="!value.trim()"
              class="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline">
              <span class="material-symbols-outlined text-sm">bolt</span>
              Or publish as-is →
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class DuplicateRenameModalComponent implements AfterViewInit, OnDestroy {
  /** Pre-filled title — typically `HostListingDraftService.suggestCopyTitle(...)`. */
  @Input() set defaultTitle(v: string) { this.value = v ?? ''; }
  /** Sub-label below the headline; lets the caller hint at intent
   *  ("Copying Heritage Oak Vineyard." / "Saving a copy of your draft."). */
  @Input() subtitle = 'Pick a name that fits your new site.';
  /** When true, render a secondary "Save to drafts" action alongside the
   *  primary "Save copy & open" button. Used on the dashboard listing-card
   *  duplicate flow so a host can stash a copy without leaving /hosting. */
  @Input() showSaveToDrafts = false;
  /** When true, render a tertiary "Or publish as-is →" text link under the
   *  button row. Only valid when the source is a real published listing so
   *  the clone is guaranteed to pass publish-validation. */
  @Input() showQuickPublish = false;

  @Output() saved = new EventEmitter<string>();
  @Output() savedToDrafts = new EventEmitter<string>();
  @Output() quickPublished = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('input', { static: true }) inputEl?: ElementRef<HTMLInputElement>;

  value = '';
  readonly titleId = `dup-rename-${Math.random().toString(36).slice(2, 8)}`;

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      const el = this.inputEl?.nativeElement;
      if (!el) return;
      el.focus();
      el.select();
    });
  }

  ngOnDestroy(): void { /* noop — focus trap handles its own cleanup */ }

  save(): void {
    const trimmed = this.value.trim();
    if (!trimmed) return;
    this.saved.emit(trimmed);
  }

  saveToShelf(): void {
    const trimmed = this.value.trim();
    if (!trimmed) return;
    this.savedToDrafts.emit(trimmed);
  }

  quickPublish(): void {
    const trimmed = this.value.trim();
    if (!trimmed) return;
    this.quickPublished.emit(trimmed);
  }

  cancel(): void { this.cancelled.emit(); }
}
