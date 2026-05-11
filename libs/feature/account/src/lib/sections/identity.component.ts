import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { IdVerifyModalComponent } from '@cnt-workspace/auth';
import { AuthService, PublicUser } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-account-identity',
  standalone: true,
  imports: [CommonModule, IdVerifyModalComponent],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8">
      <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Trust</span>
      <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">Identity verification</h2>
      <p class="text-xs text-muted-text font-body mb-6">Verified guests get faster approvals and access to Instant Book stays.</p>

      @if (user?.verified) {
        <div class="flex items-start gap-4 p-5 rounded-2xl bg-jungle-green/5 border border-jungle-green/20">
          <span class="w-12 h-12 rounded-full bg-jungle-green/15 inline-flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-2xl text-jungle-green" style="font-variation-settings: 'FILL' 1;">verified</span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="font-headline font-bold text-dark-text">You're verified</div>
            <p class="text-xs text-muted-text font-body mt-1">
              {{ idTypeLabel }} ending in {{ user?.idLastFour || '••••' }}
              @if (user?.verifiedAt) { · since {{ verifiedDateLabel }} }
            </p>
          </div>
        </div>
      } @else {
        <div class="flex items-start gap-4 p-5 rounded-2xl bg-gold/10 border border-gold/40">
          <span class="w-12 h-12 rounded-full bg-gold/30 inline-flex items-center justify-center shrink-0" style="color: #b3760e;">
            <span class="material-symbols-outlined text-2xl">badge</span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="font-headline font-bold text-dark-text">Not yet verified</div>
            <p class="text-xs text-muted-text font-body mt-1">Takes about a minute — we only ask for a government ID.</p>
          </div>
          <button type="button" (click)="open()" class="shrink-0 px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity">Verify now</button>
        </div>
      }
    </div>

    <cnt-id-verify-modal [open]="modalOpen" (closed)="modalOpen = false" (verified)="onVerified()"></cnt-id-verify-modal>
  `,
})
export class IdentitySectionComponent implements OnInit, OnDestroy {
  user: PublicUser | null = null;
  modalOpen = false;
  private sub: Subscription | null = null;

  constructor(private auth: AuthService) {}

  ngOnInit(): void { this.sub = this.auth.currentUser$.subscribe(u => (this.user = u)); }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  open(): void { this.modalOpen = true; }

  onVerified(): void {
    this.modalOpen = false;
    this.user = this.auth.currentUser;
  }

  get idTypeLabel(): string {
    switch (this.user?.idType) {
      case 'drivers-license': return "Driver's license";
      case 'passport':        return 'Passport';
      case 'state-id':        return 'State ID';
      default:                return 'Government ID';
    }
  }

  get verifiedDateLabel(): string {
    if (!this.user?.verifiedAt) return '';
    try { return new Date(this.user.verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  }
}
