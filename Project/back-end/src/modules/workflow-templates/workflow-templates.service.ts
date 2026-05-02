import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';

@Injectable()
export class WorkflowTemplatesService {
  constructor(private readonly databaseService: DatabaseService) {}

  findAll() {
    return this.databaseService.workflow_templates;
  }
}
