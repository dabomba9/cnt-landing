import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type Tone = 'jungle' | 'trinidad' | 'gold' | 'neutral';

@Component({
  selector: 'cnt-stat-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative bg-white rounded-2xl border border-dark-text/8 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-5 md:p-6 overflow-hidden transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)]">
      <!-- Soft brand accent in the top-right corner -->
      <div class="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-50 pointer-events-none"
        [ngClass]="{
          'bg-jungle-green/10': tone === 'jungle',
          'bg-trinidad/10': tone === 'trinidad',
          'bg-gold/20': tone === 'gold',
          'bg-dark-text/5': tone === 'neutral'
        }"></div>

      <div class="relative flex items-center gap-2 mb-3">
        <span class="w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
          [ngClass]="{
            'bg-jungle-green/10': tone === 'jungle',
            'bg-trinidad/10': tone === 'trinidad',
            'bg-gold/20': tone === 'gold',
            'bg-dark-text/8': tone === 'neutral'
          }">
          <span class="material-symbols-outlined text-base"
            [ngClass]="{
              'text-jungle-green': tone === 'jungle',
              'text-trinidad': tone === 'trinidad',
              'text-muted-text': tone === 'neutral'
            }"
            [style.color]="tone === 'gold' ? '#b3760e' : null"
            style="font-variation-settings: 'FILL' 1;">{{ icon }}</span>
        </span>
        <span class="text-trinidad font-label uppercase tracking-[0.12em] text-[0.6rem] font-bold leading-tight">{{ label }}</span>
      </div>
      <div class="relative font-headline font-bold tracking-tight leading-none text-3xl md:text-4xl"
        [ngClass]="{
          'text-jungle-green': tone === 'jungle',
          'text-trinidad': tone === 'trinidad',
          'text-dark-text': tone === 'neutral' || tone === 'gold'
        }">{{ value }}</div>

      @if (sparkPath) {
        <svg class="relative mt-3 block" width="100%" height="22" viewBox="0 0 80 22" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient [attr.id]="'spark-grad-' + uid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" [attr.stop-color]="strokeColor" stop-opacity="0.18"></stop>
              <stop offset="100%" [attr.stop-color]="strokeColor" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          <path [attr.d]="sparkAreaPath" [attr.fill]="'url(#spark-grad-' + uid + ')'"></path>
          <polyline [attr.points]="sparkPath" fill="none" [attr.stroke]="strokeColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></polyline>
        </svg>
      }

      @if (trend) {
        <div class="relative text-[0.7rem] text-muted-text font-body mt-2">{{ trend }}</div>
      }
    </div>
  `,
})
export class StatTileComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() icon = 'insights';
  @Input() trend?: string;
  @Input() tone: Tone = 'jungle';
  @Input() spark?: number[];

  /** Unique id for SVG gradient defs, so multiple tiles don't collide. */
  readonly uid = Math.random().toString(36).slice(2, 8);

  /** Sparkline polyline points. Returns '' when no series provided. */
  get sparkPath(): string {
    if (!this.spark || this.spark.length < 2) return '';
    const min = Math.min(...this.spark);
    const max = Math.max(...this.spark);
    const range = max - min || 1;
    const stepX = 80 / (this.spark.length - 1);
    return this.spark
      .map((v, i) => `${(i * stepX).toFixed(2)},${(20 - ((v - min) / range) * 16).toFixed(2)}`)
      .join(' ');
  }

  /** Filled area under the sparkline for a soft tinted glow. */
  get sparkAreaPath(): string {
    if (!this.spark || this.spark.length < 2) return '';
    const points = this.sparkPath.split(' ');
    return `M0,22 L${points.join(' L')} L80,22 Z`;
  }

  get strokeColor(): string {
    switch (this.tone) {
      case 'trinidad': return '#e3530d';
      case 'jungle':   return '#295d42';
      case 'gold':     return '#b3760e';
      default:         return '#222222';
    }
  }
}
