import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveLogsComponent } from './live.component';

describe('LiveLogsComponent', () => {
  let component: LiveLogsComponent;
  let fixture: ComponentFixture<LiveLogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LiveLogsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
