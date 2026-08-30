import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepsService } from './process-instance-steps.service';

describe('ProcessInstanceStepsService', () => {
  let service: ProcessInstanceStepsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessInstanceStepsService],
    }).compile();

    service = module.get<ProcessInstanceStepsService>(
      ProcessInstanceStepsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
