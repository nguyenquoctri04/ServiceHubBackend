import { Test } from '@nestjs/testing';
import { ContractServiceModule } from '../contract-service.module';
import { ViolationsService } from './violations.service';

describe('ViolationsModule', () => {
  it('resolves the notification client required by ViolationsService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ContractServiceModule],
    }).compile();

    expect(moduleRef.get(ViolationsService)).toBeDefined();
    await moduleRef.close();
  });
});
