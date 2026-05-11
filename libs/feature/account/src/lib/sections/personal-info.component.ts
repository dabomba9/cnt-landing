import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, PublicUser, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-account-personal-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8">
      <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Personal info</span>
      <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">Your details</h2>
      <p class="text-xs text-muted-text font-body mb-6">This is what we'll show hosts and what'll appear on your trip receipts.</p>

      <div class="flex items-center gap-4 mb-6 pb-6 border-b border-dark-text/8">
        <div class="relative w-20 h-20 rounded-full overflow-hidden bg-jungle-green text-white flex items-center justify-center font-headline font-bold text-2xl shrink-0">
          @if (photoUrl) {
            <img [src]="photoUrl" alt="Profile photo" class="w-full h-full object-cover">
          } @else {
            {{ initials }}
          }
        </div>
        <div class="flex-1 min-w-0">
          <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-base">photo_camera</span>
            {{ photoUrl ? 'Change photo' : 'Upload photo' }}
            <input type="file" accept="image/*" (change)="onPhoto($event)" class="hidden">
          </label>
          @if (photoUrl) {
            <button type="button" (click)="removePhoto()" class="ml-2 text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text hover:text-trinidad">Remove</button>
          }
          <p class="text-[0.65rem] text-muted-text font-body mt-2">PNG or JPG, up to a few hundred KB.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label class="flex flex-col gap-2">
          <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">First name</span>
          <input type="text" name="firstName" [(ngModel)]="firstName"
            class="bg-cream/60 border border-dark-text/15 rounded-xl px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">Last name</span>
          <input type="text" name="lastName" [(ngModel)]="lastName"
            class="bg-cream/60 border border-dark-text/15 rounded-xl px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
        </label>
        <label class="flex flex-col gap-2 sm:col-span-2">
          <span class="text-xs font-label uppercase tracking-[0.1em] text-muted-text font-bold">Phone <span class="text-muted-text/70 normal-case font-normal">(optional)</span></span>
          <input type="tel" name="phone" [ngModel]="phone" (ngModelChange)="onPhoneInput($event)"
            placeholder="(555) 123-4567"
            class="bg-cream/60 border border-dark-text/15 rounded-xl px-4 py-3 text-sm font-body text-dark-text focus:outline-none focus:border-jungle-green focus:ring-2 focus:ring-jungle-green/15 transition-all">
        </label>
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-5 border-t border-dark-text/8">
        <button type="button" (click)="reset()" class="px-5 py-2.5 rounded-full bg-white border border-dark-text/15 text-dark-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text transition-colors">Reset</button>
        <button type="button" (click)="save()" [disabled]="!isDirty"
          class="px-6 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_16px_rgba(227,83,13,0.25)] transition-opacity">
          Save changes
        </button>
      </div>
    </div>
  `,
})
export class PersonalInfoSectionComponent implements OnInit {
  firstName = '';
  lastName = '';
  phone = '';
  photoUrl: string | undefined = undefined;
  private original: { firstName: string; lastName: string; phone: string; photoUrl: string | undefined } = { firstName: '', lastName: '', phone: '', photoUrl: undefined };

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.hydrate(this.auth.currentUser);
  }

  private hydrate(u: PublicUser | null): void {
    this.firstName = u?.firstName || '';
    this.lastName = u?.lastName || '';
    this.phone = u?.phone || '';
    this.photoUrl = u?.photoUrl;
    this.original = { firstName: this.firstName, lastName: this.lastName, phone: this.phone, photoUrl: this.photoUrl };
  }

  get initials(): string {
    const f = this.firstName[0] || '';
    const l = this.lastName[0] || '';
    return (f + l).toUpperCase() || '?';
  }

  get isDirty(): boolean {
    return this.firstName !== this.original.firstName
        || this.lastName !== this.original.lastName
        || this.phone !== this.original.phone
        || this.photoUrl !== this.original.photoUrl;
  }

  onPhoneInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    else if (digits.length > 0) formatted = `(${digits}`;
    this.phone = formatted;
  }

  onPhoto(e: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.photoUrl = reader.result as string; };
    reader.readAsDataURL(file);
  }

  removePhoto(): void { this.photoUrl = undefined; }

  reset(): void { this.hydrate(this.auth.currentUser); }

  save(): void {
    if (!this.firstName.trim() || !this.lastName.trim()) {
      this.toasts.error('First and last name are required.');
      return;
    }
    const updated = this.auth.updateProfile({
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      photoUrl: this.photoUrl,
    });
    if (updated) {
      this.original = { firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone || '', photoUrl: updated.photoUrl };
      this.toasts.success('Profile updated.');
    } else {
      this.toasts.error('Could not save changes.');
    }
  }
}
