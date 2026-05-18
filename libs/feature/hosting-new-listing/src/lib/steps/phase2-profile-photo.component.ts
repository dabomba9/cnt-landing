import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IDraftListing, AuthService, ToastService, downscalePhoto,
} from '@cnt-workspace/data-access';

/**
 * Step 2.4 — host profile photo. Optional; prefills from the user's existing
 * `photoUrl` if they already have one set in their account.
 */
@Component({
  selector: 'cnt-phase2-profile-photo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="text-center">
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Add a profile photo
      </h2>
      <p class="text-sm font-body text-muted-text max-w-md mx-auto mb-8">
        Guests are more comfortable booking with hosts who show their face. Skip if you'd rather not.
      </p>

      <div class="relative inline-block mb-6">
        <div class="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] bg-cream/60">
          @if (photo) {
            <img [src]="photo" alt="Profile photo" class="w-full h-full object-cover">
          } @else {
            <div class="w-full h-full inline-flex items-center justify-center text-muted-text">
              <span class="material-symbols-outlined text-5xl">person</span>
            </div>
          }
        </div>
        @if (photo) {
          <button type="button" (click)="clear()" aria-label="Remove photo"
            class="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-white shadow-lg ring-1 ring-black/5 inline-flex items-center justify-center hover:bg-trinidad hover:text-white transition-colors">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        }
      </div>

      <div>
        <label class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 cursor-pointer transition-opacity shadow-[0_6px_16px_rgba(227,83,13,0.25)]"
          [class.opacity-50]="uploading">
          <input type="file" accept="image/*" [disabled]="uploading"
            (change)="onPicked($event)"
            class="sr-only">
          <span class="material-symbols-outlined text-base">{{ uploading ? 'progress_activity' : 'camera_alt' }}</span>
          {{ uploading ? 'Processing…' : (photo ? 'Change photo' : 'Add photo') }}
        </label>
      </div>

      <p class="mt-6 text-[0.65rem] font-body text-muted-text">
        This is optional — you can skip and come back later.
      </p>
    </div>
  `,
})
export class Phase2ProfilePhotoComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.photo = value?.profilePhoto || this.auth.currentUser?.photoUrl || '';
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  photo = '';
  uploading = false;

  constructor(private auth: AuthService, private toasts: ToastService) {}

  async onPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toasts.error('Pick a JPG or PNG image.');
      return;
    }
    this.uploading = true;
    try {
      this.photo = await downscalePhoto(file, { maxDimension: 600 });
      this.patch.emit({ profilePhoto: this.photo });
    } catch {
      this.toasts.error('Could not process that image.');
    } finally {
      this.uploading = false;
      input.value = '';
    }
  }

  clear(): void {
    this.photo = '';
    this.patch.emit({ profilePhoto: undefined });
  }
}
