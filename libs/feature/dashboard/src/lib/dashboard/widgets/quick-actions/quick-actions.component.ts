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
    <div class="flex flex-wrap gap-2">
      @for (a of actions; track a.label) {
        <a [routerLink]="a.routerLink" [queryParams]="a.queryParams || {}" [fragment]="a.fragment || undefined"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold transition-all"
          [ngClass]="a.primary
            ? 'bg-trinidad text-white shadow-[0_6px_16px_rgba(227,83,13,0.25)] hover:opacity-95 hover:-translate-y-0.5'
            : 'bg-white border border-dark-text/8 text-dark-text hover:border-trinidad hover:text-trinidad shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5'">
          <span class="material-symbols-outlined text-base">{{ a.icon }}</span>
          {{ a.label }}
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
