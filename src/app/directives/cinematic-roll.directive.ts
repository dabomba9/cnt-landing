import { Directive, ElementRef, HostListener, OnInit, Renderer2 } from '@angular/core';
import { gsap } from 'gsap';

@Directive({
  selector: '[cntCinematicRoll]',
  standalone: true
})
export class CinematicRollDirective implements OnInit {
  private el: HTMLElement;
  private innerWrap!: HTMLElement;
  private front!: HTMLElement;
  private back!: HTMLElement;
  private underline!: HTMLElement;
  
  constructor(private elementRef: ElementRef, private renderer: Renderer2) {
    this.el = this.elementRef.nativeElement;
  }

  ngOnInit() {
    // Preserve existing geometry but constrain boundaries physically for the clipping mask
    const isBlock = this.el.classList.contains('block');
    this.renderer.setStyle(this.el, 'position', 'relative');
    this.renderer.setStyle(this.el, 'display', isBlock ? 'block' : 'inline-flex');
    this.renderer.setStyle(this.el, 'overflow', 'hidden');
    this.renderer.setStyle(this.el, 'vertical-align', 'middle');
    
    // Safely extract HTML payload natively wrapping any deep nested icon structures seamlessly
    const contentPayload = this.el.innerHTML || '';
    
    // Completely wipe static DOM payload to rebuild the physics slot-machine wrapper structurally
    this.el.innerHTML = '';
    
    this.innerWrap = this.renderer.createElement('span');
    this.renderer.setStyle(this.innerWrap, 'position', 'relative');
    this.renderer.setStyle(this.innerWrap, 'display', 'inline-flex');
    this.renderer.setStyle(this.innerWrap, 'flex-direction', 'column');
    
    this.front = this.renderer.createElement('span');
    this.front.innerHTML = contentPayload;
    this.renderer.setStyle(this.front, 'display', 'inline-block');
    this.renderer.setStyle(this.front, 'will-change', 'transform, opacity');
    
    this.back = this.renderer.createElement('span');
    this.back.innerHTML = contentPayload;
    this.renderer.setStyle(this.back, 'position', 'absolute');
    this.renderer.setStyle(this.back, 'top', '100%');
    this.renderer.setStyle(this.back, 'left', '0');
    this.renderer.setStyle(this.back, 'display', 'inline-block');
    this.renderer.setStyle(this.back, 'will-change', 'transform, opacity');
    this.renderer.setStyle(this.back, 'opacity', '0'); // start hidden
    
    // Construct Organic Vector Draw (Underline)
    this.underline = this.renderer.createElement('div');
    this.renderer.setStyle(this.underline, 'position', 'absolute');
    this.renderer.setStyle(this.underline, 'bottom', '0px');
    // Offset strictly slightly outside the text boundary
    this.renderer.setStyle(this.underline, 'left', '-2px');
    this.renderer.setStyle(this.underline, 'width', 'calc(100% + 4px)');
    this.renderer.setStyle(this.underline, 'height', '2px');
    this.renderer.setStyle(this.underline, 'border-radius', '2px');
    
    // Contextual Color Switching
    const isFooterWhite = this.el.classList.contains('text-white');
    if (isFooterWhite) {
      this.renderer.setStyle(this.underline, 'background-color', '#ffffff');
    } else {
      this.renderer.setStyle(this.underline, 'background-color', '#DC5B27');
    }
    
    this.renderer.setStyle(this.underline, 'transform-origin', 'right center');
    this.renderer.setStyle(this.underline, 'transform', 'scaleX(0)');
    
    // Bind into the DOM
    this.renderer.appendChild(this.innerWrap, this.front);
    this.renderer.appendChild(this.innerWrap, this.back);
    // Append underline INSIDE innerWrap to bound exactly to the text dimensions instead of the column block!
    this.renderer.appendChild(this.innerWrap, this.underline); 
    this.renderer.appendChild(this.el, this.innerWrap);
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    // Hardware accelerated slot machine rolling physics
    gsap.to(this.front, { yPercent: -100, opacity: 0, duration: 0.45, ease: 'power4.inOut' });
    gsap.to(this.back, { top: '0%', opacity: 1, duration: 0.45, ease: 'power4.inOut' });
    
    // Draw organic underline left-to-right
    gsap.fromTo(this.underline, 
      { transformOrigin: 'left center', scaleX: 0 },
      { scaleX: 1, duration: 0.4, ease: 'power3.out' }
    );
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    // Reverse-matrix snap back
    gsap.to(this.front, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'power4.inOut' });
    gsap.to(this.back, { top: '100%', opacity: 0, duration: 0.45, ease: 'power4.inOut' });
    
    // Retract underline left-to-right
    gsap.fromTo(this.underline, 
      { transformOrigin: 'right center', scaleX: 1 },
      { scaleX: 0, duration: 0.4, ease: 'power3.in' }
    );
  }
}
