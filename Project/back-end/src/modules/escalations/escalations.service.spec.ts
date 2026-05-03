import { Test, TestingModule } from '@nestjs/testing';
import { EscalationsService } from './escalations.service';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('EscalationsService', () => {
  let service: EscalationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationsService,
        {
          provide: DatabaseService,
          useValue: {
            escalations: [],
          },
        },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get<EscalationsService>(EscalationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
