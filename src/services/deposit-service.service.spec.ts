import { TestBed } from '@angular/core/testing';

import { DepositServiceService } from './deposit-service.service';

describe('DepositServiceService', () => {
  let service: DepositServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DepositServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
