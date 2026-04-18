import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, ComplianceViolation } from '../../core/database/database.service';
import { CreateComplianceViolationDto } from './dto/create-compliance-violation.dto';
import { UpdateComplianceViolationDto } from './dto/update-compliance-violation.dto';

@Injectable()
export class ComplianceViolationsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): ComplianceViolation[] { return this.db.compliance_violations; }

  findOne(id: number): ComplianceViolation {
    const violation = this.db.compliance_violations.find(v => v.violation_id === id);
    if (!violation) throw new NotFoundException(`Violation with ID ${id} not found`);
    return violation;
  }

  create(dto: CreateComplianceViolationDto): ComplianceViolation {
    const newViolation: ComplianceViolation = {
      violation_id: this.db.compliance_violations.length ? Math.max(...this.db.compliance_violations.map(v => v.violation_id)) + 1 : 1,
      rule_id: dto.rule_id,
      entity_id: dto.entity_id,
      entity_type: dto.entity_type,
      status: 'Open',
      detected_at: new Date().toISOString(),
      reported_by: dto.reported_by ?? null,
      resolved_by: null,
      resolved_at: null,
      resolution_remarks: null,
      due_date: dto.due_date ?? null,
    };
    this.db.compliance_violations.push(newViolation);
    return newViolation;
  }

  update(id: number, dto: UpdateComplianceViolationDto): ComplianceViolation {
    const index = this.db.compliance_violations.findIndex(v => v.violation_id === id);
    if (index === -1) throw new NotFoundException(`Violation ${id} not found`);
    this.db.compliance_violations[index] = { ...this.db.compliance_violations[index], ...dto };
    return this.db.compliance_violations[index];
  }

  remove(id: number): void {
    const index = this.db.compliance_violations.findIndex(v => v.violation_id === id);
    if (index === -1) throw new NotFoundException(`Violation ${id} not found`);
    this.db.compliance_violations.splice(index, 1);
  }
}
