import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowInstanceStepsController } from './workflow-instance-steps.controller';

describe('WorkflowInstanceStepsController', () => {
  let controller: WorkflowInstanceStepsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowInstanceStepsController],
    }).compile();

    controller = module.get<WorkflowInstanceStepsController>(WorkflowInstanceStepsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
