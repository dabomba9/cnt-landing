import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { AuthService, SeoService, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-auth-confirm',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream bg-grid-subtle">
      <section class="px-[2%] py-12 md:py-16">
        <div class="max-w-md mx-auto bg-white rounded-2xl border border-dark-text/8 shadow-[0_8px_24px_rgba(0,0,0,0.04)] p-6 md:p-8">
          <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Verify</span>
          <h1 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight leading-tight mb-2">Check your email</h1>
          <p class="text-sm text-muted-text font-body mb-6">
            We sent a 6-digit code to <span class="font-bold text-dark-text">{{ email }}</span>. Enter it below to finish setting up your account.
          </p>

          <label class="flex flex-col gap-2 mb-5">
            <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">Confirmation code</span>
            <input type="text" inputmode="numeric" maxlength="6" name="code" [(ngModel)]="code" placeholder="123456"
              class="bg-cream/60 border border-dark-text/15 rounded-md px-4 py-3 text-base font-body text-dark-text tracking-[0.4em] text-center focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
          </label>

          @if (error) {
            <div class="rounded-md bg-trinidad/5 border border-trinidad/30 p-3 text-trinidad text-sm font-body inline-flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-base">error</span>{{ error }}
            </div>
          }

          <button type="button" (click)="confirm()" [disabled]="!canSubmit || submitting"
            class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-trinidad text-white font-button uppercase tracking-[0.12em] text-xs font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(227,83,13,0.25)]">
            @if (submitting) {
              <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Verifying…
            } @else {
              Verify email
            }
          </button>

          <div class="mt-5 flex items-center justify-between text-xs font-body">
            <button type="button" (click)="resend()" [disabled]="resending"
              class="text-trinidad font-bold hover:underline disabled:opacity-50">
              {{ resending ? 'Sending…' : 'Resend code' }}
            </button>
            <a routerLink="/signin" class="text-muted-text hover:text-trinidad">Use a different email</a>
          </div>
        </div>
      </section>
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class AuthConfirmComponent implements OnInit {
  email = '';
  code = '';
  submitting = false;
  resending = false;
  error: string | null = null;

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toasts: ToastService,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({ title: 'Verify your email — CurbNTurf', description: 'Confirm your email to finish signing up.', url: '/auth/confirm', robots: 'noindex, nofollow' });
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    if (!this.email) {
      this.router.navigate(['/signup']);
    }
  }

  get canSubmit(): boolean { return /^\d{6}$/.test(this.code); }

  async confirm(): Promise<void> {
    this.error = null;
    this.submitting = true;
    const result = await this.auth.confirmSignUp(this.email, this.code);
    this.submitting = false;
    if (!result.ok) { this.error = result.error; return; }
    this.toasts.success('Email confirmed — please sign in.');
    this.router.navigate(['/signin'], { queryParams: { email: this.email } });
  }

  async resend(): Promise<void> {
    this.resending = true;
    const result = await this.auth.resendConfirmation(this.email);
    this.resending = false;
    if (result.ok) this.toasts.info('Code resent.');
    else this.toasts.error(result.error);
  }
}
