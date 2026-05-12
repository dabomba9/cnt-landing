import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { AuthService, SeoService, ToastService, FederatedProvider } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent implements OnInit {
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  isOver18 = false;
  newsletterOptIn = false;
  error: string | null = null;
  submitting = false;
  returnTo: string | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Create account — CurbNTurf',
      description: 'Create a CurbNTurf account to book RV stays and save trips.',
      url: '/signup',
      robots: 'noindex, nofollow',
    });
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    // Persist referral attribution from ?ref= for credit-unlock once backend wiring lands.
    const ref = this.route.snapshot.queryParamMap.get('ref');
    if (ref && isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem('cnt-referred-by', ref); } catch { /* quota */ }
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error = null;
    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters.';
      return;
    }
    if (!this.isOver18) {
      this.error = 'You must confirm you are 18 or older to create an account.';
      return;
    }
    this.submitting = true;
    const result = await this.auth.signUp({
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
    });
    this.submitting = false;
    if (!result.ok) {
      this.error = result.error;
      return;
    }
    if (result.needsConfirmation) {
      this.toasts.info('Check your email for a 6-digit code.');
      this.router.navigate(['/auth/confirm'], { queryParams: { email: this.email.trim().toLowerCase() } });
      return;
    }
    // Rare: auto-confirmed pools won't hit the confirmation step.
    this.toasts.success(`Account created — welcome, ${result.user.firstName}!`);
    this.redirectAfterAuth();
  }

  async onFederated(provider: FederatedProvider): Promise<void> {
    this.error = null;
    try {
      await this.auth.signInWithProvider(provider);
    } catch {
      this.error = `Could not start ${provider} sign-in. Try again or use email.`;
    }
  }

  private redirectAfterAuth(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const target = this.returnTo || '/dashboard';
    const [path, query] = target.split('?');
    const queryParams: Record<string, string> = {};
    if (query) {
      for (const part of query.split('&')) {
        const [k, v] = part.split('=');
        if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
      }
    }
    this.router.navigate([path], { queryParams });
  }

  get signInLink(): { path: string; query: Record<string, string> } {
    return { path: '/signin', query: this.returnTo ? { returnTo: this.returnTo } : {} };
  }
}
