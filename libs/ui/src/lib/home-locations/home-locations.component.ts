import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';
import { CinematicRollDirective } from '@cnt-workspace/ui';

@Component({
  selector: 'cnt-home-locations',
  standalone: true,
  imports: [RouterLink, CinematicRollDirective],
  templateUrl: './home-locations.component.html',
  styleUrl: './home-locations.component.scss'
})
export class HomeLocationsComponent {
  locationsExpanded = true;

  toggleLocations(): void {
    this.locationsExpanded = !this.locationsExpanded;
  }
}
