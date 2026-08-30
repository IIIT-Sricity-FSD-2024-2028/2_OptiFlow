import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTemplatesService } from './process-templates.service';

describe('ProcessTemplatesService', () => {
  let service: ProcessTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcessTemplatesService],
    }).compile();

    service = module.get<ProcessTemplatesService>(ProcessTemplatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
