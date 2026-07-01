import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

/**
 * One canned reply a host (or eventually a guest) can insert into the
 * /inbox composer with a single tap. Stored per-user in localStorage.
 */
export interface IQuickReply {
  id: string;
  label: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'cnt-quick-replies';
const GUEST_KEY = `${STORAGE_PREFIX}-guest`;

/** Starter set seeded on first use so new hosts get value without setup. */
const DEFAULT_REPLIES: Pick<IQuickReply, 'label' | 'body'>[] = [
  { label: 'Approve dates',     body: 'Those dates work — please confirm and I\'ll lock them in.' },
  { label: 'Dates unavailable', body: 'Sorry, those dates aren\'t available. Could you try another window?' },
  { label: 'Gate code',         body: 'Here\'s the gate code: ____. Let me know once you\'re in.' },
  { label: 'Arriving tomorrow?',body: 'Just checking — still arriving tomorrow? Anything I can prep ahead of time?' },
  { label: 'Send rig photo',    body: 'Could you send a quick photo of your rig so I can confirm fit?' },
  { label: 'See you soon',      body: 'Thanks — see you soon! Reach out if anything comes up before arrival.' },
];

function makeId(): string {
  return `qr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class QuickReplyService {
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);

  private readonly _replies$ = new BehaviorSubject<IQuickReply[]>([]);
  readonly replies$: Observable<IQuickReply[]> = this._replies$.asObservable();

  private storageKey = GUEST_KEY;

  constructor() {
    this.refreshKey();
    this.auth.currentUser$.subscribe(() => this.refreshKey());
    this.hydrate();
  }

  list(): IQuickReply[] { return this._replies$.value; }

  add(label: string, body: string): IQuickReply {
    const now = new Date().toISOString();
    const next: IQuickReply = { id: makeId(), label: label.trim(), body: body.trim(), createdAt: now, updatedAt: now };
    this.write([...this._replies$.value, next]);
    return next;
  }

  update(id: string, patch: Partial<Pick<IQuickReply, 'label' | 'body'>>): IQuickReply | null {
    const all = this._replies$.value.slice();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const updated: IQuickReply = {
      ...all[idx],
      label: patch.label != null ? patch.label.trim() : all[idx].label,
      body:  patch.body  != null ? patch.body.trim()  : all[idx].body,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    this.write(all);
    return updated;
  }

  remove(id: string): void {
    this.write(this._replies$.value.filter(r => r.id !== id));
  }

  /** Swap the storage key on sign-in/out and migrate guest drafts forward. */
  private refreshKey(): void {
    const email = this.auth.currentUser?.email;
    const newKey = email ? `${STORAGE_PREFIX}-${email}` : GUEST_KEY;
    if (newKey === this.storageKey) return;
    if (email && isPlatformBrowser(this.platformId)) {
      try {
        const guest = localStorage.getItem(GUEST_KEY);
        const target = localStorage.getItem(newKey);
        if (guest && !target) {
          localStorage.setItem(newKey, guest);
          localStorage.removeItem(GUEST_KEY);
        }
      } catch { /* noop */ }
    }
    this.storageKey = newKey;
    this.hydrate();
  }

  /** Read storage; seed the default set the first time the bucket is empty. */
  private hydrate(): void {
    const existing = this.read();
    if (existing.length > 0) {
      this._replies$.next(existing);
      return;
    }
    const now = new Date().toISOString();
    const seeded: IQuickReply[] = DEFAULT_REPLIES.map((d, i) => ({
      id: makeId(),
      label: d.label,
      body: d.body,
      // Stagger createdAt so chips render in the curated order, not by tie.
      createdAt: new Date(Date.parse(now) + i).toISOString(),
      updatedAt: now,
    }));
    this.write(seeded);
  }

  private read(): IQuickReply[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  private write(items: IQuickReply[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try { localStorage.setItem(this.storageKey, JSON.stringify(items)); } catch { /* noop */ }
    }
    this._replies$.next(items);
  }
}
