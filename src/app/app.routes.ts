import { Route } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { ListingDetailsComponent } from './listing-details/listing-details.component';
import { HostSpaceComponent } from './host-space/host-space.component';

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchResultsComponent },
  { path: 'listing', component: ListingDetailsComponent },
  { path: 'host', component: HostSpaceComponent }
];
