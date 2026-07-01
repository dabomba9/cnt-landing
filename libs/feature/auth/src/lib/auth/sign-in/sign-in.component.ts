import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { AuthService, SeoService, ToastService, FederatedProvider } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-sign-in',
  standalone: true,
  imports: [FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent implements OnInit {
  email = '';
  password = '';
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
      title: 'Log in — CurbNTurf',
      description: 'Log in to manage your trips on CurbNTurf.',
      url: '/signin',
      robots: 'noindex, nofollow',
    });
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    const prefillEmail = this.route.snapshot.queryParamMap.get('email');
    if (prefillEmail) this.email = prefillEmail;
    if (this.auth.currentUser) this.redirectAfterAuth();
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error = null;
    this.submitting = true;
    const result = await this.auth.signIn(this.email, this.password);
    this.submitting = false;
    if (!result.ok) {
      this.error = result.error;
      return;
    }
    this.toasts.success(`Welcome back, ${result.user.firstName || result.user.email}!`);
    this.redirectAfterAuth();
  }

  async onFederated(provider: FederatedProvider): Promise<void> {
    this.error = null;
    try {
      await this.auth.signInWithProvider(provider);
      // Redirect happens; this line rarely runs.
    } catch (e) {
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

  get signUpLink(): { path: string; query: Record<string, string> } {
    return { path: '/signup', query: this.returnTo ? { returnTo: this.returnTo } : {} };
  }
}
