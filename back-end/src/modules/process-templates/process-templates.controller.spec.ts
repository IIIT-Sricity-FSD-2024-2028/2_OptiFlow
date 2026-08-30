import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplatesController } from './process-templates.controller';

describe('ProcessTemplatesController', () => {
  let controller: ProcessTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessTemplatesController],
    }).compile();

    controller = module.get<ProcessTemplatesController>(
      ProcessTemplatesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
