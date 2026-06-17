import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/** P39/A2 — placeholder listing-card with shimmering grey blocks.
 *  Rendered as a `@defer` placeholder so the list pane has structure
 *  while the data renders. Pure CSS pulse — no JS. */
@Component({
  selector: 'cnt-listing-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card-skeleton">
      <div class="card-skeleton__image"></div>
      <div class="card-skeleton__body">
        <div class="card-skeleton__line card-skeleton__line--title"></div>
        <div class="card-skeleton__line card-skeleton__line--sub"></div>
        <div class="card-skeleton__row">
          <div class="card-skeleton__line card-skeleton__line--meta"></div>
          <div class="card-skeleton__line card-skeleton__line--price"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-skeleton {
      display: flex;
      flex-direction: column;
      background: #fff;
      border: 1px solid rgba(34, 34, 34, 0.06);
      border-radius: 1rem;
      overflow: hidden;
      min-height: 320px;
    }
    .card-skeleton__image {
      aspect-ratio: 16 / 11;
      background: linear-gradient(90deg,
        rgba(0,0,0,0.04) 25%,
        rgba(0,0,0,0.08) 50%,
        rgba(0,0,0,0.04) 75%
      );
      background-size: 200% 100%;
      animation: card-skeleton-shimmer 1.4s linear infinite;
    }
    .card-skeleton__body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
    .card-skeleton__line {
      height: 12px;
      border-radius: 6px;
      background: linear-gradient(90deg,
        rgba(0,0,0,0.05) 25%,
        rgba(0,0,0,0.10) 50%,
        rgba(0,0,0,0.05) 75%
      );
      background-size: 200% 100%;
      animation: card-skeleton-shimmer 1.4s linear infinite;
    }
    .card-skeleton__line--title { width: 80%; height: 16px; }
    .card-skeleton__line--sub { width: 55%; }
    .card-skeleton__line--meta { width: 35%; }
    .card-skeleton__line--price { width: 25%; height: 18px; }
    .card-skeleton__row { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
    @keyframes card-skeleton-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class ListingCardSkeletonComponent {}
