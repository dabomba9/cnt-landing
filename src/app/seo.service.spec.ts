import { TestBed } from '@angular/core/testing';
import { SeoService } from './seo.service';

describe('SeoService.absUrl', () => {
  let svc: SeoService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(SeoService);
  });

  it('prefixes a relative path with the brand origin', () => {
    expect(svc.absUrl('/foo')).toBe('https://www.curbnturf.com/foo');
    expect(svc.absUrl('foo/bar')).toBe('https://www.curbnturf.com/foo/bar');
  });

  it('passes through absolute URLs untouched', () => {
    expect(svc.absUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(svc.absUrl('http://example.com/a.png')).toBe('http://example.com/a.png');
  });
});
