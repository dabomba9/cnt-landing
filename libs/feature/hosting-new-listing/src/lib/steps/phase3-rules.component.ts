import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IDraftListing, IHouseRules } from '@cnt-workspace/data-access';

const DEFAULT_RULES: IHouseRules = {
  noSmoking: true,
  noParties: true,
  quietHours: true,
  noFireworks: false,
  noFirearms: false,
};

/**
 * Step 3.2 — house rules. Five checkboxes for common rules + a free-text
 * field for anything else. Defaults are the safer common set.
 */
@Component({
  selector: 'cnt-phase3-rules',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6 mb-6">
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
      </div>

      <div class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-1">Anything else?</h3>
        <p class="text-xs font-body text-muted-text mb-3">Add custom rules — pets, generators, fires, etc.</p>
        <textarea [(ngModel)]="customRules" name="customRules" rows="4" maxlength="500"
          (input)="emit()"
          placeholder="One rule per line, please."
          class="w-full bg-cream/60 border border-dark-text/15 rounded-md px-3 py-2 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all resize-none"></textarea>
      </div>
    </div>
  `,
})
export class Phase3RulesComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.rules = { ...DEFAULT_RULES, ...(value?.rules ?? {}) };
    this.customRules = value?.customRules ?? '';
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  rules: IHouseRules = { ...DEFAULT_RULES };
  customRules = '';
  readonly items: { key: keyof IHouseRules; label: string }[] = [
    { key: 'noSmoking',   label: 'No smoking on the property' },
    { key: 'noParties',   label: 'No parties or events' },
    { key: 'quietHours',  label: 'Quiet hours 10 PM – 7 AM' },
    { key: 'noFireworks', label: 'No fireworks on the premises' },
    { key: 'noFirearms',  label: 'No firearms on the premises' },
  ];

  emit(): void {
    this.patch.emit({ rules: { ...this.rules }, customRules: this.customRules });
  }
}
