import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Escalation } from '../../core/database/database.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationDto } from './dto/update-escalation.dto';

@Injectable()
export class EscalationsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Escalation[] { return this.db.escalations; }

  findOne(id: number): Escalation {
    const escalation = this.db.escalations.find(e => e.escalation_id === id);
    if (!escalation) throw new NotFoundException(`Escalation with ID ${id} not found`);
    return escalation;
  }

  create(dto: CreateEscalationDto): Escalation {
    const newEscalation: Escalation = {
      escalation_id: this.db.escalations.length ? Math.max(...this.db.escalations.map(e => e.escalation_id)) + 1 : 1,
      task_id: dto.task_id,
      project_id: dto.project_id,
      reported_by: dto.reported_by,
      target_manager_id: dto.target_manager_id,
      title: dto.title,
      description: dto.description ?? '',
      blocker_type: dto.blocker_type ?? 'General',
      priority: dto.priority ?? 'High',
      status: 'Open',
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    this.db.escalations.push(newEscalation);
    return newEscalation;
  }

  update(id: number, dto: UpdateEscalationDto): Escalation {
    const index = this.db.escalations.findIndex(e => e.escalation_id === id);
    if (index === -1) throw new NotFoundException(`Escalation ${id} not found`);
    this.db.escalations[index] = { ...this.db.escalations[index], ...dto };
    return this.db.escalations[index];
  }

  remove(id: number): void {
    const index = this.db.escalations.findIndex(e => e.escalation_id === id);
    if (index === -1) throw new NotFoundException(`Escalation ${id} not found`);
    this.db.escalations.splice(index, 1);
  }
}
