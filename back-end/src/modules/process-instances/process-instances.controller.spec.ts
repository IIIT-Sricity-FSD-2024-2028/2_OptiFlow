import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstancesController } from './process-instances.controller';

describe('ProcessInstancesController', () => {
  let controller: ProcessInstancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstancesController],
    }).compile();

    controller = module.get<ProcessInstancesController>(
      ProcessInstancesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
