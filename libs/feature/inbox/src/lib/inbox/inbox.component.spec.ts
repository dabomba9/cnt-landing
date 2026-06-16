import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, of, Subject } from 'rxjs';
import {
  AuthService, BookingService, HostReviewService, MessageService,
  QuickReplyService, SeoService, ToastService,
} from '@cnt-workspace/data-access';
import { IThread, IBooking, BookingStatus } from '@cnt-workspace/models';
import { InboxComponent } from './inbox.component';

/** Smallest stub surface the InboxComponent actually touches at the
 *  ngOnInit + interaction boundary. We never let the real services
 *  hit localStorage so the spec stays hermetic. */
class AuthServiceStub {
  currentUser$ = new BehaviorSubject<{ email: string; firstName?: string; lastName?: string } | null>(null);
}
class MessageServiceStub {
  private _bus$ = new Subject<void>();
  bus$ = this._bus$.asObservable();
  threads: IThread[] = [];
  threadsForUser(_email: string): IThread[] { return this.threads.slice(); }
  /** Match the real service's role lookup — guests have guestEmail,
   *  hosts have hostEmail; anything else returns null. */
  roleForUser(t: IThread, email: string): 'guest' | 'host' | null {
    if (t.guestEmail === email) return 'guest';
    if (t.hostEmail === email) return 'host';
    return null;
  }
  markRead = jest.fn();
  sendMessage = jest.fn();
  emit(): void { this._bus$.next(); }
}
class BookingServiceStub {
  bookings = new Map<string, IBooking>();
  hostDecide = jest.fn((id: string, decision: 'approved' | 'declined', reason?: string) => {
    const b = this.bookings.get(id);
    if (!b || b.status !== 'pending') return null;
    const updated: IBooking = { ...b, status: decision, cancelReason: reason?.trim() || undefined };
    this.bookings.set(id, updated);
    return updated;
  });
  getById(id: string): IBooking | null { return this.bookings.get(id) ?? null; }
  set(b: IBooking): void { this.bookings.set(b.id, b); }
}
class HostReviewServiceStub {
  filterRevealed = jest.fn(<T>(arr: T[]) => arr);
}
class QuickReplyServiceStub {
  list = jest.fn(() => []);
  bus$ = new Subject<void>();
}
class SeoServiceStub {
  applyRouteMeta = jest.fn();
}
class ToastServiceStub {
  success = jest.fn(); error = jest.fn(); warn = jest.fn(); info = jest.fn();
}
class RouterStub {
  navigate = jest.fn();
}
class ActivatedRouteStub {
  paramMap = of({ get: (_k: string) => null });
}

function mkBooking(over: Partial<IBooking>): IBooking {
  return {
    id: 'b-1',
    userEmail: 'rver@example.com',
    listingId: 1,
    listingTitle: 'Maple Ridge',
    listingLocation: 'Bend, OR',
    listingPhoto: '',
    hostName: 'Sam',
    dates: { start: '2027-04-12', end: '2027-04-15' },
    nights: 3,
    guests: 2,
    rvSummary: 'Class C, 26ft',
    pricePerNight: 80,
    subtotal: 240,
    cleaningFee: 0,
    serviceFee: 36,
    total: 276,
    instantBook: false,
    status: 'pending',
    createdAt: new Date(0).toISOString(),
    contact: { email: 'rver@example.com' },
    ...over,
  } as IBooking;
}

function mkThread(over: Partial<IThread>): IThread {
  return {
    id: 't-' + Math.random().toString(36).slice(2, 8),
    bookingId: 'b-1',
    listingId: 1,
    listingTitle: 'Maple Ridge',
    listingPhoto: '',
    guestEmail: 'rver@example.com',
    guestName: 'Sam R.',
    guestInitials: 'SR',
    hostEmail: 'host@example.com',
    hostName: 'Pat',
    hostInitials: 'P',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastReadAt: {},
    ...over,
  } as IThread;
}

