import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../seo.service';

@Component({
  selector: 'cnt-workspace-host-space',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-space.component.html',
  styleUrl: './host-space.component.css',
})
export class HostSpaceComponent implements OnInit {
  isMobileNavOpen = false;

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Host Your Space & Earn | CurbNTurf',
      description: 'Turn your open land into an RV destination. Join thousands of hosts earning passive income with CurbNTurf. List your space in under 10 minutes — no experience needed.',
      url: '/host',
    });
  }
}
