import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirmSignUp,
  resendSignUpCode as cognitoResendSignUpCode,
  signOut as cognitoSignOut,
  getCurrentUser as cognitoGetCurrentUser,
  fetchUserAttributes as cognitoFetchUserAttributes,
  updateUserAttributes as cognitoUpdateUserAttributes,
  updatePassword as cognitoUpdatePassword,
  resetPassword as cognitoResetPassword,
  confirmResetPassword as cognitoConfirmResetPassword,
  signInWithRedirect,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export type IdType = 'drivers-license' | 'passport' | 'state-id';

export interface INotifPrefs {
  emailUpdates: boolean;
  marketing: boolean;
  hostResponses: boolean;
  tripReminders: boolean;
}

export const DEFAULT_NOTIF_PREFS: INotifPrefs = {
  emailUpdates: true,
  marketing: false,
  hostResponses: true,
  tripReminders: true,
};

export interface IPublicUser {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: string;
  verified?: boolean;
  verifiedAt?: string;
  idType?: IdType;
  idLastFour?: string;
  photoUrl?: string;
  notifPrefs?: INotifPrefs;
}

export type ProfilePatch = Partial<Pick<IPublicUser, 'firstName' | 'lastName' | 'phone' | 'photoUrl' | 'notifPrefs'>>;

export type AppView = 'guest' | 'host';
export type FederatedProvider = 'Google' | 'Apple' | 'Facebook';

const VIEW_KEY = 'cnt-view-mode';
/** Stores ID-verification + UI-only prefs that Cognito doesn't own (notifPrefs, photoUrl, idType, idLastFour). */
const LOCAL_PROFILE_KEY = 'cnt-local-profile';

interface ILocalProfile {
  [email: string]: {
    verified?: boolean;
    verifiedAt?: string;
    idType?: IdType;
    idLastFour?: string;
    photoUrl?: string;
    notifPrefs?: INotifPrefs;
  };
}

