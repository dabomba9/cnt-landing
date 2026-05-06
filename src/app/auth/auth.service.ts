import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type IdType = 'drivers-license' | 'passport' | 'state-id';

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
}

const USERS_KEY = 'cnt-users';
const SESSION_KEY = 'cnt-session-email';

function toPublic(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser$ = new BehaviorSubject<PublicUser | null>(null);
  readonly currentUser$: Observable<PublicUser | null> = this._currentUser$.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.hydrate();
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

  signOut(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(SESSION_KEY);
    }
    this._currentUser$.next(null);
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
