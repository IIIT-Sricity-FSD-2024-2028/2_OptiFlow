import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowInstancesController } from './workflow-instances.controller';

describe('WorkflowInstancesController', () => {
  let controller: WorkflowInstancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowInstancesController],
    }).compile();

    controller = module.get<WorkflowInstancesController>(WorkflowInstancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
