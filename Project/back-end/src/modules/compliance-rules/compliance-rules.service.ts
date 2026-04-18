import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, ComplianceRule } from '../../core/database/database.service';
import { CreateComplianceRuleDto } from './dto/create-compliance-rule.dto';
import { UpdateComplianceRuleDto } from './dto/update-compliance-rule.dto';

@Injectable()
export class ComplianceRulesService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): ComplianceRule[] { return this.db.compliance_rules; }

  findOne(id: number): ComplianceRule {
    const rule = this.db.compliance_rules.find(r => r.rule_id === id);
    if (!rule) throw new NotFoundException(`Compliance rule with ID ${id} not found`);
    return rule;
  }

  create(dto: CreateComplianceRuleDto): ComplianceRule {
    const newRule: ComplianceRule = {
      rule_id: this.db.compliance_rules.length ? Math.max(...this.db.compliance_rules.map(r => r.rule_id)) + 1 : 1,
      rule_name: dto.rule_name,
      description: dto.description,
      remediation_steps: dto.remediation_steps,
      severity: dto.severity,
      is_active: dto.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    this.db.compliance_rules.push(newRule);
    return newRule;
  }

  update(id: number, dto: UpdateComplianceRuleDto): ComplianceRule {
    const index = this.db.compliance_rules.findIndex(r => r.rule_id === id);
    if (index === -1) throw new NotFoundException(`Compliance rule ${id} not found`);
    this.db.compliance_rules[index] = { ...this.db.compliance_rules[index], ...dto };
    return this.db.compliance_rules[index];
  }

  remove(id: number): void {
    const index = this.db.compliance_rules.findIndex(r => r.rule_id === id);
    if (index === -1) throw new NotFoundException(`Compliance rule ${id} not found`);
    this.db.compliance_rules.splice(index, 1);
  }
}
