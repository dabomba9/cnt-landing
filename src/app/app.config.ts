import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Amplify } from 'aws-amplify';
import { environment } from '../environments/environment';
import { initPublishedSnapshots } from '@cnt-workspace/data-access';

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
    provideRouter(appRoutes),
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
  ],
};
