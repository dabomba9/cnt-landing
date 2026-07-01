import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { AuthService, SeoService, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-auth-redirect',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream bg-grid-subtle">
      <section class="px-[2%] py-12 md:py-16">
        <div class="max-w-md mx-auto bg-white rounded-2xl border border-dark-text/8 shadow-[0_8px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 text-center">

          @if (state === 'loading') {
            <span class="material-symbols-outlined text-4xl text-trinidad animate-spin">progress_activity</span>
            <p class="mt-4 text-sm font-body text-muted-text">Confirming your email…</p>
          }

          @if (state === 'success') {
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-jungle-green/10 mb-4">
              <span class="material-symbols-outlined text-3xl text-jungle-green" style="font-variation-settings: 'FILL' 1;">verified</span>
            </div>
            <h1 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight leading-tight mb-2">Email confirmed</h1>
            <p class="text-sm text-muted-text font-body mb-6">Redirecting you to sign in…</p>
          }

          @if (state === 'error') {
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-trinidad/10 mb-4">
              <span class="material-symbols-outlined text-3xl text-trinidad">error</span>
            </div>
            <h1 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight leading-tight mb-2">Couldn't confirm</h1>
            <p class="text-sm text-muted-text font-body mb-5">{{ errorMessage }}</p>
            <div class="flex flex-col gap-2">
              <a routerLink="/signin" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95">
                Try signing in
              </a>
              <a routerLink="/signup" class="text-xs text-muted-text font-body hover:text-trinidad mt-1">Or back to sign up</a>
            </div>
          }
        </div>
      </section>
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class AuthRedirectComponent implements OnInit {
  state: 'loading' | 'success' | 'error' = 'loading';
  errorMessage = '';

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toasts: ToastService,
    private seo: SeoService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.seo.update({ title: 'Confirming your email — CurbNTurf', description: '', url: '/auth/redirect', robots: 'noindex, nofollow' });

    const username = this.route.snapshot.queryParamMap.get('username');
    const code = this.route.snapshot.queryParamMap.get('confirmationCode');

    if (!username || !code) {
      this.state = 'error';
      this.errorMessage = 'This confirmation link is missing required information. Try requesting a new one from the sign-up page.';
      return;
    }

    const result = await this.auth.confirmSignUp(username, code);
    if (result.ok) {
      this.state = 'success';
      this.toasts.success('Email confirmed — please sign in.');
      setTimeout(() => this.router.navigate(['/signin']), 1200);
    } else {
      this.state = 'error';
      this.errorMessage = result.error;
    }
  }
}
