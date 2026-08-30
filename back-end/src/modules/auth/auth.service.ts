import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
      include: {
        company: true,
        roleAssignments: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Resolve System Role Label from RoleAssignments
    let roleLabel = 'Team Member';
    let roleId: string | number = 1;

    if (user.roleAssignments && user.roleAssignments.length > 0) {
      const systemAdminRole = user.roleAssignments.find(
        (ra) =>
          ra.role &&
          (ra.role.label.includes('System Admin') ||
            ra.role.label.includes('system_admin')),
      );
      const ownerRole = user.roleAssignments.find(
        (ra) =>
          ra.role &&
          (ra.role.label.includes('Owner') ||
            ra.role.label.includes('CEO') ||
            ra.role.label.includes('CTO') ||
            ra.role.label.includes('COO') ||
            ra.role.label.includes('Superuser')),
      );
      const branchManagerRole = user.roleAssignments.find(
        (ra) =>
          ra.role && ra.role.label.toLowerCase().includes('branch manager'),
      );
      const hrRole = user.roleAssignments.find(
        (ra) =>
          ra.role &&
          (ra.role.label.includes('Governance') ||
            ra.role.label.includes('HR')),
      );
      const processRole = user.roleAssignments.find(
        (ra) =>
          ra.role &&
          (ra.role.label.includes('Process Admin') ||
            ra.role.label.includes('Process')),
      );
      const complianceRole = user.roleAssignments.find(
        (ra) => ra.role && ra.role.label.includes('Compliance'),
      );
      const pmRole = user.roleAssignments.find(
        (ra) =>
          ra.role &&
          (ra.role.label.includes('Project Manager') ||
            ra.role.label.includes('PM')),
      );
      const tlRole = user.roleAssignments.find(
        (ra) =>
          ra.role &&
          (ra.role.label.includes('Team Lead') || ra.role.label.includes('TL')),
      );

      const matchedAssignment =
        systemAdminRole ||
        ownerRole ||
        branchManagerRole ||
        hrRole ||
        processRole ||
        complianceRole ||
        pmRole ||
        tlRole ||
        user.roleAssignments[0];
      if (matchedAssignment && matchedAssignment.role) {
        roleLabel = matchedAssignment.role.label;
        roleId = matchedAssignment.roleId || matchedAssignment.role.id;
      }
    }

    let scopeType: string | undefined;
    let scopeId: string | undefined;
    let branchName: string | undefined;

    if (user.roleAssignments && user.roleAssignments.length > 0) {
      const bmAssignment = user.roleAssignments.find(
        (ra) =>
          ra.role && ra.role.label.toLowerCase().includes('branch manager'),
      );
      if (bmAssignment) {
        scopeType = bmAssignment.scopeType;
        scopeId = bmAssignment.scopeId;
        if (scopeId) {
          const branch = await this.prisma.branch.findFirst({
            where: { id: scopeId, companyId: user.companyId },
            select: { name: true },
          });
          branchName = branch?.name;
        }
      }
    }

    // Resolve Strict Target Route matching exact front-end static HTML files:
    let targetRoute = 'admin/pm/tasks.html';
    let roleSlug = 'team_member';

    const rLower = roleLabel.toLowerCase();

    if (rLower.includes('system admin') || rLower.includes('system_admin')) {
      targetRoute = 'admin-console/admin-dashboard.html';
      roleSlug = 'system_admin';
    } else if (
      rLower.includes('owner') ||
      rLower.includes('ceo') ||
      rLower.includes('cto') ||
      rLower.includes('coo') ||
      rLower.includes('superuser')
    ) {
      targetRoute = 'admin/executive/executive_dashboard.html'; // Company Owner -> admin/executive/executive_dashboard.html
      roleSlug = 'superuser';
    } else if (rLower.includes('branch manager')) {
      targetRoute = 'admin/executive/executive_dashboard.html';
      roleSlug = 'branch_manager';
    } else if (rLower.includes('governance') || rLower.includes('hr')) {
      targetRoute = 'admin/pm/hr-dashboard.html'; // Access Governance -> admin/pm/hr-dashboard.html
      roleSlug = 'hr_manager';
    } else if (rLower.includes('process')) {
      targetRoute = 'superuser/dashboard.html'; // Process Admin -> superuser/dashboard.html
      roleSlug = 'project_manager';
    } else if (rLower.includes('compliance')) {
      targetRoute = 'modules/compliance.html'; // Compliance Officer -> modules/compliance.html
      roleSlug = 'compliance_officer';
    } else if (rLower.includes('project') || rLower.includes('pm')) {
      targetRoute = 'admin/pm/pm-dashboard.html'; // Project Manager -> admin/pm/pm-dashboard.html
      roleSlug = 'project_manager';
    } else if (rLower.includes('lead') || rLower.includes('tl')) {
      targetRoute = 'enduser/tl-dashboard.html'; // Team Lead -> enduser/tl-dashboard.html
      roleSlug = 'team_leader';
    } else {
      targetRoute = 'admin/pm/tasks.html'; // Team Member -> admin/pm/tasks.html
      roleSlug = 'team_member';
    }

    return {
      success: true,
      message: 'Login successful',
      targetRoute,
      roleSlug,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        jobTitle: user.jobTitle,
        companyId: user.companyId,
        companyName: user.company?.legalName,
        assignedRole: roleLabel,
        roleId: roleId,
        targetRoute,
        scopeType,
        scopeId,
        branchName,
      },
    };
  }

  async registerCompany(
    dto: import('./dto/register-company.dto').RegisterCompanyDto,
  ) {
    const jwt = require('jsonwebtoken');
    const { RoleTemplateOrigin, ScopeType } = require('@prisma/client');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          legalName: dto.companyLegalName,
          status: 'Active',
        },
      });

      // 2. Create User (registering owner becomes System Admin)
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          fullName: dto.ownerFullName,
          email: dto.ownerEmail,
          passwordHash,
        },
      });

      // 2.5 Create Subscription linking the selected Plan and Billing Cycle
      await tx.subscription.create({
        data: {
          companyId: company.id,
          planId: dto.planId,
          billingCycle: dto.billingCycle,
          status: 'Active',
          currentPeriodEnd: new Date(
            Date.now() +
              (dto.billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000,
          ),
        },
      });

      // 3. Ensure System Admin RoleTemplate exists at platform level
      let platformRoleTemplates = await tx.roleTemplate.findMany({
        where: {
          origin: RoleTemplateOrigin.platform_predefined,
          companyId: null,
        },
      });

      const hasSystemAdminTemplate = platformRoleTemplates.some(
        (t) => t.label === 'System Admin',
      );
      if (!hasSystemAdminTemplate) {
        const systemAdminTemplate = await tx.roleTemplate.create({
          data: {
            origin: RoleTemplateOrigin.platform_predefined,
            label: 'System Admin',
          },
        });
        platformRoleTemplates = [...platformRoleTemplates, systemAdminTemplate];
      }

      // 4. Clone RoleTemplates to Roles for the new company
      let sysAdminRole: any = null;
      for (const template of platformRoleTemplates) {
        const role = await tx.role.create({
          data: {
            companyId: company.id,
            roleTemplateId: template.id,
            label: template.label,
            isSystem: true,
          },
        });

        if (template.label === 'System Admin') {
          sysAdminRole = role;
        }
      }

      if (!sysAdminRole) {
        const fallbackTemplate =
          platformRoleTemplates.find((t) => t.label === 'System Admin') ||
          (await tx.roleTemplate.create({
            data: {
              origin: RoleTemplateOrigin.platform_predefined,
              label: 'System Admin',
            },
          }));

        sysAdminRole = await tx.role.create({
          data: {
            companyId: company.id,
            roleTemplateId: fallbackTemplate.id,
            label: 'System Admin',
            isSystem: true,
          },
        });
      }

      // 5. Assign registering user as System Admin (company scope)
      await tx.roleAssignment.create({
        data: {
          userId: user.id,
          roleId: sysAdminRole.id,
          scopeType: ScopeType.Company,
          scopeId: company.id,
          grantedById: user.id,
        },
      });

      // 5. Clone ComplianceRules
      const platformRules = await tx.complianceRule.findMany({
        where: { companyId: null },
      });

      for (const rule of platformRules) {
        await tx.complianceRule.create({
          data: {
            companyId: company.id,
            name: rule.name,
            description: rule.description,
            severity: rule.severity,
            sourceTemplateId: rule.id,
            isActive: true,
          },
        });
      }

      return { user, company, sysAdminRole };
    });

    // Generate JWT
    const token = jwt.sign(
      {
        sub: result.user.id,
        companyId: result.company.id,
        role: result.sysAdminRole ? result.sysAdminRole.label : 'System Admin',
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' },
    );

    return {
      success: true,
      token,
      targetRoute: 'admin-console/admin-dashboard.html',
      roleSlug: 'system_admin',
      user: {
        id: result.user.id,
        name: result.user.fullName,
        fullName: result.user.fullName,
        email: result.user.email,
        jobTitle: result.user.jobTitle,
        companyId: result.company.id,
        companyName: result.company.legalName,
        role: 'system_admin',
        roleLabel: 'System Admin',
        assignedRole: 'System Admin',
        roleId: result.sysAdminRole?.id,
        targetRoute: 'admin-console/admin-dashboard.html',
      },
    };
  }

  async getPublicPlans() {
    return this.prisma.plan.findMany({
      select: {
        id: true,
        name: true,
        priceMonthly: true,
        priceYearly: true,
        currency: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
