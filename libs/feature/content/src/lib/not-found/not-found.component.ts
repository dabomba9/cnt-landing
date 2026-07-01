import { Component, OnInit, inject } from '@angular/core';

import { RouterLink } from '@angular/router';
import { NavbarComponent } from '@cnt-workspace/ui';
import { FooterComponent } from '@cnt-workspace/ui';
import { SeoService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-not-found',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './not-found.component.html',
})
export class NotFoundComponent implements OnInit {
  private seo = inject(SeoService);


  ngOnInit(): void {
    this.seo.update({
      title: 'Page Not Found | CurbNTurf',
      description: 'That page wandered off-trail. Head back home or browse RV stays.',
      url: '/404',
      robots: 'noindex, nofollow',
    });
  }
}
