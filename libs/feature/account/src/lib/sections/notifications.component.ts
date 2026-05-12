import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, INotifPrefs, DEFAULT_NOTIF_PREFS, ToastService } from '@cnt-workspace/data-access';

interface IToggle { id: keyof INotifPrefs; label: string; description: string; }

const TOGGLES: IToggle[] = [
  { id: 'emailUpdates',   label: 'Booking & account emails', description: 'Confirmations, receipts, support replies.' },
  { id: 'hostResponses',  label: 'Host responses',           description: "Notify me when a host approves, declines, or messages." },
  { id: 'tripReminders',  label: 'Trip reminders',           description: 'Nudges before check-in and check-out.' },
  { id: 'marketing',      label: 'Marketing emails',         description: 'New stays, seasonal trips, host stories.' },
];

@Component({
  selector: 'cnt-account-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8">
      <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Inbox</span>
      <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">Notifications</h2>
      <p class="text-xs text-muted-text font-body mb-6">Pick what you want to hear from us about.</p>

      <ul class="divide-y divide-dark-text/8">
        @for (t of toggles; track t.id) {
          <li class="flex items-start justify-between gap-4 py-4">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-body font-bold text-dark-text">{{ t.label }}</div>
              <p class="text-xs text-muted-text font-body mt-0.5">{{ t.description }}</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input type="checkbox" [(ngModel)]="prefs[t.id]" (ngModelChange)="onChange()" class="sr-only peer">
              <span class="w-11 h-6 bg-dark-text/15 rounded-full peer-checked:bg-jungle-green transition-colors"></span>
              <span class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow"></span>
            </label>
          </li>
        }
      </ul>
    </div>
  `,
})
export class NotificationsSectionComponent implements OnInit {
  readonly toggles = TOGGLES;
  prefs: INotifPrefs = { ...DEFAULT_NOTIF_PREFS };
  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor(private auth: AuthService, private toasts: ToastService) {}

  ngOnInit(): void {
    this.prefs = { ...DEFAULT_NOTIF_PREFS, ...(this.auth.currentUser?.notifPrefs || {}) };
  }

  onChange(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(async () => {
      await this.auth.updateProfile({ notifPrefs: { ...this.prefs } });
      this.toasts.success('Notification preferences saved.');
    }, 400);
  }
}
