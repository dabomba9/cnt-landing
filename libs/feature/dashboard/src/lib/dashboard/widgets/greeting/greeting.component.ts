import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IPublicUser } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-dashboard-greeting',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="relative rounded-3xl border border-dark-text/8 px-6 md:px-10 py-8 md:py-10 overflow-hidden"
      style="background: radial-gradient(ellipse at 95% 0%, rgba(251, 215, 132, 0.35) 0%, transparent 55%), radial-gradient(ellipse at 5% 100%, rgba(41, 93, 66, 0.18) 0%, transparent 50%), linear-gradient(135deg, #ffffff 0%, #f7f5ec 100%);">
    <div class="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
      <div class="min-w-0">
        <span class="text-trinidad font-label uppercase tracking-[0.14em] text-[0.7rem] font-bold block mb-2">{{ timeGreeting }}</span>
        <h1 class="font-headline font-bold text-dark-text tracking-tight leading-[1.05] text-4xl md:text-5xl">
          {{ user?.firstName || 'There' }}, ready for the next stop?
        </h1>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-muted-text font-body">
          @if (verified) {
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-jungle-green/10 text-jungle-green text-[0.6rem] font-button uppercase tracking-[0.12em] font-bold">
              <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">verified</span>
              Verified guest
            </span>
          }
          @if (memberSince) {
            <span>Member since <span class="text-dark-text font-bold">{{ memberSince }}</span></span>
          }
          <span class="hidden md:inline-block w-1 h-1 rounded-full bg-muted-text/40"></span>
          <span class="hidden md:inline">{{ todayLabel }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <button type="button" (click)="switchView.emit()"
          class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-dark-text/8 text-dark-text text-[0.65rem] uppercase tracking-[0.12em] font-button font-bold hover:border-trinidad hover:text-trinidad shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all">
          <span class="material-symbols-outlined text-base">campaign</span>
          Switch to hosting
        </button>
        <a routerLink="/search" class="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-trinidad text-white text-xs uppercase tracking-[0.12em] font-button font-bold hover:opacity-95 shadow-[0_8px_20px_rgba(227,83,13,0.25)] hover:shadow-[0_12px_28px_rgba(227,83,13,0.32)] hover:-translate-y-0.5 transition-all">
          <span class="material-symbols-outlined text-base">explore</span>
          Browse stays
        </a>
      </div>
    </div>
    </div>
  `,
})
export class DashboardGreetingComponent {
  @Input() user: IPublicUser | null = null;
  @Input() verified = false;
  @Input() memberSince?: string;
  @Output() switchView = new EventEmitter<void>();

  /** Time-of-day greeting based on the user's local clock. */
  get timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}
