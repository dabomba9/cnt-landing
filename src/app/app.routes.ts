import { Route } from '@angular/router';
import { HomeComponent } from '@cnt-workspace/home';
import { authGuard } from '@cnt-workspace/data-access';

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  {
    path: 'signin',
    loadComponent: () => import('@cnt-workspace/auth').then(m => m.SignInComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('@cnt-workspace/auth').then(m => m.SignUpComponent),
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
    path: 'inbox',
    canActivate: [authGuard],
    loadComponent: () => import('./inbox/inbox.component').then(m => m.InboxComponent),
  },
  {
    path: 'inbox/:threadId',
    canActivate: [authGuard],
    loadComponent: () => import('./inbox/inbox.component').then(m => m.InboxComponent),
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
    loadComponent: () => import('@cnt-workspace/host-space').then(m => m.HostSpaceComponent),
  },
  {
    path: 'faq',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.FaqComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.ContactComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.PrivacyComponent),
  },
  {
    path: 'terms',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.TermsComponent),
  },
  {
    path: 'cookies',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.CookiesComponent),
  },
  {
    path: 'grow',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.GrowComponent),
  },
  {
    path: 'host-resources',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.HostResourcesComponent),
  },
  {
    path: 'articles',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.ArticlesComponent),
  },
  {
    path: 'explore/:state',
    loadComponent: () => import('@cnt-workspace/explore').then(m => m.ExploreStateComponent),
  },
  {
    path: '**',
    loadComponent: () => import('@cnt-workspace/content').then(m => m.NotFoundComponent),
  },
];
