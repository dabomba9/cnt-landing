import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccordionCardComponent } from './accordion-card.component';

@Component({
  template: `<cnt-accordion-card title="Sample" [open]="o" (toggled)="t = (t ?? 0) + 1"><span class="body-marker">body</span></cnt-accordion-card>`,
  standalone: true,
  imports: [AccordionCardComponent],
})
class HostComponent {
  o = false;
  t: number | null = null;
}

describe('AccordionCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('hides projected content when [open] is false', () => {
    expect(fixture.nativeElement.querySelector('.body-marker')).toBeNull();
  });

  it('renders projected content when [open] is true', () => {
    host.o = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.body-marker')).not.toBeNull();
  });

  it('emits toggled when the trigger button is clicked', () => {
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    expect(host.t).toBe(1);
  });
});
