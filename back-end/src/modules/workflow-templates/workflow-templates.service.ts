import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';

@Injectable()
export class WorkflowTemplatesService {
  constructor(private readonly databaseService: DatabaseService) {}

  findAll() {
    return this.databaseService.workflow_templates.map(template => {
      const steps = this.databaseService.workflow_template_steps
        .filter(step => step.template_id === template.template_id)
        .sort((a, b) => a.step_order - b.step_order);
      
      return {
        ...template,
        stages: steps.map(s => s.step_name) // Keep it compatible with existing frontend 'stages' field
      };
    });
  }
}
