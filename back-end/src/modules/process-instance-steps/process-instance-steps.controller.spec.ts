import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstanceStepsController } from './process-instance-steps.controller';

describe('ProcessInstanceStepsController', () => {
  let controller: ProcessInstanceStepsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstanceStepsController],
    }).compile();

    controller = module.get<ProcessInstanceStepsController>(
      ProcessInstanceStepsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
