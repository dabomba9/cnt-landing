import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../navbar/navbar.component';
import { FooterComponent } from '../../footer/footer.component';
import { SeoService } from '../../seo.service';
import { AuthService } from '../auth.service';
import { ToastService } from '../../toast.service';

@Component({
  selector: 'cnt-sign-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent implements OnInit {
  email = '';
  password = '';
  error: string | null = null;
  submitting = false;
  returnTo: string | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
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
    if (this.auth.currentUser) this.redirectAfterAuth();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.error = null;
    this.submitting = true;
    const result = this.auth.signIn(this.email, this.password);
    this.submitting = false;
    if (!result.ok) {
      this.error = result.error;
      return;
    }
    this.toasts.success(`Welcome back, ${result.user.firstName}!`);
    this.redirectAfterAuth();
  }

  onGoogle(): void {
    this.error = null;
    this.submitting = true;
    setTimeout(() => {
      const result = this.auth.signInWithGoogle();
      this.submitting = false;
      this.toasts.success(`Welcome, ${result.user.firstName}!`);
      this.redirectAfterAuth();
    }, 400);
  }

  private redirectAfterAuth(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const target = this.returnTo || '/trips';
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
