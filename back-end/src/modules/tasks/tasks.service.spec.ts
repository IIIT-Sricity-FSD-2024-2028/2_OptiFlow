import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: DatabaseService,
          useValue: {
            tasks: [],
            subtasks: [],
            escalations: [],
          },
        },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
