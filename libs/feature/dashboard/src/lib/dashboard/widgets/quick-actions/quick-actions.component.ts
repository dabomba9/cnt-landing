import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface IQuickAction {
  label: string;
  icon: string;
  routerLink: string | string[];
  queryParams?: Record<string, string | number>;
  fragment?: string;
  primary?: boolean; // trinidad bg
}

@Component({
  selector: 'cnt-quick-actions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
      @for (a of actions; track a.label) {
        <a [routerLink]="a.routerLink" [queryParams]="a.queryParams || {}" [fragment]="a.fragment || undefined"
          class="group flex flex-col items-start gap-3 p-4 md:p-5 rounded-2xl transition-all"
          [ngClass]="a.primary
            ? 'bg-trinidad text-white shadow-[0_10px_24px_rgba(227,83,13,0.18)] hover:shadow-[0_14px_32px_rgba(227,83,13,0.25)] hover:-translate-y-0.5'
            : 'bg-white border border-dark-text/8 text-dark-text hover:border-trinidad shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5'">
          <span class="w-10 h-10 rounded-xl inline-flex items-center justify-center transition-colors"
            [ngClass]="a.primary ? 'bg-white/15' : 'bg-cream/60 group-hover:bg-trinidad/10'">
            <span class="material-symbols-outlined text-xl"
              [ngClass]="a.primary ? 'text-white' : 'text-trinidad'"
              style="font-variation-settings: 'FILL' 1;">{{ a.icon }}</span>
          </span>
          <span class="text-sm font-body font-bold leading-tight">{{ a.label }}</span>
        </a>
      }
    </div>
  `,
})
export class QuickActionsComponent {
  @Input() rvSet = false;
  @Input() verified = false;

  get actions(): IQuickAction[] {
    const list: IQuickAction[] = [
      { label: 'Plan a trip', icon: 'add', routerLink: '/search', primary: true },
    ];
    if (!this.verified) {
      list.push({ label: 'Verify ID', icon: 'verified_user', routerLink: '/account', fragment: 'identity' });
    }
    list.push(
      { label: this.rvSet ? 'Edit my rig' : 'Add my rig', icon: 'rv_hookup', routerLink: '/account', fragment: 'rig' },
      { label: 'My trips', icon: 'luggage', routerLink: '/trips' },
      { label: 'Saved stays', icon: 'favorite', routerLink: '/wishlists' },
    );
    return list;
  }
}
