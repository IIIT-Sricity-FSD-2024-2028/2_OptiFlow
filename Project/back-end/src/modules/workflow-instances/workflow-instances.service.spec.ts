import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowInstancesService } from './workflow-instances.service';

describe('WorkflowInstancesService', () => {
  let service: WorkflowInstancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowInstancesService],
    }).compile();

    service = module.get<WorkflowInstancesService>(WorkflowInstancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
