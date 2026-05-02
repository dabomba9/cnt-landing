import { Route } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { ListingDetailsComponent } from './listing-details/listing-details.component';
import { HostSpaceComponent } from './host-space/host-space.component';
import { FaqComponent } from './faq/faq.component';
import { ContactComponent } from './contact/contact.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { TermsComponent } from './terms/terms.component';
import { CookiesComponent } from './cookies/cookies.component';
import { GrowComponent } from './grow/grow.component';
import { HostResourcesComponent } from './host-resources/host-resources.component';
import { ArticlesComponent } from './articles/articles.component';

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchResultsComponent },
  { path: 'listing', component: ListingDetailsComponent },
  { path: 'host', component: HostSpaceComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'cookies', component: CookiesComponent },
  { path: 'grow', component: GrowComponent },
  { path: 'host-resources', component: HostResourcesComponent },
  { path: 'articles', component: ArticlesComponent }
];
