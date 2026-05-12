import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface IPaymentMethod {
  id: string;
  label: string;
  icon: string;
  brand: 'visa' | 'amex' | 'mastercard' | 'discover' | 'other';
  last4: string;
  isDefault: boolean;
}

const PAYMENTS_KEY = 'cnt-payments';

const DEFAULT_METHODS: IPaymentMethod[] = [
  { id: 'card-default', label: 'Visa ending in 4242', icon: 'credit_card', brand: 'visa', last4: '4242', isDefault: true },
  { id: 'card-amex',    label: 'Amex ending in 1005', icon: 'credit_card', brand: 'amex', last4: '1005', isDefault: false },
];

@Injectable({ providedIn: 'root' })
export class PaymentMethodsService {
  private readonly _methods$ = new BehaviorSubject<IPaymentMethod[]>([]);
  readonly methods$: Observable<IPaymentMethod[]> = this._methods$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this._methods$.next(this.read());
  }

  list(): IPaymentMethod[] {
    return this._methods$.value;
  }

  /** Add a new mock card. Only the last 4 digits + brand are stored. */
  add(input: { brand: IPaymentMethod['brand']; last4: string; makeDefault?: boolean }): IPaymentMethod {
    const id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const brandLabel = input.brand.charAt(0).toUpperCase() + input.brand.slice(1);
    const card: IPaymentMethod = {
      id,
      label: `${brandLabel} ending in ${input.last4}`,
      icon: 'credit_card',
      brand: input.brand,
      last4: input.last4,
      isDefault: !!input.makeDefault,
    };
    let next = [...this._methods$.value, card];
    if (card.isDefault) next = next.map(c => ({ ...c, isDefault: c.id === id }));
    this.write(next);
    return card;
  }

  remove(id: string): void {
    const next = this._methods$.value.filter(c => c.id !== id);
    // If we removed the default, promote the first remaining card.
    if (next.length > 0 && !next.some(c => c.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    this.write(next);
  }

  setDefault(id: string): void {
    const next = this._methods$.value.map(c => ({ ...c, isDefault: c.id === id }));
    this.write(next);
  }

  private read(): IPaymentMethod[] {
    if (!isPlatformBrowser(this.platformId)) return DEFAULT_METHODS;
    try {
      const raw = localStorage.getItem(PAYMENTS_KEY);
      if (!raw) {
        this.write(DEFAULT_METHODS);
        return DEFAULT_METHODS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_METHODS;
    } catch {
      return DEFAULT_METHODS;
    }
  }

  private write(methods: IPaymentMethod[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(PAYMENTS_KEY, JSON.stringify(methods)); } catch {}
    }
    this._methods$.next(methods);
  }
}
