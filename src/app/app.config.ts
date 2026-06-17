import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Amplify } from 'aws-amplify';
import { environment } from '../environments/environment';
import { initPublishedSnapshots, DateTriggerService } from '@cnt-workspace/data-access';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: environment.cognito.userPoolId,
      userPoolClientId: environment.cognito.userPoolClientId,
      loginWith: {
        oauth: {
          domain: environment.cognito.hostedUiDomain,
          scopes: environment.cognito.scopes,
          redirectSignIn: environment.cognito.redirectSignIn,
          redirectSignOut: environment.cognito.redirectSignOut,
          responseType: 'code',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    // P43/A — restore scroll position on back/forward nav
    // (e.g. /search → listing detail → back lands the visitor
    // on the same card they clicked). anchorScrolling enables
    // `#fragment` deep links used by /articles TOC + share bar.
    provideRouter(
      appRoutes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideIonicAngular({}),
    // Populate the published-snapshot IDB cache before any route resolves so
    // user-published listings hydrate consistently no matter where the user
    // lands first (search, listing detail, hosting, deep link, etc.).
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => () => initPublishedSnapshots(),
    },
    // Eagerly instantiate DateTriggerService so its bookings-stream
    // subscription + 60-min recheck timer are running from app load,
    // not from the first time a feature happens to inject it.
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [DateTriggerService],
      useFactory: () => () => Promise.resolve(),
    },
  ],
};
