import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IDraftListing } from '@cnt-workspace/data-access';

/**
 * Step 2.2 — title + long description with character bounds + live counters.
 * Tips sidebar mirrors the wireframes for guidance.
 */
@Component({
  selector: 'cnt-phase2-name-description',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <!-- Main form -->
      <div class="lg:col-span-2">
        <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
          Give your spot a name
        </h2>
        <p class="text-sm font-body text-muted-text mb-6">
          A short, evocative title. 8–32 characters, no special characters.
        </p>

        <label class="block mb-8">
          <input type="text" [(ngModel)]="title" name="title" maxlength="32" minlength="8"
            (input)="emit()"
            placeholder="e.g. Whispering Pines Vineyard"
            class="w-full bg-white border border-dark-text/15 rounded-md px-4 py-3 text-base font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          <div class="flex justify-end mt-1.5">
            <span class="text-[0.65rem] font-body"
              [class.text-muted-text]="title.length >= 8 && title.length <= 32"
              [class.text-trinidad]="title.length < 8 || title.length > 32">
              {{ title.length }}/32 — min 8
            </span>
          </div>
        </label>

        <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
          Describe your property
        </h2>
        <p class="text-sm font-body text-muted-text mb-4">
          Good views? Vegetation? Privacy? What's nearby?
        </p>

        <label class="block">
          <textarea [(ngModel)]="description" name="description" rows="8" maxlength="2000"
            (input)="emit()"
            placeholder="Tell guests what makes your land special…"
            class="w-full bg-white border border-dark-text/15 rounded-md px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all resize-y"></textarea>
          <div class="flex justify-between mt-1.5 text-[0.65rem] font-body">
            <span [class.text-trinidad]="description.length < 150" [class.text-muted-text]="description.length >= 150">
              {{ description.length < 150 ? (150 - description.length) + ' more characters to reach 150 min.' : '✓ Meets 150 character minimum.' }}
            </span>
            <span class="text-muted-text">{{ description.length }}/2000</span>
          </div>
        </label>
      </div>

      <!-- Tips sidebar -->
      <aside class="rounded-2xl border border-dark-text/10 bg-white p-5 md:p-6">
        <h3 class="font-headline font-bold text-dark-text text-base mb-3">Tips for a great listing</h3>
        <ul class="space-y-2 text-xs font-body text-muted-text leading-relaxed">
          <li class="flex gap-2"><span class="material-symbols-outlined text-[14px] text-trinidad shrink-0 mt-0.5">arrow_forward</span>Lead with what you can see from the site.</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[14px] text-trinidad shrink-0 mt-0.5">arrow_forward</span>3-4 words make the strongest titles.</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[14px] text-trinidad shrink-0 mt-0.5">arrow_forward</span>Mention nearby trails, towns, or food.</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[14px] text-trinidad shrink-0 mt-0.5">arrow_forward</span>Skip email, phone, and URLs — those aren't allowed.</li>
        </ul>
      </aside>
    </div>
  `,
})
export class Phase2NameDescriptionComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.title = value?.title ?? '';
    this.description = value?.description ?? '';
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  title = '';
  description = '';

  emit(): void {
    this.patch.emit({ title: this.title, description: this.description });
  }
}
