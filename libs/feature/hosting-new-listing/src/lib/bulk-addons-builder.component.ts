import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import {
  AuthService, IPublicUser, IPrivateListing, getMyListings,
  HostListingDraftService, IAddOn, SeoService, ToastService, downscalePhoto,
  AddonLibraryService, IAddOnLibraryItem,
} from '@cnt-workspace/data-access';
import {
  ADDON_ICON_CHOICES, ADDON_UNIT_CHOICES, ADDON_STARTER_TEMPLATES, ADDON_DEFAULT_ICON,
} from './steps/phase3-addons.component';

/** Local form shape — same fields as IAddOn minus the id (we mint one per listing on save). */
interface IAddOnDraft {
  label: string;
  description: string;
  icon: string;
  price: number | null;
  unit: IAddOn['unit'];
  photo?: string;
}

/**
 * Bulk add-on builder — write one add-on, attach it to many listings in a
 * single save. Each selected listing gets its own copy of the add-on with a
 * fresh id so future edits in the per-listing editor don't bleed across
 * listings. Save delegates to HostListingDraftService.loadForEdit + saveDraft,
 * which is the same path the wizard and standalone editor use.
 *
 * Route: /hosting/addons (authGuard).
 */
@Component({
  selector: 'cnt-bulk-addons-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  template: `
    <cnt-navbar></cnt-navbar>
    <main class="pt-24 md:pt-28 min-h-screen bg-cream pb-32">
      <section class="px-[2%] py-6 md:py-10">
        <div class="max-w-[80rem] mx-auto px-4 md:px-8">

          <!-- Header -->
          <div class="mb-6">
            <a routerLink="/hosting" class="inline-flex items-center gap-1 text-xs font-button font-bold uppercase tracking-[0.12em] text-muted-text hover:text-trinidad transition-colors mb-2">
              <span class="material-symbols-outlined text-base">arrow_back</span>
              Back to dashboard
            </a>
            <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block">Bulk add-ons</span>
            <h1 class="font-headline font-bold text-dark-text text-3xl md:text-4xl leading-tight">Add one extra, attach to many listings</h1>
            <p class="text-sm text-muted-text font-body mt-1">Write the add-on once and pick which listings to attach it to. Each listing gets its own copy you can edit later.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">

              <!-- Add-on form -->
              <div class="bg-white rounded-2xl border border-dark-text/8 p-5 md:p-6 space-y-5">

                <!-- Your library — saved drafts you can reload into the form. -->
                @if (library.length > 0) {
                  <div>
                    <div class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2 flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-sm text-trinidad">bookmark</span>
                      Your library
                    </div>
                    <div class="flex flex-wrap gap-2">
                      @for (item of library; track item.libraryId) {
                        <span class="inline-flex items-center gap-1.5 pl-3 pr-1 py-1.5 rounded-full bg-trinidad/8 border border-trinidad/30 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold transition-colors">
                          <button type="button" (click)="applyLibraryItem(item)" class="inline-flex items-center gap-1.5 hover:text-trinidad transition-colors">
                            <span class="material-symbols-outlined text-sm text-trinidad">{{ item.icon }}</span>
                            {{ item.label }}
                          </button>
                          <button type="button" (click)="removeLibraryItem(item.libraryId)" aria-label="Remove from library"
                            class="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-trinidad hover:text-white text-muted-text transition-colors">
                            <span class="material-symbols-outlined text-[12px]">close</span>
                          </button>
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- Starter templates -->
                <div>
                  <div class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text mb-2">Start from a template</div>
                  <div class="flex flex-wrap gap-2">
                    @for (t of starters; track t.label) {
                      <button type="button" (click)="applyTemplate(t)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors">
                        <span class="material-symbols-outlined text-sm">{{ t.icon }}</span>
                        {{ t.label }}
                      </button>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-start">
                  <!-- Icon picker -->
                  <div>
                    <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-2">Icon</div>
                    <button type="button" (click)="iconPickerOpen = !iconPickerOpen"
                      class="w-16 h-16 rounded-xl bg-trinidad/10 border border-trinidad/30 inline-flex items-center justify-center hover:border-trinidad transition-colors">
                      <span class="material-symbols-outlined text-3xl text-trinidad">{{ form.icon }}</span>
                    </button>
                    @if (iconPickerOpen) {
                      <div class="relative">
                        <div class="absolute mt-2 z-10 bg-white border border-dark-text/15 rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.12)] p-3 grid grid-cols-6 gap-1.5 max-w-[16rem]">
                          @for (icon of iconChoices; track icon) {
                            <button type="button" (click)="pickIcon(icon)" [attr.aria-label]="icon"
                              [ngClass]="form.icon === icon ? 'bg-trinidad text-white' : 'text-dark-text hover:bg-cream'"
                              class="w-8 h-8 rounded-md inline-flex items-center justify-center transition-colors">
                              <span class="material-symbols-outlined text-lg">{{ icon }}</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Label + description -->
                  <div class="space-y-3">
                    <label class="block">
                      <span class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text">Title</span>
                      <input type="text" [(ngModel)]="form.label" name="label" maxlength="60" placeholder="e.g. Firewood bundle"
                        class="mt-1 w-full bg-cream/60 border border-dark-text/15 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
                    </label>
                    <label class="block">
                      <span class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text">Description</span>
                      <textarea [(ngModel)]="form.description" name="description" rows="2" maxlength="200" placeholder="One sentence — what does the guest get?"
                        class="mt-1 w-full bg-cream/60 border border-dark-text/15 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green resize-none"></textarea>
                    </label>
                  </div>
                </div>

                <!-- Price + unit -->
                <div class="grid grid-cols-2 gap-3">
                  <label class="block">
                    <span class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text">Price</span>
                    <div class="relative mt-1">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-trinidad font-bold">$</span>
                      <input type="number" [(ngModel)]="form.price" name="price" min="0" step="1" placeholder="0"
                        class="w-full bg-cream/60 border border-dark-text/15 rounded-lg pl-7 pr-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
                    </div>
                  </label>
                  <label class="block">
                    <span class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text">Charged</span>
                    <select [(ngModel)]="form.unit" name="unit"
                      class="mt-1 w-full bg-cream/60 border border-dark-text/15 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:border-jungle-green">
                      @for (u of unitChoices; track u) {
                        <option [value]="u">{{ u }}</option>
                      }
                    </select>
                  </label>
                </div>

                <!-- Photo (optional) -->
                <div>
                  <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text mb-2">Photo <span class="text-muted-text font-normal normal-case">(optional)</span></div>
                  <div class="flex items-center gap-3">
                    @if (form.photo) {
                      <img [src]="form.photo" alt="Add-on" class="w-20 h-20 object-cover rounded-lg border border-dark-text/10">
                    } @else {
                      <div class="w-20 h-20 rounded-lg bg-cream border border-dashed border-dark-text/20 inline-flex items-center justify-center">
                        <span class="material-symbols-outlined text-2xl text-muted-text">image</span>
                      </div>
                    }
                    <label class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad cursor-pointer transition-colors">
                      <span class="material-symbols-outlined text-sm">photo_camera</span>
                      {{ form.photo ? 'Change' : 'Upload' }}
                      <input type="file" accept="image/*" (change)="onPhoto($event)" class="hidden">
                    </label>
                    @if (form.photo) {
                      <button type="button" (click)="form.photo = undefined" class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-muted-text hover:text-trinidad">Remove</button>
                    }
                  </div>
                </div>
              </div>

              <!-- Right panel — listings checklist when present, library-only mode otherwise. -->
              @if (listings.length > 0) {
                <aside class="bg-white rounded-2xl border border-dark-text/8 p-5 md:p-6 self-start">
                  <div class="flex items-center justify-between mb-3">
                    <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-dark-text">Your listings</div>
                    <div class="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold">
                      <button type="button" (click)="selectAll()" class="text-trinidad hover:underline">All</button>
                      <span class="text-muted-text">·</span>
                      <button type="button" (click)="clearSelection()" class="text-muted-text hover:text-dark-text">None</button>
                    </div>
                  </div>
                  <div class="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                    @for (l of listings; track l.id) {
                      <label class="flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors"
                        [ngClass]="selectedIds.has(l.id) ? 'bg-trinidad/5 border-trinidad/30' : 'bg-cream/40 border-dark-text/10 hover:border-trinidad/40'">
                        <input type="checkbox" [checked]="selectedIds.has(l.id)" (change)="toggleListing(l.id)" class="sr-only">
                        <span class="w-5 h-5 shrink-0 rounded-md border inline-flex items-center justify-center transition-colors"
                          [ngClass]="selectedIds.has(l.id) ? 'bg-trinidad border-trinidad text-white' : 'bg-white border-dark-text/30 text-transparent'">
                          <span class="material-symbols-outlined text-base leading-none" style="font-variation-settings: 'FILL' 1, 'wght' 700;">check</span>
                        </span>
                        <img [src]="l.image" [alt]="l.title" class="w-10 h-10 object-cover rounded-md border border-dark-text/10 shrink-0">
                        <div class="flex-1 min-w-0">
                          <div class="text-xs font-body font-bold text-dark-text truncate">{{ l.title }}</div>
                          <div class="text-[0.6rem] text-muted-text truncate">{{ l.location }}</div>
                        </div>
                      </label>
                    }
                  </div>
                </aside>
              } @else {
                <aside class="bg-white rounded-2xl border border-dark-text/8 p-5 md:p-6 self-start">
                  <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-trinidad/10 mb-3">
                    <span class="material-symbols-outlined text-2xl text-trinidad">bookmark</span>
                  </div>
                  <div class="text-xs font-label uppercase tracking-[0.12em] font-bold text-trinidad mb-1">Library only</div>
                  <h3 class="font-headline font-bold text-dark-text text-lg leading-tight mb-2">No listings yet — save for later</h3>
                  <p class="text-sm text-muted-text font-body leading-relaxed mb-4">Draft your add-ons now. They'll appear as one-click chips inside any listing you publish later.</p>
                  <a routerLink="/hosting/new" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors no-underline">
                    <span class="material-symbols-outlined text-sm">add</span>
                    Or list your first property
                  </a>
                </aside>
              }
            </div>
        </div>
      </section>

      <!-- Sticky action bar — always present so library-only hosts can save too. -->
      <div class="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-dark-text/10 shadow-[0_-12px_24px_rgba(0,0,0,0.06)]">
        <div class="max-w-[80rem] mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div class="text-sm font-body text-dark-text">
            @if (listings.length > 0) {
              <span class="font-bold">{{ selectedIds.size }}</span> {{ selectedIds.size === 1 ? 'listing' : 'listings' }} selected
            } @else {
              Library mode
            }
            @if (!formValid) { <span class="text-muted-text">· fill the title and price to save</span> }
          </div>
          <div class="flex items-center gap-2">
            <button type="button" (click)="saveToLibrary()" [disabled]="!formValid"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-trinidad/30 text-trinidad text-xs uppercase tracking-[0.12em] font-button font-bold hover:bg-trinidad/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <span class="material-symbols-outlined text-base">bookmark_add</span>
              Save to library
            </button>
            @if (listings.length > 0) {
              <button type="button" (click)="save()" [disabled]="!canSave"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(227,83,13,0.2)]">
                <span class="material-symbols-outlined text-base">save</span>
                Save to {{ selectedIds.size }} {{ selectedIds.size === 1 ? 'listing' : 'listings' }}
              </button>
            }
          </div>
        </div>
      </div>
    </main>
    <curbnturf-footer></curbnturf-footer>
  `,
})
export class BulkAddonsBuilderComponent implements OnInit, OnDestroy {
  user: IPublicUser | null = null;
  listings: IPrivateListing[] = [];
  selectedIds = new Set<number>();
  library: IAddOnLibraryItem[] = [];

  form: IAddOnDraft = {
    label: '',
    description: '',
    icon: ADDON_DEFAULT_ICON,
    price: null,
    unit: 'per stay',
  };
  iconPickerOpen = false;

  readonly iconChoices = ADDON_ICON_CHOICES;
  readonly unitChoices = ADDON_UNIT_CHOICES;
  readonly starters = ADDON_STARTER_TEMPLATES;

  private subs: Subscription[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private auth: AuthService,
    private drafts: HostListingDraftService,
    private libraryService: AddonLibraryService,
    private router: Router,
    private seo: SeoService,
    private toasts: ToastService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Bulk add-ons — CurbNTurf',
      description: 'Add the same extra to many listings at once.',
      url: '/hosting/addons',
      robots: 'noindex, nofollow',
    });
    this.user = this.auth.currentUser;
    if (this.user) this.listings = getMyListings(this.user.email);
    this.subs.push(this.libraryService.library$.subscribe(lib => { this.library = lib; }));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  applyTemplate(t: Omit<IAddOn, 'id'>): void {
    this.form = {
      label: t.label,
      description: t.description,
      icon: t.icon,
      price: t.price,
      unit: t.unit,
      photo: t.photo,
    };
  }

  applyLibraryItem(item: IAddOnLibraryItem): void {
    this.form = {
      label: item.label,
      description: item.description,
      icon: item.icon,
      price: item.price,
      unit: item.unit,
      photo: item.photo,
    };
  }

  removeLibraryItem(libraryId: string): void {
    this.libraryService.remove(libraryId);
    this.toasts.info('Removed from library.');
  }

  saveToLibrary(): void {
    if (!this.formValid) return;
    this.libraryService.add({
      label: this.form.label.trim(),
      description: this.form.description.trim(),
      icon: this.form.icon,
      price: this.form.price ?? 0,
      unit: this.form.unit,
      photo: this.form.photo,
    });
    this.toasts.success('Saved to your library.');
  }

  pickIcon(icon: string): void {
    this.form.icon = icon;
    this.iconPickerOpen = false;
  }

  async onPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !isPlatformBrowser(this.platformId)) return;
    try {
      this.form.photo = await downscalePhoto(file, { maxDimension: 400 });
    } catch {
      this.toasts.error('Could not load that photo.');
    } finally {
      input.value = '';
    }
  }

  toggleListing(id: number): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }
  selectAll(): void { this.selectedIds = new Set(this.listings.map(l => l.id)); }
  clearSelection(): void { this.selectedIds.clear(); }

  get formValid(): boolean {
    return this.form.label.trim().length > 0 && this.form.price != null && this.form.price >= 0;
  }
  get canSave(): boolean { return this.formValid && this.selectedIds.size > 0; }

  save(): void {
    if (!this.canSave) return;
    const ids = Array.from(this.selectedIds);
    let written = 0;
    for (const id of ids) {
      const draft = this.drafts.loadForEdit(id);
      if (!draft) continue;
      const next: IAddOn[] = [
        ...(draft.addOns ?? []),
        {
          id: `addon-${Date.now().toString(36)}-${id}-${Math.random().toString(36).slice(2, 6)}`,
          label: this.form.label.trim(),
          description: this.form.description.trim(),
          icon: this.form.icon,
          price: this.form.price ?? 0,
          unit: this.form.unit,
          photo: this.form.photo,
        },
      ];
      this.drafts.saveDraft({ addOns: next });
      written++;
    }
    if (written === 0) {
      this.toasts.error('No listings were updated.');
      return;
    }
    this.toasts.success(`Added to ${written} ${written === 1 ? 'listing' : 'listings'}.`);
    this.router.navigate(['/hosting']);
  }
}