describe('InboxComponent (P3.3)', () => {
  let component: InboxComponent;
  let auth: AuthServiceStub;
  let msg: MessageServiceStub;
  let bookingSvc: BookingServiceStub;
  let toasts: ToastServiceStub;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        InboxComponent,
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: MessageService, useClass: MessageServiceStub },
        { provide: BookingService, useClass: BookingServiceStub },
        { provide: HostReviewService, useClass: HostReviewServiceStub },
        { provide: QuickReplyService, useClass: QuickReplyServiceStub },
        { provide: SeoService, useClass: SeoServiceStub },
        { provide: ToastService, useClass: ToastServiceStub },
        { provide: Router, useClass: RouterStub },
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    component = TestBed.inject(InboxComponent);
    auth = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    msg = TestBed.inject(MessageService) as unknown as MessageServiceStub;
    bookingSvc = TestBed.inject(BookingService) as unknown as BookingServiceStub;
    toasts = TestBed.inject(ToastService) as unknown as ToastServiceStub;
  });

  /** Wires the user, pre-seeds threads + bookings, and runs ngOnInit
   *  so refreshThreads() populates component.threads. */
  function bootstrap(viewerEmail: string, threads: IThread[], bookings: IBooking[]): void {
    auth.currentUser$.next({ email: viewerEmail });
    component.user = { email: viewerEmail } as { email: string; firstName?: string; lastName?: string } as never;
    msg.threads = threads;
    for (const b of bookings) bookingSvc.set(b);
  }

  describe('threadBucket', () => {
    it('classifies pending → needs-decision', () => {
      const t = mkThread({});
      bookingSvc.set(mkBooking({ status: 'pending' }));
      msg.threads = [t];
      bootstrap('host@example.com', [t], [mkBooking({ status: 'pending' })]);
      // threadBucket is private but called via filteredThreads pipeline.
      component.listFilter = 'needs-decision';
      component.threads = [t];
      expect(component.filteredThreads).toEqual([t]);
    });

    it('classifies approved → active', () => {
      const t = mkThread({ bookingId: 'b-a' });
      bookingSvc.set(mkBooking({ id: 'b-a', status: 'approved' }));
      component.threads = [t];
      component.listFilter = 'active';
      expect(component.filteredThreads).toEqual([t]);
      component.listFilter = 'needs-decision';
      expect(component.filteredThreads).toEqual([]);
    });

    it('classifies declined / cancelled → archived', () => {
      const declined = mkThread({ id: 't-d', bookingId: 'b-d' });
      const cancelled = mkThread({ id: 't-c', bookingId: 'b-c' });
      bookingSvc.set(mkBooking({ id: 'b-d', status: 'declined' }));
      bookingSvc.set(mkBooking({ id: 'b-c', status: 'cancelled' }));
      component.threads = [declined, cancelled];
      component.listFilter = 'archived';
      expect(component.filteredThreads.map(t => t.id).sort()).toEqual(['t-c', 't-d']);
    });

    it('booking-less threads default to active', () => {
      const t = mkThread({ bookingId: undefined });
      component.threads = [t];
      component.listFilter = 'active';
      expect(component.filteredThreads).toEqual([t]);
    });
  });

  describe('isHostInbox + count getters', () => {
    it('isHostInbox is true when viewer is the host in any thread', () => {
      const t = mkThread({ hostEmail: 'host@example.com' });
      bootstrap('host@example.com', [t], [mkBooking({ status: 'pending' })]);
      component.threads = [t];
      expect(component.isHostInbox).toBe(true);
    });

    it('isHostInbox is false when viewer is the guest in every thread', () => {
      const t = mkThread({ guestEmail: 'rver@example.com', hostEmail: 'host@example.com' });
      bootstrap('rver@example.com', [t], [mkBooking({ status: 'pending' })]);
      component.threads = [t];
      expect(component.isHostInbox).toBe(false);
    });

    it('needsDecisionCount counts pending host threads only', () => {
      const pending = mkThread({ id: 't-p', bookingId: 'b-p', hostEmail: 'host@example.com' });
      const approved = mkThread({ id: 't-a', bookingId: 'b-a', hostEmail: 'host@example.com' });
      bookingSvc.set(mkBooking({ id: 'b-p', status: 'pending' }));
      bookingSvc.set(mkBooking({ id: 'b-a', status: 'approved' }));
      bootstrap('host@example.com', [pending, approved], []);
      component.threads = [pending, approved];
      expect(component.needsDecisionCount).toBe(1);
      expect(component.hostActiveCount).toBe(1);
      expect(component.hostArchivedCount).toBe(0);
    });
  });

  describe('hostNeedsDecision', () => {
    it('true for host viewing a pending booking', () => {
      const t = mkThread({ hostEmail: 'host@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('host@example.com', [t], []);
      component.threads = [t];
      component.activeThreadId = t.id;
      expect(component.hostNeedsDecision).toBe(true);
    });

    it('false for guest viewing the same pending booking', () => {
      const t = mkThread({ guestEmail: 'rver@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('rver@example.com', [t], []);
      component.threads = [t];
      component.activeThreadId = t.id;
      expect(component.hostNeedsDecision).toBe(false);
    });

    it('false for host viewing an approved booking', () => {
      const t = mkThread({ hostEmail: 'host@example.com', bookingId: 'b-a' });
      bookingSvc.set(mkBooking({ id: 'b-a', status: 'approved' }));
      bootstrap('host@example.com', [t], []);
      component.threads = [t];
      component.activeThreadId = t.id;
      expect(component.hostNeedsDecision).toBe(false);
    });
  });

  describe('approveActiveBooking', () => {
    it('calls hostDecide with approved and unsets the in-flight flag', () => {
      const t = mkThread({ hostEmail: 'host@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('host@example.com', [t], []);
      component.threads = [t];
      component.activeThreadId = t.id;

      component.approveActiveBooking();

      expect(bookingSvc.hostDecide).toHaveBeenCalledWith('b-1', 'approved');
      expect(component.decisionPending).toBe(false);
      expect(toasts.error).not.toHaveBeenCalled();
    });

    it('no-ops when decisionPending is already true (double-click guard)', () => {
      const t = mkThread({ hostEmail: 'host@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('host@example.com', [t], []);
      component.threads = [t];
      component.activeThreadId = t.id;
      component.decisionPending = true;

      component.approveActiveBooking();

      expect(bookingSvc.hostDecide).not.toHaveBeenCalled();
    });

    it('surfaces error toast when hostDecide returns null (race)', () => {
      // Booking exists so the early-bail check passes, but the
      // service refuses (e.g. booking just transitioned out of pending).
      const t = mkThread({ hostEmail: 'host@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('host@example.com', [t], []);
      component.threads = [t];
      component.activeThreadId = t.id;
      // Force the race: hostDecide returns null.
      bookingSvc.hostDecide.mockReturnValueOnce(null);

      component.approveActiveBooking();

      expect(toasts.error).toHaveBeenCalled();
    });
  });

  describe('decline flow', () => {
    it('toggleDeclineForm opens then closes the form, clearing the reason on close', () => {
      component.declineReason = 'something';
      component.toggleDeclineForm();
      expect(component.declineFormOpen).toBe(true);
      component.toggleDeclineForm();
      expect(component.declineFormOpen).toBe(false);
      expect(component.declineReason).toBe('');
    });

    it('submitDecline calls hostDecide with declined + reason and closes the form', () => {
      const t = mkThread({ hostEmail: 'host@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('host@example.com', [t], []);
      component.threads = [t];
      component.activeThreadId = t.id;
      component.declineFormOpen = true;
      component.declineReason = 'Just booked';

      component.submitDecline();

      expect(bookingSvc.hostDecide).toHaveBeenCalledWith('b-1', 'declined', 'Just booked');
      expect(component.declineFormOpen).toBe(false);
      expect(component.declineReason).toBe('');
    });
  });

  describe('host filter default + userPickedFilter', () => {
    it('auto-selects needs-decision when threads load and pending count > 0', () => {
      const pending = mkThread({ hostEmail: 'host@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('host@example.com', [pending], []);

      // Force the refresh path the component runs on emit / init.
      component['refreshThreads']();

      expect(component.listFilter).toBe('needs-decision');
    });

    it('does not auto-flip after the user has manually picked a filter', () => {
      const pending = mkThread({ hostEmail: 'host@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('host@example.com', [pending], []);

      component.setFilter('active');           // user clicks Active
      component['refreshThreads']();            // a new emit arrives

      expect(component.listFilter).toBe('active');
    });

    it('does not auto-flip for guests', () => {
      const pending = mkThread({ guestEmail: 'rver@example.com' });
      bookingSvc.set(mkBooking({ status: 'pending' }));
      bootstrap('rver@example.com', [pending], []);
      component['refreshThreads']();
      expect(component.listFilter).toBe('all');
    });
  });
});
