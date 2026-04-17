import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HostSpaceComponent } from './host-space.component';

describe('HostSpaceComponent', () => {
  let component: HostSpaceComponent;
  let fixture: ComponentFixture<HostSpaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostSpaceComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostSpaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
