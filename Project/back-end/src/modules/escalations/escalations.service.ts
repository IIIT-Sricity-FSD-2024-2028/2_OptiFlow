import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Escalation } from '../../core/database/database.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationDto } from './dto/update-escalation.dto';

@Injectable()
export class EscalationsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Escalation[] {
    return this.db.escalations;
  }

  findOne(id: number): Escalation {
    const escalation = this.db.escalations.find(e => e.id === id);
    if (!escalation) throw new NotFoundException(`Escalation with ID ${id} not found`);
    return escalation;
  }

  create(createEscalationDto: CreateEscalationDto): Escalation {
    const newEscalation: Escalation = {
      id: this.db.escalations.length ? Math.max(...this.db.escalations.map(e => e.id)) + 1 : 1,
      ...createEscalationDto
    };
    this.db.escalations.push(newEscalation);
    return newEscalation;
  }

  update(id: number, updateEscalationDto: UpdateEscalationDto): Escalation {
    const index = this.db.escalations.findIndex(e => e.id === id);
    if (index === -1) throw new NotFoundException(`Escalation ${id} not found`);
    this.db.escalations[index] = { ...this.db.escalations[index], ...updateEscalationDto };
    return this.db.escalations[index];
  }

  remove(id: number): void {
    const index = this.db.escalations.findIndex(e => e.id === id);
    if (index === -1) throw new NotFoundException(`Escalation ${id} not found`);
    this.db.escalations.splice(index, 1);
  }
}
