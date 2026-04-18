import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../seo.service';

@Component({
  selector: 'cnt-workspace-listing-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listing-details.component.html',
  styleUrl: './listing-details.component.css',
})
export class ListingDetailsComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'RV Spot Listing | CurbNTurf',
      description: 'View photos, amenities, availability, and pricing for this unique private RV spot. Book directly with the host on CurbNTurf.',
      url: '/listing',
    });
  }
}
