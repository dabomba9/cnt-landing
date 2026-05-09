import { Route } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { authGuard } from './auth/auth.guard';

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  {
    path: 'signin',
    loadComponent: () => import('./auth/sign-in/sign-in.component').then(m => m.SignInComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/sign-up/sign-up.component').then(m => m.SignUpComponent),
  },
  {
    path: 'booking/review',
    canActivate: [authGuard],
    loadComponent: () => import('./booking/review/booking-review.component').then(m => m.BookingReviewComponent),
  },
  {
    path: 'booking/confirm/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./booking/confirm/booking-confirm.component').then(m => m.BookingConfirmComponent),
  },
  {
    path: 'trips',
    canActivate: [authGuard],
    loadComponent: () => import('./trips/trips.component').then(m => m.TripsComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'hosting',
    canActivate: [authGuard],
    loadComponent: () => import('./host-dashboard/host-dashboard.component').then(m => m.HostDashboardComponent),
  },
  // Legacy redirect for any saved bookmarks of the old path.
  { path: 'host/dashboard', redirectTo: 'hosting', pathMatch: 'full' },
  {
    path: 'search',
    loadComponent: () =>
      import('./search-results/search-results.component').then(m => m.SearchResultsComponent),
  },
  {
    path: 'listing',
    loadComponent: () =>
      import('./listing-details/listing-details.component').then(m => m.ListingDetailsComponent),
  },
  {
    path: 'host',
    loadComponent: () =>
      import('./host-space/host-space.component').then(m => m.HostSpaceComponent),
  },
  {
    path: 'faq',
    loadComponent: () => import('./faq/faq.component').then(m => m.FaqComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact.component').then(m => m.ContactComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./privacy/privacy.component').then(m => m.PrivacyComponent),
  },
  {
    path: 'terms',
    loadComponent: () => import('./terms/terms.component').then(m => m.TermsComponent),
  },
  {
    path: 'cookies',
    loadComponent: () => import('./cookies/cookies.component').then(m => m.CookiesComponent),
  },
  {
    path: 'grow',
    loadComponent: () => import('./grow/grow.component').then(m => m.GrowComponent),
  },
  {
    path: 'host-resources',
    loadComponent: () =>
      import('./host-resources/host-resources.component').then(m => m.HostResourcesComponent),
  },
  {
    path: 'articles',
    loadComponent: () =>
      import('./articles/articles.component').then(m => m.ArticlesComponent),
  },
  {
    path: 'explore/:state',
    loadComponent: () =>
      import('./explore-state/explore-state.component').then(m => m.ExploreStateComponent),
  },
  // 404 — any unmatched path. Component sets `noindex, nofollow` via SeoService
  // so the URL doesn't accidentally get crawled.
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
