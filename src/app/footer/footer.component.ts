import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CinematicRollDirective } from '../directives/cinematic-roll.directive';

@Component({
  selector: 'curbnturf-footer',
  standalone: true,
  imports: [RouterLink, CinematicRollDirective],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {}
