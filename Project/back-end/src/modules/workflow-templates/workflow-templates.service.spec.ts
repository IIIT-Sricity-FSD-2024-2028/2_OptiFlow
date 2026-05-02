import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowTemplatesService } from './workflow-templates.service';

describe('WorkflowTemplatesService', () => {
  let service: WorkflowTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowTemplatesService],
    }).compile();

    service = module.get<WorkflowTemplatesService>(WorkflowTemplatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
