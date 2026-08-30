import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstancesService } from './process-instances.service';

describe('ProcessInstancesService', () => {
  let service: ProcessInstancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessInstancesService],
    }).compile();

    service = module.get<ProcessInstancesService>(ProcessInstancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
