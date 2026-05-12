import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="min-h-screen flex items-center justify-center bg-cream">
      <div class="text-center">
        <span class="material-symbols-outlined text-4xl text-trinidad animate-spin">progress_activity</span>
        <p class="mt-4 text-sm font-body text-muted-text">Finishing sign-in…</p>
      </div>
    </main>
  `,
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toasts: ToastService,
  ) {}

  async ngOnInit(): Promise<void> {
    // Amplify's Hub fires 'signedIn' once it processes the auth code in the URL.
    // We give it a short window, then check.
    const returnTo = this.route.snapshot.queryParamMap.get('state') || '/dashboard';
    const start = Date.now();
    const poll = async (): Promise<void> => {
      if (this.auth.currentUser) {
        this.router.navigateByUrl(returnTo);
        return;
      }
      if (Date.now() - start > 8000) {
        this.toasts.error('Sign-in did not complete. Please try again.');
        this.router.navigate(['/signin']);
        return;
      }
      setTimeout(poll, 200);
    };
    poll();
  }
}
