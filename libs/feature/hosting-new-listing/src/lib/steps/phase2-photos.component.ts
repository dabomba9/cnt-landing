import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { IDraftListing, ToastService, downscalePhoto } from '@cnt-workspace/data-access';

/**
 * Step 2.1 — property photos. Min 3, max 10. Each upload is downscaled to
 * ~1200px JPEG (~85% quality) on the client before being stored as a data URL
 * in localStorage via the draft service.
 */
@Component({
  selector: 'cnt-phase2-photos',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div>
      <h2 class="font-headline font-bold text-dark-text text-2xl md:text-3xl tracking-tight mb-2">
        Add at least 3 photos
      </h2>
      <p class="text-sm font-body text-muted-text mb-2">Wide, well-lit shots of where guests will stay.</p>
      <ul class="text-xs font-body text-muted-text mb-8 space-y-1 list-disc list-inside">
        <li>One zoomed-out shot showing where the rig parks.</li>
        <li>Horizontal framing reads best in our cards.</li>
        <li>Hour after sunrise / before sunset = magic light.</li>
      </ul>

      <!-- Photo grid — drag any tile to reorder. The leftmost (index 0) is the Cover photo. -->
      @if (photos.length > 0) {
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2"
          cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="onDrop($event)">
          @for (src of photos; track src; let i = $index) {
            <div cdkDrag class="relative aspect-[4/3] rounded-xl overflow-hidden border border-dark-text/10 bg-cream/40 cursor-grab active:cursor-grabbing">
              <img [src]="src" [alt]="'Photo ' + (i + 1)" class="w-full h-full object-cover pointer-events-none">
              @if (i === 0) {
                <span class="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-trinidad text-white text-[0.55rem] uppercase tracking-[0.12em] font-button font-bold">
                  <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
                  Cover
                </span>
              }
              @if (photos.length > 1) {
                <span class="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/95 backdrop-blur-sm text-dark-text text-[0.55rem] font-button font-bold shadow-sm">
                  <span class="material-symbols-outlined text-[12px]">drag_indicator</span>
                  Drag
                </span>
              }
              <button type="button" (click)="remove(i)" aria-label="Remove photo"
                class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-md inline-flex items-center justify-center hover:bg-trinidad hover:text-white transition-colors">
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          }
        </div>
        @if (photos.length > 1) {
          <p class="text-[0.65rem] font-body text-muted-text mb-6">Drag photos to reorder. The first one is your <span class="font-bold text-trinidad">Cover</span> — it shows on search cards and as your listing's hero image.</p>
        } @else {
          <div class="mb-6"></div>
        }
      }

      <!-- Upload button -->
      @if (photos.length < MAX) {
        <label class="block rounded-2xl border-2 border-dashed border-dark-text/15 bg-white hover:border-trinidad/40 hover:bg-trinidad/2 transition-colors cursor-pointer p-8 text-center"
          [class.opacity-50]="uploading">
          <input type="file" accept="image/*" multiple [disabled]="uploading"
            (change)="onPicked($event)"
            class="sr-only">
          <span class="material-symbols-outlined text-3xl text-trinidad mb-2 block">
            {{ uploading ? 'progress_activity' : 'add_a_photo' }}
          </span>
          <span class="block text-sm font-body font-bold text-dark-text">
            {{ uploading ? 'Processing…' : (photos.length === 0 ? 'Take or upload photos' : 'Add more') }}
          </span>
          <span class="block text-xs font-body text-muted-text mt-1">
            {{ photos.length }}/{{ MAX }} added — drop in or tap. We resize big files automatically.
          </span>
        </label>
      } @else {
        <div class="rounded-2xl border border-jungle-green/30 bg-jungle-green/8 p-4 text-center">
          <span class="text-sm font-body text-jungle-green font-bold">Max {{ MAX }} photos reached.</span>
        </div>
      }

      @if (photos.length > 0 && photos.length < MIN) {
        <p class="mt-4 text-xs font-body text-trinidad text-center font-bold">
          Add {{ MIN - photos.length }} more {{ MIN - photos.length === 1 ? 'photo' : 'photos' }} to continue.
        </p>
      }
    </div>
  `,
})
export class Phase2PhotosComponent {
  @Input() set draft(value: IDraftListing | null) {
    this.photos = [...(value?.photos ?? [])];
  }
  @Output() patch = new EventEmitter<Partial<IDraftListing>>();

  photos: string[] = [];
  uploading = false;
  readonly MIN = 3;
  readonly MAX = 10;

  constructor(private toasts: ToastService) {}

  async onPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;
    this.uploading = true;
    try {
      for (const file of files) {
        if (this.photos.length >= this.MAX) break;
        if (!file.type.startsWith('image/')) {
          this.toasts.error(`${file.name} isn't a supported image.`);
          continue;
        }
        try {
          const dataUrl = await downscalePhoto(file);
          this.photos = [...this.photos, dataUrl];
        } catch {
          this.toasts.error(`Couldn't process ${file.name}.`);
        }
      }
      this.persist();
    } finally {
      this.uploading = false;
      // Reset input so picking the same file again still fires change.
      input.value = '';
    }
  }

  remove(index: number): void {
    this.photos = this.photos.filter((_, i) => i !== index);
    this.persist();
  }

  onDrop(ev: CdkDragDrop<string[]>): void {
    if (ev.previousIndex === ev.currentIndex) return;
    const next = [...this.photos];
    moveItemInArray(next, ev.previousIndex, ev.currentIndex);
    this.photos = next;
    this.persist();
  }

  private persist(): void {
    try {
      this.patch.emit({ photos: this.photos });
    } catch {
      this.toasts.error('Storage is full. Remove a photo to add more.');
    }
  }
}
