import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

let panelSeq = 0;

@Component({
  selector: 'cnt-accordion-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accordion-card.component.html',
})
export class AccordionCardComponent {
  @Input({ required: true }) title!: string;
  @Input() open = false;
  @Output() toggled = new EventEmitter<void>();

  /** Stable id so the trigger's aria-controls points to the panel. */
  readonly panelId = `cnt-accordion-panel-${++panelSeq}`;
}
