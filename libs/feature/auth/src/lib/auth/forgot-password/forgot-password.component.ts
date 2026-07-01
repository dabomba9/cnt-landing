import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { AuthService, SeoService, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream bg-grid-subtle">
      <section class="px-[2%] py-12 md:py-16">
        <div class="max-w-md mx-auto bg-white rounded-2xl border border-dark-text/8 shadow-[0_8px_24px_rgba(0,0,0,0.04)] p-6 md:p-8">
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Reset</span>
          <h1 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight leading-tight mb-2">Forgot password?</h1>
          <p class="text-sm text-muted-text font-body mb-6">Enter your email and we'll send a code to reset your password.</p>

          <label class="flex flex-col gap-2 mb-5">
            <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">Email</span>
            <input type="email" name="email" [(ngModel)]="email" placeholder="you@example.com"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>

          @if (error) {
            <div class="rounded-md bg-trinidad/5 border border-trinidad/30 p-3 text-trinidad text-sm font-body inline-flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-base">error</span>{{ error }}
            </div>
          }

          <button type="button" (click)="submit()" [disabled]="!canSubmit || submitting"
            class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-trinidad text-white font-button uppercase tracking-[0.12em] text-xs font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(227,83,13,0.25)]">
            @if (submitting) {
              <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Sending…
            } @else {
              Send reset code
            }
          </button>

          <p class="text-center mt-5 text-xs font-body text-muted-text">
            Remembered it? <a routerLink="/signin" class="text-trinidad font-bold hover:underline">Sign in</a>
          </p>
        </div>
      </section>
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class ForgotPasswordComponent implements OnInit {
  email = '';
  submitting = false;
  error: string | null = null;

  constructor(private auth: AuthService, private router: Router, private toasts: ToastService, private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.update({ title: 'Forgot password — CurbNTurf', description: 'Reset your CurbNTurf password.', url: '/auth/forgot-password', robots: 'noindex, nofollow' });
  }

  get canSubmit(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()); }

  async submit(): Promise<void> {
    this.error = null;
    this.submitting = true;
    const result = await this.auth.forgotPassword(this.email);
    this.submitting = false;
    if (!result.ok) { this.error = result.error; return; }
    this.toasts.success('Code sent — check your email.');
    this.router.navigate(['/auth/reset-password'], { queryParams: { email: this.email.trim().toLowerCase() } });
  }
}
