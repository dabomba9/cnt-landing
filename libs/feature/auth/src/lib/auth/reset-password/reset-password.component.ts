import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { AuthService, SeoService, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream bg-grid-subtle">
      <section class="px-[2%] py-12 md:py-16">
        <div class="max-w-md mx-auto bg-white rounded-2xl border border-dark-text/8 shadow-[0_8px_24px_rgba(0,0,0,0.04)] p-6 md:p-8">
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Reset</span>
          <h1 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight leading-tight mb-2">Choose a new password</h1>
          <p class="text-sm text-muted-text font-body mb-6">
            Enter the 6-digit code we emailed to <span class="font-bold text-dark-text">{{ email }}</span>, then your new password.
          </p>

          <div class="space-y-4 mb-5">
            <label class="flex flex-col gap-2">
              <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">Code</span>
              <input type="text" inputmode="numeric" maxlength="6" name="code" [(ngModel)]="code" placeholder="123456"
                class="bg-cream/60 border border-dark-text/15 rounded-md px-4 py-3 text-base font-body text-dark-text tracking-[0.4em] text-center focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
            </label>
            <label class="flex flex-col gap-2">
              <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">New password</span>
              <input type="password" name="next" [(ngModel)]="next"
                class="bg-cream/60 border border-dark-text/15 rounded-md px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
            </label>
            <label class="flex flex-col gap-2">
              <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">Confirm new password</span>
              <input type="password" name="confirm" [(ngModel)]="confirm"
                class="bg-cream/60 border border-dark-text/15 rounded-md px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
            </label>
          </div>

          @if (error) {
            <div class="rounded-md bg-trinidad/5 border border-trinidad/30 p-3 text-trinidad text-sm font-body inline-flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-base">error</span>{{ error }}
            </div>
          }

          <button type="button" (click)="submit()" [disabled]="!canSubmit || submitting"
            class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-trinidad text-white font-button uppercase tracking-[0.12em] text-xs font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(227,83,13,0.25)]">
            @if (submitting) {
              <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Resetting…
            } @else {
              Reset password
            }
          </button>

          <p class="text-center mt-5 text-xs font-body text-muted-text">
            <a routerLink="/auth/forgot-password" class="text-trinidad font-bold hover:underline">Use a different email</a>
          </p>
        </div>
      </section>
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toasts = inject(ToastService);
  private seo = inject(SeoService);

  email = '';
  code = '';
  next = '';
  confirm = '';
  submitting = false;
  error: string | null = null;

  ngOnInit(): void {
    this.seo.update({ title: 'Reset password — CurbNTurf', description: 'Choose a new password.', url: '/auth/reset-password', robots: 'noindex, nofollow' });
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    if (!this.email) this.router.navigate(['/auth/forgot-password']);
  }

  get canSubmit(): boolean {
    return /^\d{6}$/.test(this.code) && this.next.length >= 8 && this.next === this.confirm;
  }

  async submit(): Promise<void> {
    this.error = null;
    if (this.next !== this.confirm) { this.error = "Passwords don't match."; return; }
    this.submitting = true;
    const result = await this.auth.confirmForgotPassword(this.email, this.code, this.next);
    this.submitting = false;
    if (!result.ok) { this.error = result.error; return; }
    this.toasts.success('Password reset — please sign in.');
    this.router.navigate(['/signin'], { queryParams: { email: this.email } });
  }
}
