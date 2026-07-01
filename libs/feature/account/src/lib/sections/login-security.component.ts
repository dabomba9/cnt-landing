import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-account-login-security',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8 space-y-6">
      <div>
        <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Account</span>
        <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">Login & security</h2>
        <p class="text-xs text-muted-text font-body">Your email is your login ID. Reach out to support if you need to change it.</p>
      </div>

      <div class="flex items-start justify-between gap-4 pb-6 border-b border-dark-text/8">
        <div class="flex-1 min-w-0">
          <div class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text font-bold">Email</div>
          <div class="text-sm font-body font-bold text-dark-text mt-0.5 truncate">{{ email }}</div>
        </div>
        <span class="material-symbols-outlined text-muted-text shrink-0 mt-0.5">lock</span>
      </div>

      <div>
        <h3 class="font-headline font-bold text-dark-text text-lg mb-1">Change password</h3>
        <p class="text-xs text-muted-text font-body mb-4">Use at least 8 characters. Don't reuse a password you've used elsewhere.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="flex flex-col gap-2 sm:col-span-2">
            <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">Current password</span>
            <input type="password" name="current" [(ngModel)]="current"
              class="bg-cream/60 border border-dark-text/15 rounded-xl px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">New password</span>
            <input type="password" name="next" [(ngModel)]="next"
              class="bg-cream/60 border border-dark-text/15 rounded-xl px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">Confirm new password</span>
            <input type="password" name="confirm" [(ngModel)]="confirm"
              class="bg-cream/60 border border-dark-text/15 rounded-xl px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>
        </div>
        @if (error) {
          <div class="mt-4 rounded-xl bg-trinidad/5 border border-trinidad/30 p-3 text-trinidad text-sm font-body flex items-start gap-2">
            <span class="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <span class="flex-1">{{ error }}</span>
          </div>
        }
        <div class="flex justify-end gap-3 mt-6 pt-5 border-t border-dark-text/8">
          <button type="button" (click)="save()" [disabled]="!canSave"
            class="px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity">
            Update password
          </button>
        </div>
      </div>

      <div class="pt-6 border-t border-dark-text/8">
        <h3 class="font-headline font-bold text-dark-text text-lg mb-1">Sign out</h3>
        <p class="text-xs text-muted-text font-body mb-4">End your session on this browser. You can sign back in anytime.</p>
        <button type="button" (click)="signOut()" [disabled]="signingOut"
          class="px-5 py-2.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad disabled:opacity-50 transition-colors inline-flex items-center gap-2">
          <span class="material-symbols-outlined text-base">logout</span>
          {{ signingOut ? 'Signing out…' : 'Sign out of this device' }}
        </button>
      </div>
    </div>
  `,
})
export class LoginSecuritySectionComponent {
  private auth = inject(AuthService);
  private toasts = inject(ToastService);
  private router = inject(Router);

  current = '';
  next = '';
  confirm = '';
  error: string | null = null;
  signingOut = false;

  async signOut(): Promise<void> {
    if (this.signingOut) return;
    this.signingOut = true;
    await this.auth.signOut();
    this.toasts.info('Signed out.');
    this.router.navigate(['/']);
  }

  get email(): string { return this.auth.currentUser?.email || ''; }

  get canSave(): boolean {
    return !!(this.current && this.next && this.confirm);
  }

  async save(): Promise<void> {
    this.error = null;
    if (this.next !== this.confirm) {
      this.error = "New passwords don't match.";
      return;
    }
    const result = await this.auth.updatePassword(this.current, this.next);
    if (result.ok) {
      this.toasts.success('Password updated.');
      this.current = ''; this.next = ''; this.confirm = '';
    } else {
      this.error = result.error;
    }
  }
}
