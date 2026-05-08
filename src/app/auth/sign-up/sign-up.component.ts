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
    @Inject(PLATFORM_ID) private platformId: Object,
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
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.error = null;
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }
    if (!this.isOver18) {
      this.error = 'You must confirm you are 18 or older to create an account.';
      return;
    }
    this.submitting = true;
    const result = this.auth.signUp({
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
    this.toasts.success(`Account created — welcome, ${result.user.firstName}!`);
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
