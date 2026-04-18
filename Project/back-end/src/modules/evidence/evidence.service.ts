import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, ComplianceEvidence } from '../../core/database/database.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';

@Injectable()
export class EvidenceService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): ComplianceEvidence[] {
    return this.db.compliance_evidence;
  }

  findOne(id: number): ComplianceEvidence {
    const evidence = this.db.compliance_evidence.find(e => e.id === id);
    if (!evidence) throw new NotFoundException(`Evidence with ID ${id} not found`);
    return evidence;
  }

  create(createEvidenceDto: CreateEvidenceDto): ComplianceEvidence {
    const newEvidence: ComplianceEvidence = {
      id: this.db.compliance_evidence.length ? Math.max(...this.db.compliance_evidence.map(e => e.id)) + 1 : 1,
      ...createEvidenceDto
    };
    this.db.compliance_evidence.push(newEvidence);
    return newEvidence;
  }

  update(id: number, updateEvidenceDto: UpdateEvidenceDto): ComplianceEvidence {
    const index = this.db.compliance_evidence.findIndex(e => e.id === id);
    if (index === -1) throw new NotFoundException(`Evidence ${id} not found`);
    this.db.compliance_evidence[index] = { ...this.db.compliance_evidence[index], ...updateEvidenceDto };
    return this.db.compliance_evidence[index];
  }

  remove(id: number): void {
    const index = this.db.compliance_evidence.findIndex(e => e.id === id);
    if (index === -1) throw new NotFoundException(`Evidence ${id} not found`);
    this.db.compliance_evidence.splice(index, 1);
  }
}
