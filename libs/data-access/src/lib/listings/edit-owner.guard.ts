import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { isOwnedByUser } from '../host/mock-host-data';

/**
 * Route guard for `/hosting/listings/:id/edit`. Permits access only when the
 * signed-in user is the recorded owner of the listing (per `cnt-owned-listings`).
 * Anonymous users → /signin with a returnTo; signed-in non-owners → /hosting/listings.
 */
export const editOwnerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.currentUser) {
    return router.createUrlTree(['/signin'], { queryParams: { returnTo: state.url } });
  }
  const idRaw = route.paramMap.get('id');
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id)) return router.createUrlTree(['/hosting/listings']);
  if (!isOwnedByUser(auth.currentUser.email, id)) {
    return router.createUrlTree(['/hosting/listings']);
  }
  return true;
};
