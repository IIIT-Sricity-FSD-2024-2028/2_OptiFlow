import { Test, TestingModule } from '@nestjs/testing';
import { SubtasksService } from './subtasks.service';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('SubtasksService', () => {
  let service: SubtasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubtasksService,
        {
          provide: DatabaseService,
          useValue: {
            subtasks: [],
          },
        },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get<SubtasksService>(SubtasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
