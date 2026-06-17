import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '@cnt-workspace/data-access';

/** Mock newsletter signup card. Renders in two variants:
 *  - `'wide'`: large card with eyebrow + headline + sub + form,
 *    used at the bottom of /articles.
 *  - `'compact'`: tighter inline form, used at the foot of the
 *    article-detail body card and below related articles.
 *
 *  TODO(P-future): wire submit to Substack or Mailchimp. Today the
 *  submit just toasts and clears the field — nothing leaves the
 *  browser. Don't ship to production thinking it works.
 */
@Component({
  selector: 'cnt-newsletter-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './newsletter-signup.component.html',
  styleUrl: './newsletter-signup.component.scss',
})
export class NewsletterSignupComponent {
  @Input() variant: 'wide' | 'compact' = 'wide';

  email = '';
  submitting = false;

  constructor(private toasts: ToastService) {}

  submit(): void {
    if (this.submitting) return;
    const trimmed = this.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      this.toasts.info('Check your email address.');
      return;
    }
    this.submitting = true;
    // Mock latency so the button state reads as real. No network call.
    setTimeout(() => {
      this.toasts.success("Thanks for subscribing — we'll be in touch.");
      this.email = '';
      this.submitting = false;
    }, 600);
  }
}
