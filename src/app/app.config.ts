import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Amplify } from 'aws-amplify';
import { environment } from '../environments/environment';

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
  providers: [provideRouter(appRoutes), provideAnimationsAsync(), provideIonicAngular({})],
};
