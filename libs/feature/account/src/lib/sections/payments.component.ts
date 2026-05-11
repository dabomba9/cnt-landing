import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaymentMethodsService, PaymentMethod, ToastService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-account-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-6 md:p-8">
      <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-1">Wallet</span>
      <h2 class="font-headline font-bold text-dark-text text-xl md:text-2xl leading-tight mb-1">Payment methods</h2>
      <p class="text-xs text-muted-text font-body mb-6">Cards saved here pre-fill the checkout. Demo only — no real billing.</p>

      <div class="space-y-3">
        @for (m of methods; track m.id) {
          <div class="flex items-center gap-3 p-4 rounded-xl border border-dark-text/8 bg-cream/30">
            <span class="material-symbols-outlined text-jungle-green">{{ m.icon }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-body font-bold text-dark-text truncate">{{ m.label }}</div>
              @if (m.isDefault) {
                <div class="text-[0.6rem] uppercase tracking-[0.12em] font-button font-bold text-jungle-green mt-0.5">Default</div>
              }
            </div>
            @if (!m.isDefault) {
              <button type="button" (click)="setDefault(m.id)" class="text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold text-trinidad hover:underline">Make default</button>
            }
            <button type="button" (click)="remove(m.id)" class="w-9 h-9 rounded-full border border-dark-text/15 inline-flex items-center justify-center hover:border-trinidad hover:text-trinidad transition-colors" aria-label="Remove card">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        }
      </div>

      @if (!addOpen) {
        <button type="button" (click)="addOpen = true"
          class="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-dark-text/20 text-muted-text text-xs uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad transition-colors">
          <span class="material-symbols-outlined text-base">add</span>
          Add a card
        </button>
      } @else {
        <div class="mt-4 p-5 rounded-xl bg-cream/40 border border-dark-text/8">
          <div class="text-sm font-body font-bold text-dark-text mb-3">Add a card</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="flex flex-col gap-1">
              <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Brand</span>
              <select name="brand" [(ngModel)]="newBrand" class="bg-white border border-dark-text/15 rounded-lg px-3 py-2.5 text-sm font-body">
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">Amex</option>
                <option value="discover">Discover</option>
              </select>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[0.65rem] font-label uppercase tracking-[0.1em] text-muted-text">Last 4 digits</span>
              <input type="text" maxlength="4" name="last4" [(ngModel)]="newLast4" placeholder="4242"
                class="bg-white border border-dark-text/15 rounded-lg px-3 py-2.5 text-sm font-body">
            </label>
          </div>
          <label class="flex items-center gap-2 mt-3 cursor-pointer">
            <input type="checkbox" name="makeDefault" [(ngModel)]="newMakeDefault" class="w-4 h-4 accent-trinidad cursor-pointer">
            <span class="text-xs font-body text-dark-text">Set as default</span>
          </label>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" (click)="cancelAdd()" class="px-4 py-2 rounded-full bg-white border border-dark-text/15 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-dark-text">Cancel</button>
            <button type="button" (click)="add()" [disabled]="!canAdd"
              class="px-5 py-2 rounded-full bg-trinidad text-white text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed">Add card</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class PaymentsSectionComponent implements OnInit, OnDestroy {
  methods: PaymentMethod[] = [];
  addOpen = false;
  newBrand: PaymentMethod['brand'] = 'visa';
  newLast4 = '';
  newMakeDefault = false;
  private sub: Subscription | null = null;

  constructor(private payments: PaymentMethodsService, private toasts: ToastService) {}

  ngOnInit(): void { this.sub = this.payments.methods$.subscribe(m => (this.methods = m)); }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  get canAdd(): boolean { return /^\d{4}$/.test(this.newLast4); }

  add(): void {
    if (!this.canAdd) return;
    this.payments.add({ brand: this.newBrand, last4: this.newLast4, makeDefault: this.newMakeDefault });
    this.toasts.success('Card added.');
    this.cancelAdd();
  }

  cancelAdd(): void {
    this.addOpen = false;
    this.newLast4 = '';
    this.newBrand = 'visa';
    this.newMakeDefault = false;
  }

  setDefault(id: string): void {
    this.payments.setDefault(id);
    this.toasts.success('Default card updated.');
  }

  remove(id: string): void {
    this.payments.remove(id);
    this.toasts.info('Card removed.');
  }
}
