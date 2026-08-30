import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RoleTemplateOrigin, ScopeType, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerCompany(dto: RegisterCompanyDto) {
    // 1. Check if owner email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.ownerEmail },
    });
    if (existingUser) {
      throw new BadRequestException(`User with email '${dto.ownerEmail}' already exists.`);
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);

    // 2. Create Company
    const company = await this.prisma.company.create({
      data: {
        legalName: dto.companyLegalName,
        status: 'Active',
      },
    });

    // 3. Link Subscription to requested/default Plan
    let plan = await this.prisma.plan.findFirst({
      where: { name: dto.planName || 'Growth' },
    });
    if (!plan) {
      plan = await this.prisma.plan.findFirst();
    }
    if (plan) {
      await this.prisma.subscription.create({
        data: {
          companyId: company.id,
          planId: plan.id,
          billingCycle: 'YEARLY',
          status: SubscriptionStatus.Active,
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 4. Create Initial User (Company Owner)
    const ownerUser = await this.prisma.user.create({
      data: {
        companyId: company.id,
        fullName: dto.ownerFullName,
        email: dto.ownerEmail,
        passwordHash,
      },
    });

    // 5. Seed Platform Default Roles from RoleTemplate (origin = 'platform_predefined')
    let predefinedTemplates = await this.prisma.roleTemplate.findMany({
      where: { origin: RoleTemplateOrigin.platform_predefined },
    });

    if (predefinedTemplates.length === 0) {
      const defaultTpl = await this.prisma.roleTemplate.create({
        data: { origin: RoleTemplateOrigin.platform_predefined, label: 'CEO / Superuser' },
      });
      predefinedTemplates = [defaultTpl];
    }

    let ownerRole: any = null;

    for (const tpl of predefinedTemplates) {
      const role = await this.prisma.role.create({
        data: {
          companyId: company.id,
          roleTemplateId: tpl.id,
          label: tpl.label,
          isSystem: true,
        },
      });

      const labelLower = tpl.label.toLowerCase();
      if (
        labelLower.includes('ceo') ||
        labelLower.includes('superuser') ||
        labelLower.includes('executive') ||
        labelLower.includes('owner')
      ) {
        ownerRole = role;
      }
    }

    if (!ownerRole) {
      ownerRole = await this.prisma.role.create({
        data: {
          companyId: company.id,
          roleTemplateId: predefinedTemplates[0].id,
          label: 'CEO / Superuser',
          isSystem: true,
        },
      });
    }

    // 6. Initial Role Assignment (Assign Company Owner Role to Owner User)
    await this.prisma.roleAssignment.create({
      data: {
        userId: ownerUser.id,
        roleId: ownerRole.id,
        scopeType: ScopeType.Company,
        scopeId: company.id,
        grantedById: ownerUser.id,
      },
    });

    // 7. Seed & Clone Platform Compliance Rules
    try {
      const platformRules = await this.prisma.complianceRule.findMany({
        where: { companyId: null },
      });

      for (const pRule of platformRules) {
        const clonedRule = await this.prisma.complianceRule.create({
          data: {
            companyId: company.id,
            name: pRule.name,
            description: pRule.description,
            severity: pRule.severity || "High",
            sourceTemplateId: pRule.id,
            isActive: true,
          },
        });

        await this.prisma.complianceBinding.create({
          data: {
            ruleId: clonedRule.id,
            scopeType: ScopeType.Company,
            scopeId: company.id,
          },
        });
      }
    } catch (ruleErr) {
      console.warn('Warning during compliance rule cloning:', ruleErr);
    }

    // 8. Create Default Branch & Team
    const branch = await this.prisma.branch.create({
      data: { companyId: company.id, name: `${dto.companyLegalName} Headquarters` },
    });
    await this.prisma.team.create({
      data: { branchId: branch.id, name: 'Core Team' },
    });

    // 9. Seed Default Process Templates for New Company (Startup / Enterprise)
    try {
      const onboardingTemplate = await this.prisma.processTemplate.create({
        data: {
          companyId: company.id,
          name: `${dto.companyLegalName} Employee Onboarding Workflow`,
          category: 'HR & Operations',
          version: 1,
          isActive: true,
          createdById: ownerUser.id,
        },
      });

      await this.prisma.processTemplateStep.createMany({
        data: [
          { templateId: onboardingTemplate.id, stepOrder: 1, name: 'Submit Personal Info & Equipment Request', stepType: 'Input_Required' },
          { templateId: onboardingTemplate.id, stepOrder: 2, name: 'HR Manager Verification & Approval', stepType: 'Approval' },
          { templateId: onboardingTemplate.id, stepOrder: 3, name: 'Automated System Access Provisioning', stepType: 'Automated_Task' },
        ],
      });

      const vendorTemplate = await this.prisma.processTemplate.create({
        data: {
          companyId: company.id,
          name: `${dto.companyLegalName} Vendor Security & Compliance Audit`,
          category: 'Compliance & Procurement',
          version: 1,
          isActive: true,
          createdById: ownerUser.id,
        },
      });

      await this.prisma.processTemplateStep.createMany({
        data: [
          { templateId: vendorTemplate.id, stepOrder: 1, name: 'Vendor Security Questionnaire Intake', stepType: 'Input_Required' },
          { templateId: vendorTemplate.id, stepOrder: 2, name: 'Compliance Officer Risk Sign-off', stepType: 'Approval' },
        ],
      });

      if (plan && (plan.name.includes('Enterprise') || plan.name.includes('Growth') || plan.name.includes('Pro'))) {
        const enterpriseSdlcTemplate = await this.prisma.processTemplate.create({
          data: {
            companyId: company.id,
            name: `${dto.companyLegalName} Enterprise Software Release & Security Gate`,
            category: 'Engineering & DevOps',
            version: 1,
            isActive: true,
            createdById: ownerUser.id,
          },
        });

        await this.prisma.processTemplateStep.createMany({
          data: [
            { templateId: enterpriseSdlcTemplate.id, stepOrder: 1, name: 'Code Audit & Vulnerability Scan', stepType: 'Input_Required' },
            { templateId: enterpriseSdlcTemplate.id, stepOrder: 2, name: 'Security Lead Release Approval', stepType: 'Approval' },
            { templateId: enterpriseSdlcTemplate.id, stepOrder: 3, name: 'Automated Production Deployment', stepType: 'Automated_Task' },
          ],
        });
      }
    } catch (tplErr) {
      console.error('Error seeding process templates during registration:', tplErr);
    }

    return {
      success: true,
      message: 'Company successfully registered and platform defaults initialized.',
      company: {
        id: company.id,
        legalName: company.legalName,
        status: company.status,
      },
      owner: {
        id: ownerUser.id,
        fullName: ownerUser.fullName,
        email: ownerUser.email,
        assignedRole: ownerRole.label,
      },
    };
  }

  async findAll() {
    return this.prisma.company.findMany({
      include: {
        subscriptions: { include: { plan: true } },
        branches: true,
        _count: {
          select: { users: true, branches: true, tasks: true, processTemplates: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        subscriptions: { include: { plan: true } },
        branches: { include: { teams: true } },
        users: {
          select: { id: true, fullName: true, email: true, isActive: true },
        },
      },
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async create(dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        legalName: dto.legalName,
        status: dto.status ?? 'Active',
      },
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.company.delete({ where: { id } });
    return { message: 'Company deleted successfully' };
  }
}
