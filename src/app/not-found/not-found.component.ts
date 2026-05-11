import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { SeoService } from '@cnt-workspace/data-access';

@Component({
  selector: 'cnt-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './not-found.component.html',
})
export class NotFoundComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Page Not Found | CurbNTurf',
      description: 'That page wandered off-trail. Head back home or browse RV stays.',
      url: '/404',
      robots: 'noindex, nofollow',
    });
  }
}
