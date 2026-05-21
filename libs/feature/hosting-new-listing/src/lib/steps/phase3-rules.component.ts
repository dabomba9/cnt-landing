import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IDraftListing, IHouseRules } from '@cnt-workspace/data-access';

const DEFAULT_RULES: IHouseRules = {
  noSmoking: true,
  noParties: true,
  quietHours: true,
  noFireworks: false,
  noFirearms: false,
};

const MAX_CUSTOM_RULES = 10;
const MAX_RULE_LENGTH = 120;

/**
 * Step 3.2 — house rules. Five toggleable standard rules + a list of custom
 * rules added one-at-a-time via an input + "Add" button. Each custom rule
 * renders as a checked row (host added it → always enforced) with a remove ×.
 *
 * Persisted shape stays string-based on `IDraftListing.customRules`
 * (newline-joined) so the guest-side `houseRulesFromDraft()` doesn't need
 * to change.
 */
@Component({
  selector: 'cnt-phase3-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        House rules
      </h2>
      <p class="text-sm font-body text-muted-text mb-8">
        Guests agree to your rules + the
        <a routerLink="/terms" class="text-trinidad hover:underline">CurbNTurf platform rules</a>
        at checkout.
      </p>

      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-4">Standard rules</h3>
        <div class="space-y-3">
          @for (item of items; track item.key) {
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="rules[item.key]" [name]="item.key" (change)="emit()"
                class="w-4 h-4 accent-trinidad">
              <span class="text-sm font-body text-dark-text">{{ item.label }}</span>
            </label>
          }
        </div>

        @if (customRulesList.length > 0) {
          <div class="mt-6 pt-5 border-t border-dark-text/10">
            <h3 class="font-headline font-bold text-dark-text text-base mb-4">Your rules</h3>
            <div class="space-y-3">
              @for (rule of customRulesList; track rule; let i = $index) {
                <div class="flex items-center gap-3">
                  <input type="checkbox" checked disabled
                    class="w-4 h-4 accent-trinidad opacity-90 cursor-default"
                    aria-label="Custom rule (remove to disable)">
                  <span class="text-sm font-body text-dark-text flex-1">{{ rule }}</span>
                  <button type="button" (click)="removeCustomRule(i)"
                    class="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-text hover:bg-dark-text/5 hover:text-trinidad transition-colors"
                    [attr.aria-label]="'Remove rule: ' + rule">
                    <span class="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- Add custom rule -->
        <div class="mt-6 pt-5 border-t border-dark-text/10">
          <h3 class="font-headline font-bold text-dark-text text-base mb-1">Add your own</h3>
          <p class="text-xs font-body text-muted-text mb-3">
            Pets, generators, fires, drones — whatever matters for your spot.
          </p>
          <div class="flex flex-col sm:flex-row gap-2">
            <input type="text" [(ngModel)]="newCustomRule" name="newCustomRule"
              [maxlength]="ruleMaxLength"
              [disabled]="atLimit"
              (keydown.enter)="addCustomRule(); $event.preventDefault()"
              placeholder="e.g. No drone use after dark"
              class="flex-1 bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 disabled:opacity-50 transition-all">
            <button type="button" (click)="addCustomRule()"
              [disabled]="!canAdd"
              class="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-md bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
              <span class="material-symbols-outlined text-base">add</span>
              Add
            </button>
          </div>
          @if (atLimit) {
            <p class="mt-2 text-[0.65rem] font-body text-muted-text">
              Limit reached ({{ ruleLimit }} custom rules). Remove one to add another.
            </p>
          } @else if (newCustomRule.trim() && isDuplicate) {
            <p class="mt-2 text-[0.65rem] font-body text-trinidad">
              You've already added that rule.
            </p>
          }
        </div>
      </div>
    </div>
  `,
})
export class Phase3RulesComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.rules = { ...DEFAULT_RULES, ...(value?.rules ?? {}) };
    this.customRules = value?.customRules ?? '';
    this.customRulesList = this.parseRules(this.customRules);
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  rules: IHouseRules = { ...DEFAULT_RULES };
  customRules = '';
  customRulesList: string[] = [];
  newCustomRule = '';

  readonly ruleLimit = MAX_CUSTOM_RULES;
  readonly ruleMaxLength = MAX_RULE_LENGTH;
  readonly items: { key: keyof IHouseRules; label: string }[] = [
    { key: 'noSmoking',   label: 'No smoking on the property' },
    { key: 'noParties',   label: 'No parties or events' },
    { key: 'quietHours',  label: 'Quiet hours 10 PM – 7 AM' },
    { key: 'noFireworks', label: 'No fireworks on the premises' },
    { key: 'noFirearms',  label: 'No firearms on the premises' },
  ];

  get atLimit(): boolean {
    return this.customRulesList.length >= MAX_CUSTOM_RULES;
  }

  get isDuplicate(): boolean {
    const t = this.newCustomRule.trim().toLowerCase();
    return !!t && this.customRulesList.some(r => r.toLowerCase() === t);
  }

  get canAdd(): boolean {
    return !this.atLimit && !!this.newCustomRule.trim() && !this.isDuplicate;
  }

  addCustomRule(): void {
    if (!this.canAdd) return;
    const t = this.newCustomRule.trim();
    this.customRulesList = [...this.customRulesList, t];
    this.customRules = this.customRulesList.join('\n');
    this.newCustomRule = '';
    this.emit();
  }

  removeCustomRule(index: number): void {
    this.customRulesList = this.customRulesList.filter((_, i) => i !== index);
    this.customRules = this.customRulesList.join('\n');
    this.emit();
  }

  emit(): void {
    this.patch.emit({ rules: { ...this.rules }, customRules: this.customRules });
  }

  /** Parse the persisted newline-joined string back into a trimmed, de-duped list. */
  private parseRules(raw: string): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const line of (raw || '').split('\n').map(l => l.trim()).filter(Boolean)) {
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(line);
      if (out.length >= MAX_CUSTOM_RULES) break;
    }
    return out;
  }
}
