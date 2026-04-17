import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CinematicRollDirective } from '../../../directives/cinematic-roll.directive';

@Component({
  selector: 'cnt-home-locations',
  standalone: true,
  imports: [CommonModule, RouterLink, CinematicRollDirective],
  templateUrl: './home-locations.component.html',
  styleUrl: './home-locations.component.scss'
})
export class HomeLocationsComponent {
  locationsExpanded = true;

  toggleLocations(): void {
    this.locationsExpanded = !this.locationsExpanded;
  }
}
