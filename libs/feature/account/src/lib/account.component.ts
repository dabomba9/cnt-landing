import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent, FooterComponent } from '@cnt-workspace/ui';
import { AuthService, IPublicUser, SeoService } from '@cnt-workspace/data-access';
import { PersonalInfoSectionComponent } from './sections/personal-info.component';
import { LoginSecuritySectionComponent } from './sections/login-security.component';
import { IdentitySectionComponent } from './sections/identity.component';
import { PaymentsSectionComponent } from './sections/payments.component';
import { NotificationsSectionComponent } from './sections/notifications.component';
import { MyRigSectionComponent } from './sections/my-rig.component';

type Section = 'personal' | 'identity' | 'security' | 'payments' | 'notifications' | 'rig';

interface INavItem { id: Section; label: string; icon: string; description: string; }

const NAV_ITEMS: INavItem[] = [
  { id: 'personal',      label: 'Personal info',     icon: 'person',           description: 'Name, phone, photo' },
  { id: 'identity',      label: 'Identity',          icon: 'verified_user',    description: 'Verify your ID' },
  { id: 'security',      label: 'Login & security',  icon: 'lock',             description: 'Password, sign out' },
  { id: 'payments',      label: 'Payments',          icon: 'credit_card',      description: 'Cards on file' },
  { id: 'notifications', label: 'Notifications',     icon: 'notifications',    description: 'What we send you' },
  { id: 'rig',           label: 'My Rig',            icon: 'rv_hookup',        description: 'RV type, dimensions, photos' },
];

@Component({
  selector: 'cnt-account',
  standalone: true,
  imports: [
    CommonModule, NavbarComponent, FooterComponent,
    PersonalInfoSectionComponent, LoginSecuritySectionComponent, IdentitySectionComponent,
    PaymentsSectionComponent, NotificationsSectionComponent, MyRigSectionComponent,
  ],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit, OnDestroy {
  user: IPublicUser | null = null;
  active: Section = 'personal';
  readonly navItems = NAV_ITEMS;
  /** Captured from `?returnTo=...` — passed down so a section can redirect after completion (e.g., rig). */
  returnTo: string | null = null;
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Account — CurbNTurf',
      description: 'Manage your CurbNTurf profile.',
      url: '/account',
      robots: 'noindex, nofollow',
    });
    this.subs.push(this.auth.currentUser$.subscribe(u => (this.user = u)));
    this.subs.push(
      this.route.fragment.subscribe(f => {
        if (f && NAV_ITEMS.some(n => n.id === f)) this.active = f as Section;
      }),
    );
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
  }

  /** Section emits when its work is complete and we should bounce back to wherever the user came from. */
  onSectionDone(): void {
    if (!this.returnTo) return;
    const target = this.returnTo;
    this.returnTo = null;
    this.router.navigateByUrl(target);
  }

  ngOnDestroy(): void { for (const s of this.subs) s.unsubscribe(); }

  select(id: Section): void {
    this.active = id;
    this.router.navigate([], { relativeTo: this.route, fragment: id, replaceUrl: true });
  }
}
