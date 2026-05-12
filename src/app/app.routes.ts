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
    path: 'auth/callback',
    loadComponent: () => import('@cnt-workspace/auth').then(m => m.AuthCallbackComponent),
  },
  {
    path: 'auth/confirm',
    loadComponent: () => import('@cnt-workspace/auth').then(m => m.AuthConfirmComponent),
  },
  {
    path: 'auth/redirect',
    loadComponent: () => import('@cnt-workspace/auth').then(m => m.AuthRedirectComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('@cnt-workspace/auth').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('@cnt-workspace/auth').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'booking/review',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/booking').then(m => m.BookingReviewComponent),
  },
  {
    path: 'booking/confirm/:id',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/booking').then(m => m.BookingConfirmComponent),
  },
  {
    path: 'trips',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/trips').then(m => m.TripsComponent),
  },
  {
    path: 'inbox',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/inbox').then(m => m.InboxComponent),
  },
  {
    path: 'inbox/:threadId',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/inbox').then(m => m.InboxComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/dashboard').then(m => m.DashboardComponent),
  },
  {
    path: 'hosting',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/host-dashboard').then(m => m.HostDashboardComponent),
  },
  {
    path: 'hosting/listings',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/hosting-listings').then(m => m.HostingListingsComponent),
  },
  {
    path: 'hosting/listings/:id/calendar',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/hosting-listings').then(m => m.HostListingCalendarComponent),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/account').then(m => m.AccountComponent),
  },
  {
    path: 'wishlists',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/wishlists').then(m => m.WishlistsComponent),
  },
  {
    path: 'refer',
    canActivate: [authGuard],
    loadComponent: () => import('@cnt-workspace/refer').then(m => m.ReferComponent),
  },
  { path: 'host/dashboard', redirectTo: 'hosting', pathMatch: 'full' },
  {
    path: 'search',
    loadComponent: () =>
      import('@cnt-workspace/search').then(m => m.SearchResultsComponent),
  },
  {
    path: 'listing',
    loadComponent: () =>
      import('@cnt-workspace/listing').then(m => m.ListingDetailsComponent),
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
