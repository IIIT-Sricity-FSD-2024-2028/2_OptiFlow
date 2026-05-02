import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowTemplatesController } from './workflow-templates.controller';

describe('WorkflowTemplatesController', () => {
  let controller: WorkflowTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowTemplatesController],
    }).compile();

    controller = module.get<WorkflowTemplatesController>(WorkflowTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
