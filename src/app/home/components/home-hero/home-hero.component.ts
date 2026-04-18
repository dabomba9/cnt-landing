import { Component, AfterViewInit, ViewChild, ElementRef, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule, DateRange } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'cnt-home-hero',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss'
})
export class HomeHeroComponent implements AfterViewInit {
  @ViewChild('heroVideo') heroVideoRef!: ElementRef<HTMLVideoElement>;

  searchMode: 'destination' | 'roadtrip' = 'destination';
  searchDestination = '';
  searchStartingLocation = '';
  searchRoadtripDestination = '';
  
  videoPlaying = true;
  readonly today = new Date();

  // Rig State 
  isRigDropdownOpen = false;
  rigTypes = ['Class A', 'Class B', 'Class C', 'Fifth Wheel', 'Travel Trailer', 'Truck Camper', 'Popup Camper'];
  rigSelection = { type: '', length: 0, slideOuts: 0, towing: false };

  get rigDisplayText(): string {
    if (!this.rigSelection.type && !this.rigSelection.length) return 'Type & Length';
    const parts = [];
    if (this.rigSelection.type) parts.push(this.rigSelection.type);
    if (this.rigSelection.length) parts.push(`${this.rigSelection.length}ft`);
    return parts.join(' • ');
  }

  // Date State
  isDateDropdownOpen = false;
  selectedDateRange: DateRange<Date> | null = null;

  get dateDisplayText(): string {
    if (!this.selectedDateRange || !this.selectedDateRange.start) return 'Add dates';
    const startStr = this.selectedDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!this.selectedDateRange.end) return startStr;
    const endStr = this.selectedDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private router: Router) {}

  executeSearch(event?: Event): void {
    if (event) event.stopPropagation();
    
    // Construct strict query payload natively mapping all logic cleanly
    const queryParams: any = { mode: this.searchMode };
    
    if (this.searchMode === 'destination' && this.searchDestination) {
      queryParams.dest = this.searchDestination;
    } else if (this.searchMode === 'roadtrip') {
      if (this.searchStartingLocation) queryParams.start = this.searchStartingLocation;
      if (this.searchRoadtripDestination) queryParams.dest = this.searchRoadtripDestination;
    }
    
    if (this.selectedDateRange?.start) {
      queryParams.startDate = this.selectedDateRange.start.toISOString();
      if (this.selectedDateRange.end) {
        queryParams.endDate = this.selectedDateRange.end.toISOString();
      }
    }
    
    if (this.rigSelection.type) queryParams.rigType = this.rigSelection.type;
    if (this.rigSelection.length > 0) queryParams.rigLength = this.rigSelection.length;
    if (this.rigSelection.slideOuts > 0) queryParams.rigSlideOuts = this.rigSelection.slideOuts;
    if (this.rigSelection.towing) queryParams.rigTowing = true;

    // Execute absolute payload dynamically pushing native URL configurations
    this.router.navigate(['/search'], { queryParams });
  }

  setSearchMode(mode: 'destination' | 'roadtrip'): void {
    this.searchMode = mode;
    this.isRigDropdownOpen = false;
    this.isDateDropdownOpen = false;
  }

  // Date Methods
  onDateSelected(date: Date) {
    if (!this.selectedDateRange || !this.selectedDateRange.start || (this.selectedDateRange.start && this.selectedDateRange.end)) {
      this.selectedDateRange = new DateRange(date, null);
    } else if (date < this.selectedDateRange.start) {
      this.selectedDateRange = new DateRange(date, null);
    } else {
      this.selectedDateRange = new DateRange(this.selectedDateRange.start, date);
      setTimeout(() => this.isDateDropdownOpen = false, 250);
    }
  }

  toggleDateDropdown(event: Event): void {
    event.stopPropagation();
    this.isDateDropdownOpen = !this.isDateDropdownOpen;
    if (this.isDateDropdownOpen) this.isRigDropdownOpen = false;
  }

  // Rig Methods
  toggleRigDropdown(event: Event): void {
    event.stopPropagation();
    this.isRigDropdownOpen = !this.isRigDropdownOpen;
    if (this.isRigDropdownOpen) this.isDateDropdownOpen = false;
  }

  selectRigType(type: string): void {
    this.rigSelection.type = this.rigSelection.type === type ? '' : type;
  }

  updateLength(val: number): void {
    this.rigSelection.length = Math.max(0, this.rigSelection.length + val);
  }

  updateSlideOuts(val: number): void {
    this.rigSelection.slideOuts = Math.max(0, this.rigSelection.slideOuts + val);
  }

  toggleTowing(): void {
    this.rigSelection.towing = !this.rigSelection.towing;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.isRigDropdownOpen && !target.closest('.rig-dropdown-container') && !target.closest('.cnt-glass-picker')) {
      this.isRigDropdownOpen = false;
    }
    if (this.isDateDropdownOpen && !target.closest('.rig-dropdown-container') && !target.closest('.cnt-glass-picker')) {
      this.isDateDropdownOpen = false;
    }
  }

  toggleVideo(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('.btn-3d-wrap') || target.closest('button')) {
      return; 
    }

    if (this.heroVideoRef && this.heroVideoRef.nativeElement) {
      if (this.videoPlaying) {
        this.heroVideoRef.nativeElement.pause();
      } else {
        this.heroVideoRef.nativeElement.play();
      }
      this.videoPlaying = !this.videoPlaying;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      this.initHeroEntry();
      this.initHeroExpand();
      
      // Force native video playback internally bypassing restrictive browser DOM policies
      this.heroVideoRef?.nativeElement?.play().catch(() => {});
    }
  }

  private initHeroEntry(): void {
    const words = gsap.utils.toArray('.hero-span');
    gsap.set(words, { y: 150, rotateX: 20 });

    gsap.to(words, {
      y: 0,
      rotateX: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'back.out(1.5)',
      delay: 0.1
    });

    const stickyContent = document.querySelector('.sticky-content');
    if (stickyContent) {
      gsap.fromTo(stickyContent,
        { scale: 0 },
        { scale: 1, duration: 1.5, ease: 'elastic.out(1, 0.5)', delay: 0.1 }
      );
    }
  }

  private initHeroExpand(): void {
    const stickyContent = document.querySelector('.sticky-content') as HTMLElement;
    const stickyWrap = document.querySelector('.sticky-wrap-hero') as HTMLElement;
    if (!stickyContent || !stickyWrap) return;

    const update = () => {
      const rect = stickyWrap.getBoundingClientRect();
      const totalScroll = stickyWrap.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / totalScroll));

      const vmin = Math.min(window.innerWidth, window.innerHeight);
      const startPx = vmin * 0.50;

      const targetWidth = window.innerWidth;
      const targetHeight = window.innerHeight;

      const currentW = startPx + (targetWidth - startPx) * (Math.pow(p, 2));
      let currentH = startPx + (targetHeight - startPx) * (Math.pow(p, 2));
      
      const vhOffset = window.innerHeight * 0.5 * p;
      currentH += vhOffset;

      const clampH = Math.min(currentH, targetHeight);

      const borderRadius = 50 * (1 - p);

      if (stickyContent) {
        gsap.set(stickyContent, {
          width: currentW + 'px',
          height: clampH + 'px',
          borderRadius: borderRadius + '%',
          overwrite: 'auto'
        });
      }
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }
}
