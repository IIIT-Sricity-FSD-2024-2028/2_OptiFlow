import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Evidence } from '../../core/database/database.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';

@Injectable()
export class EvidenceService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Evidence[] { return this.db.evidence; }

  findOne(id: number): Evidence {
    const evidence = this.db.evidence.find(e => e.evidence_id === id);
    if (!evidence) throw new NotFoundException(`Evidence with ID ${id} not found`);
    return evidence;
  }

  create(dto: CreateEvidenceDto): Evidence {
    const newEvidence: Evidence = {
      evidence_id: this.db.evidence.length ? Math.max(...this.db.evidence.map(e => e.evidence_id)) + 1 : 1,
      user_id: dto.user_id,
      task_id: dto.task_id ?? null,
      violation_id: dto.violation_id ?? null,
      title: dto.title,
      evidence_type: dto.evidence_type ?? 'Document',
      file_url: dto.file_url,
      notes: dto.notes ?? '',
      status: 'Pending',
      reviewed_by: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
    };
    this.db.evidence.push(newEvidence);
    return newEvidence;
  }

  update(id: number, dto: UpdateEvidenceDto): Evidence {
    const index = this.db.evidence.findIndex(e => e.evidence_id === id);
    if (index === -1) throw new NotFoundException(`Evidence ${id} not found`);
    this.db.evidence[index] = { ...this.db.evidence[index], ...dto };
    return this.db.evidence[index];
  }

  remove(id: number): void {
    const index = this.db.evidence.findIndex(e => e.evidence_id === id);
    if (index === -1) throw new NotFoundException(`Evidence ${id} not found`);
    this.db.evidence.splice(index, 1);
  }
}
