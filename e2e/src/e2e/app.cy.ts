/**
 * Smoke suite — every public route renders its shell without an uncaught
 * exception, and the auth guard bounces protected routes to /signin.
 *
 * Authed happy-path flows (book-a-stay, publish-listing) need a signed-in
 * Cognito user; the app has no localStorage seed for that, so those specs
 * are deferred until a test-only auth seam exists.
 */

const PUBLIC_ROUTES: { path: string; name: string }[] = [
  { path: '/',                 name: 'home' },
  { path: '/search',           name: 'search' },
  { path: '/listing?id=1',     name: 'listing detail' },
  { path: '/host',             name: 'host promo' },
  { path: '/signin',           name: 'sign in' },
  { path: '/signup',           name: 'sign up' },
  { path: '/faq',              name: 'faq' },
  { path: '/contact',          name: 'contact' },
  { path: '/privacy',          name: 'privacy' },
  { path: '/terms',            name: 'terms' },
];

describe('smoke — public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    it(`renders the ${route.name} page`, () => {
      cy.visit(route.path);
      // Every page mounts the shared navbar; its presence means the route
      // resolved and the component tree booted without throwing.
      cy.get('cnt-navbar', { timeout: 10_000 }).should('exist');
      cy.get('body').should('be.visible');
    });
  }

  it('home page shows the marketing tagline', () => {
    cy.visit('/');
    cy.contains('no subscription required', { matchCase: false }).should('exist');
  });

  it('listing detail renders a heading and the booking widget', () => {
    cy.visit('/listing?id=1');
    cy.get('h1', { timeout: 10_000 }).should('be.visible');
    cy.contains(/night/i).should('exist');
  });
});

describe('smoke — auth guard', () => {
  const GUARDED = ['/dashboard', '/hosting', '/trips', '/account'];

  for (const path of GUARDED) {
    it(`redirects ${path} to /signin when signed out`, () => {
      cy.visit(path);
      cy.location('pathname', { timeout: 10_000 }).should('eq', '/signin');
    });
  }
});
