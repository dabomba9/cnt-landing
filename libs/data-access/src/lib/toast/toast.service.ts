import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastTone = 'success' | 'info' | 'warn' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  /** Optional secondary action label. */
  actionLabel?: string;
  /** Action handler (called when actionLabel button is clicked). */
  action?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts$: Observable<Toast[]> = this._toasts$.asObservable();

  show(message: string, tone: ToastTone = 'info', opts: { actionLabel?: string; action?: () => void; durationMs?: number } = {}): number {
    const id = this.nextId++;
    const toast: Toast = { id, message, tone, actionLabel: opts.actionLabel, action: opts.action };
    this._toasts$.next([...this._toasts$.value, toast]);
    setTimeout(() => this.dismiss(id), opts.durationMs ?? 4000);
    return id;
  }

  success(message: string, opts?: Parameters<ToastService['show']>[2]): number { return this.show(message, 'success', opts); }
  error(message: string, opts?: Parameters<ToastService['show']>[2]): number { return this.show(message, 'error', opts); }
  warn(message: string, opts?: Parameters<ToastService['show']>[2]): number { return this.show(message, 'warn', opts); }
  info(message: string, opts?: Parameters<ToastService['show']>[2]): number { return this.show(message, 'info', opts); }

  dismiss(id: number): void {
    this._toasts$.next(this._toasts$.value.filter(t => t.id !== id));
  }
}
