import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type IdType = 'drivers-license' | 'passport' | 'state-id';

export interface NotifPrefs {
  emailUpdates: boolean;
  marketing: boolean;
  hostResponses: boolean;
  tripReminders: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  emailUpdates: true,
  marketing: false,
  hostResponses: true,
  tripReminders: true,
};

export interface User {
  email: string;
  /** btoa(password) — DEMO ONLY. Never ship this scheme to production. */
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: string;
  verified?: boolean;
  verifiedAt?: string;
  /** Demo only — last 4 of the document id, no real ID stored. */
  idType?: IdType;
  idLastFour?: string;
  /** Data-URL profile photo (mock). */
  photoUrl?: string;
  notifPrefs?: NotifPrefs;
}

export interface PublicUser {
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
  notifPrefs?: NotifPrefs;
}

export type ProfilePatch = Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'photoUrl' | 'notifPrefs'>>;

const USERS_KEY = 'cnt-users';
const SESSION_KEY = 'cnt-session-email';
const VIEW_KEY = 'cnt-view-mode'; // 'guest' | 'host'

export type AppView = 'guest' | 'host';

function toPublic(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser$ = new BehaviorSubject<PublicUser | null>(null);
  readonly currentUser$: Observable<PublicUser | null> = this._currentUser$.asObservable();

  private readonly _currentView$ = new BehaviorSubject<AppView>('guest');
  readonly currentView$: Observable<AppView> = this._currentView$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.hydrate();
    this.hydrateView();
  }

  get currentView(): AppView { return this._currentView$.value; }

  setView(v: AppView): void {
    this._currentView$.next(v);
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(VIEW_KEY, v); } catch {}
    }
  }

  private hydrateView(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'host' || v === 'guest') this._currentView$.next(v);
  }

  get currentUser(): PublicUser | null {
    return this._currentUser$.value;
  }

  signUp(input: { email: string; password: string; firstName: string; lastName: string; phone?: string }): { ok: true; user: PublicUser } | { ok: false; error: string } {
    const email = input.email.trim().toLowerCase();
    if (!email || !input.password || !input.firstName || !input.lastName) {
      return { ok: false, error: 'Please fill out all required fields.' };
    }
    const users = this.readUsers();
    if (users.some(u => u.email === email)) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    const user: User = {
      email,
      passwordHash: btoa(input.password),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    this.writeUsers(users);
    this.startSession(email);
    return { ok: true, user: toPublic(user) };
  }

  signIn(email: string, password: string): { ok: true; user: PublicUser } | { ok: false; error: string } {
    const norm = email.trim().toLowerCase();
    const users = this.readUsers();
    const found = users.find(u => u.email === norm);
    if (!found || found.passwordHash !== btoa(password)) {
      return { ok: false, error: 'Email or password is incorrect.' };
    }
    this.startSession(norm);
    return { ok: true, user: toPublic(found) };
  }

  /** Persist edits to the current user's editable profile fields. Mock: writes to localStorage. */
  updateProfile(patch: ProfilePatch): PublicUser | null {
    const current = this._currentUser$.value;
    if (!current) return null;
    const users = this.readUsers();
    const idx = users.findIndex(u => u.email === current.email);
    if (idx === -1) return null;
    const cleaned: ProfilePatch = {};
    if (patch.firstName !== undefined) cleaned.firstName = patch.firstName.trim();
    if (patch.lastName !== undefined) cleaned.lastName = patch.lastName.trim();
    if (patch.phone !== undefined) cleaned.phone = patch.phone.trim() || undefined;
    if (patch.photoUrl !== undefined) cleaned.photoUrl = patch.photoUrl || undefined;
    if (patch.notifPrefs !== undefined) cleaned.notifPrefs = patch.notifPrefs;
    users[idx] = { ...users[idx], ...cleaned };
    this.writeUsers(users);
    this._currentUser$.next(toPublic(users[idx]));
    return toPublic(users[idx]);
  }

  /** Change the current user's password. Requires current password for verification. */
  updatePassword(currentPassword: string, nextPassword: string): { ok: true } | { ok: false; error: string } {
    const current = this._currentUser$.value;
    if (!current) return { ok: false, error: 'You must be signed in.' };
    if (!nextPassword || nextPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.' };
    }
    const users = this.readUsers();
    const idx = users.findIndex(u => u.email === current.email);
    if (idx === -1) return { ok: false, error: 'Account not found.' };
    if (users[idx].passwordHash !== btoa(currentPassword)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
    users[idx] = { ...users[idx], passwordHash: btoa(nextPassword) };
    this.writeUsers(users);
    return { ok: true };
  }

  /** Mark the current user as identity-verified. Mock: doesn't actually store the ID. */
  markVerified(input: { idType: IdType; idLastFour?: string }): PublicUser | null {
    const current = this._currentUser$.value;
    if (!current) return null;
    const users = this.readUsers();
    const idx = users.findIndex(u => u.email === current.email);
    if (idx === -1) return null;
    users[idx] = {
      ...users[idx],
      verified: true,
      verifiedAt: new Date().toISOString(),
      idType: input.idType,
      idLastFour: input.idLastFour,
    };
    this.writeUsers(users);
    this._currentUser$.next(toPublic(users[idx]));
    return toPublic(users[idx]);
  }

  /** Mock Google sign-in. In production this would call OAuth and exchange tokens. */
  signInWithGoogle(profile?: { email?: string; firstName?: string; lastName?: string }): { ok: true; user: PublicUser } {
    const email = (profile?.email || 'guest.google@curbnturf.demo').trim().toLowerCase();
    const firstName = profile?.firstName || 'Google';
    const lastName = profile?.lastName || 'Guest';
    const users = this.readUsers();
    let user = users.find(u => u.email === email);
    if (!user) {
      user = {
        email,
        passwordHash: btoa('google-oauth-mock'),
        firstName,
        lastName,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      this.writeUsers(users);
    }
    this.startSession(email);
    return { ok: true, user: toPublic(user) };
  }

  signOut(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(VIEW_KEY);
    }
    this._currentUser$.next(null);
    this._currentView$.next('guest');
  }

  private hydrate(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const email = localStorage.getItem(SESSION_KEY);
    if (!email) return;
    const found = this.readUsers().find(u => u.email === email);
    if (found) this._currentUser$.next(toPublic(found));
  }

  private startSession(email: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(SESSION_KEY, email);
    }
    const found = this.readUsers().find(u => u.email === email);
    if (found) this._currentUser$.next(toPublic(found));
  }

  private readUsers(): User[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeUsers(users: User[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}
