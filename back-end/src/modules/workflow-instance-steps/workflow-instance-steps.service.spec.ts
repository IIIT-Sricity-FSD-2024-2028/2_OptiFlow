import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowInstanceStepsService } from './workflow-instance-steps.service';

describe('WorkflowInstanceStepsService', () => {
  let service: WorkflowInstanceStepsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowInstanceStepsService],
    }).compile();

    service = module.get<WorkflowInstanceStepsService>(WorkflowInstanceStepsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
