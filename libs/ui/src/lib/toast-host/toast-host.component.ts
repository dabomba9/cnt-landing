import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-toast-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-24 right-4 left-4 sm:left-auto sm:right-6 z-[10001] flex flex-col items-stretch sm:items-end gap-2 pointer-events-none" aria-live="polite" aria-atomic="true">
      @for (t of (toasts.toasts$ | async); track t.id) {
        <div class="cnt-toast pointer-events-auto inline-flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.14)] bg-white border max-w-md"
          [ngClass]="{
            'border-jungle-green/30': t.tone === 'success',
            'border-trinidad/30': t.tone === 'error',
            'border-gold/40': t.tone === 'warn',
            'border-dark-text/15': t.tone === 'info'
          }">
          <span class="material-symbols-outlined text-lg shrink-0"
            [style.color]="t.tone === 'success' ? '#295d42' : t.tone === 'error' ? '#9a3f0a' : t.tone === 'warn' ? '#b3760e' : '#222222'"
            style="font-variation-settings: 'FILL' 1;">
            {{ t.tone === 'success' ? 'check_circle' : t.tone === 'error' ? 'error' : t.tone === 'warn' ? 'warning' : 'info' }}
          </span>
          <span class="text-sm font-body text-dark-text flex-1">{{ t.message }}</span>
          @if (t.actionLabel) {
            <button type="button" (click)="t.action?.(); toasts.dismiss(t.id)"
              class="text-xs font-button uppercase tracking-[0.12em] font-bold text-trinidad hover:underline shrink-0">{{ t.actionLabel }}</button>
          }
          <button type="button" (click)="toasts.dismiss(t.id)" aria-label="Dismiss"
            class="shrink-0 text-muted-text hover:text-dark-text">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .cnt-toast { animation: cnt-toast-pop 220ms cubic-bezier(0.2, 0.8, 0.2, 1); }
    @keyframes cnt-toast-pop {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .cnt-toast { animation: none; }
    }
  `],
})
export class ToastHostComponent {
  constructor(public toasts: ToastService) {}
}