export type SignInResult = { ok: true; user: IPublicUser } | { ok: false; error: string };
export type SignUpResult = { ok: true; user: IPublicUser; needsConfirmation: boolean } | { ok: false; error: string };
export type CodeResult = { ok: true } | { ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser$ = new BehaviorSubject<IPublicUser | null>(null);
  readonly currentUser$: Observable<IPublicUser | null> = this._currentUser$.asObservable();

  private readonly _currentView$ = new BehaviorSubject<AppView>('guest');
  readonly currentView$: Observable<AppView> = this._currentView$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.hydrateView();
      // Restore session if a Cognito user is already signed in (page refresh).
      this.refreshCurrentUser().catch(() => { /* not signed in — fine */ });
      // React to federated-redirect sign-in completion.
      Hub.listen('auth', ({ payload }) => {
        if (payload.event === 'signedIn' || payload.event === 'tokenRefresh') {
          this.refreshCurrentUser().catch(() => { /* swallow */ });
        }
        if (payload.event === 'signedOut') {
          this._currentUser$.next(null);
        }
      });
    }
  }

  // ---- View toggle (unchanged — purely UI state) ----------------------

  get currentView(): AppView { return this._currentView$.value; }
  get currentUser(): IPublicUser | null { return this._currentUser$.value; }

  setView(v: AppView): void {
    this._currentView$.next(v);
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(VIEW_KEY, v); } catch { /* quota / disabled */ }
    }
  }

  private hydrateView(): void {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'host' || v === 'guest') this._currentView$.next(v);
  }

  // ---- Sign-up / confirm ----------------------------------------------

  async signUp(input: { email: string; password: string; firstName: string; lastName: string; phone?: string }): Promise<SignUpResult> {
    const email = input.email.trim().toLowerCase();
    try {
      const out = await cognitoSignUp({
        username: email,
        password: input.password,
        options: {
          userAttributes: {
            email,
            given_name: input.firstName.trim(),
            family_name: input.lastName.trim(),
            ...(input.phone ? { phone_number: input.phone.trim() } : {}),
          },
        },
      });
      // Build a temporary IPublicUser — we don't have createdAt until the user actually signs in.
      const user: IPublicUser = {
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      return { ok: true, user, needsConfirmation: !out.isSignUpComplete };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }

  async confirmSignUp(email: string, code: string): Promise<CodeResult> {
    try {
      await cognitoConfirmSignUp({ username: email.trim().toLowerCase(), confirmationCode: code.trim() });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }

  async resendConfirmation(email: string): Promise<CodeResult> {
    try {
      await cognitoResendSignUpCode({ username: email.trim().toLowerCase() });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }

  // ---- Sign-in / sign-out ---------------------------------------------

  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      const out = await cognitoSignIn({ username: email.trim().toLowerCase(), password });
      if (!out.isSignedIn) {
        return { ok: false, error: 'Additional sign-in step required (not supported in this build).' };
      }
      const user = await this.refreshCurrentUser();
      return user ? { ok: true, user } : { ok: false, error: 'Sign-in succeeded but user load failed.' };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }

  async signInWithProvider(provider: FederatedProvider): Promise<void> {
    // Redirects the browser away. After Cognito → /auth/callback completes the handshake.
    await signInWithRedirect({ provider });
  }

  async signOut(): Promise<void> {
    try { await cognitoSignOut(); } catch { /* swallow */ }
    this._currentUser$.next(null);
    this._currentView$.next('guest');
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.removeItem(VIEW_KEY); } catch { /* */ }
    }
  }

  // ---- Forgot password -------------------------------------------------

  async forgotPassword(email: string): Promise<CodeResult> {
    try {
      await cognitoResetPassword({ username: email.trim().toLowerCase() });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<CodeResult> {
    try {
      await cognitoConfirmResetPassword({
        username: email.trim().toLowerCase(),
        confirmationCode: code.trim(),
        newPassword,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }

  // ---- Profile updates -------------------------------------------------

  async updateProfile(patch: ProfilePatch): Promise<IPublicUser | null> {
    const current = this._currentUser$.value;
    if (!current) return null;
    // Cognito-side attributes
    const cognitoPatch: Record<string, string> = {};
    if (patch.firstName !== undefined) cognitoPatch['given_name'] = patch.firstName.trim();
    if (patch.lastName !== undefined)  cognitoPatch['family_name'] = patch.lastName.trim();
    if (patch.phone !== undefined) {
      const p = patch.phone.trim();
      if (p) cognitoPatch['phone_number'] = p;
    }
    if (Object.keys(cognitoPatch).length > 0) {
      try { await cognitoUpdateUserAttributes({ userAttributes: cognitoPatch }); }
      catch (e) { console.warn('Cognito updateUserAttributes failed', e); return null; }
    }
    // Local-side prefs (photoUrl, notifPrefs)
    if (patch.photoUrl !== undefined || patch.notifPrefs !== undefined) {
      this.writeLocalProfile(current.email, {
        ...(patch.photoUrl !== undefined ? { photoUrl: patch.photoUrl || undefined } : {}),
        ...(patch.notifPrefs !== undefined ? { notifPrefs: patch.notifPrefs } : {}),
      });
    }
    return this.refreshCurrentUser();
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.' };
    }
    try {
      await cognitoUpdatePassword({ oldPassword: currentPassword, newPassword });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
  }

  /** ID verification stays mock — Cognito doesn't do KYC. Persists per-email in localStorage. */
  markVerified(input: { idType: IdType; idLastFour?: string }): IPublicUser | null {
    const current = this._currentUser$.value;
    if (!current) return null;
    this.writeLocalProfile(current.email, {
      verified: true,
      verifiedAt: new Date().toISOString(),
      idType: input.idType,
      idLastFour: input.idLastFour,
    });
    // Refresh emits a new user with the local-profile fields merged in.
    void this.refreshCurrentUser();
    return this.assemble(current.email, this.readCognitoCache());
  }

  // ---- Internal: load user from Cognito + merge local profile ----------

  private async refreshCurrentUser(): Promise<IPublicUser | null> {
    try {
      const cognitoUser = await cognitoGetCurrentUser();
      const attrs = await cognitoFetchUserAttributes();
      const merged = this.assemble(cognitoUser.signInDetails?.loginId || attrs.email || '', attrs);
      this._currentUser$.next(merged);
      return merged;
    } catch {
      this._currentUser$.next(null);
      return null;
    }
  }

  /** Latest known attribute set (cached on the BehaviorSubject) — used by markVerified's sync return. */
  private readCognitoCache(): Record<string, string | undefined> {
    const u = this._currentUser$.value;
    if (!u) return {};
    return {
      email: u.email,
      given_name: u.firstName,
      family_name: u.lastName,
      phone_number: u.phone,
    };
  }

  private assemble(email: string, attrs: Record<string, string | undefined>): IPublicUser {
    const local = this.readLocalProfile()[email] || {};
    return {
      email,
      firstName: attrs['given_name'] || '',
      lastName:  attrs['family_name'] || '',
      phone:     attrs['phone_number'] || undefined,
      createdAt: new Date().toISOString(), // Cognito's "user.created_at" requires admin scope; fallback to "now-ish"
      verified:    local.verified,
      verifiedAt:  local.verifiedAt,
      idType:      local.idType,
      idLastFour:  local.idLastFour,
      photoUrl:    local.photoUrl,
      notifPrefs:  local.notifPrefs,
    };
  }

  private readLocalProfile(): ILocalProfile {
    if (!isPlatformBrowser(this.platformId)) return {};
    try {
      const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private writeLocalProfile(email: string, patch: ILocalProfile[string]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const all = this.readLocalProfile();
    all[email] = { ...(all[email] || {}), ...patch };
    try { localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(all)); } catch { /* */ }
  }
}

function friendlyError(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = String((e as { message: unknown }).message);
    // Common Cognito error messages — surface cleaner copy
    if (m.includes('UsernameExistsException')) return 'An account with this email already exists.';
    if (m.includes('NotAuthorizedException'))  return 'Email or password is incorrect.';
    if (m.includes('UserNotFoundException'))   return 'Email or password is incorrect.';
    if (m.includes('CodeMismatchException'))   return 'That code is incorrect.';
    if (m.includes('ExpiredCodeException'))    return 'That code has expired. Request a new one.';
    if (m.includes('InvalidPasswordException')) return 'Password doesn\'t meet the policy (min 8 chars + complexity).';
    if (m.includes('LimitExceededException'))  return 'Too many attempts. Try again in a moment.';
    return m;
  }
  return 'Something went wrong. Please try again.';
}
