/**
 * Runtime environment config. Same file used dev + prod for now;
 * split per-environment later if needed.
 */
export const environment = {
  production: false,
  cognito: {
    userPoolId: 'us-west-2_NioOmxLbR',
    userPoolClientId: '118ur79bvqjuf5pdmokint1rur',
    region: 'us-west-2',
    hostedUiDomain: 'curbnturf-test.auth.us-west-2.amazoncognito.com',
    redirectSignIn: ['http://localhost:4200/auth/callback', 'https://curbnturf.vercel.app/auth/callback'],
    redirectSignOut: ['http://localhost:4200/', 'https://curbnturf.vercel.app/'],
    scopes: ['email', 'openid', 'profile'],
  },
};
