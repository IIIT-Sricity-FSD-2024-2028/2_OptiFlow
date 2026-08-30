import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PlanLimitService } from '../../core/services/plan-limit.service';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/guards/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ScopeType } from '@prisma/client';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { isBranchManager } from '../../core/utils/tenant-scope.util';
import * as bcrypt from 'bcryptjs';

@ApiTags('Governance')
@Controller('governance')
@UseGuards(RolesGuard)
@Roles('Access Governance', 'Company Owner', 'System Admin') // Protect everything with these roles
export class GovernanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimitService: PlanLimitService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'List all company users with their role assignments' })
  async getUsers(@CompanyId() companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      include: {
        roleAssignments: {
          include: { role: { select: { id: true, label: true } } },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  @Get('roles')
  @ApiOperation({ summary: 'List all system roles defined for this company' })
  async getRoles(@CompanyId() companyId: string) {
    return this.prisma.role.findMany({
      where: { companyId },
      include: {
        roleTemplate: { 
          include: { 
            defaultPermissions: {
              include: { permission: true }
            }
          } 
        },
      },
      orderBy: { label: 'asc' },
    });
  }

  @Get('billing')
  @Roles('System Admin', 'system_admin')
  @ApiOperation({ summary: 'Get current company subscription and plan usage' })
  async getBilling(@CompanyId() companyId: string) {
    return this.planLimitService.getCompanyPlanUsage(companyId);
  }

  @Post('invite')
  @Roles(
    'Access Governance',
    'Company Owner',
    'System Admin',
    'Branch Manager',
    'branch_manager',
  )
  @ApiOperation({ summary: 'Invite a new employee and assign a role' })
  async inviteEmployee(
    @Body() body: InviteEmployeeDto,
    @CompanyId() companyId: string,
    @ActorUserId() actorId: string,
    @Req() req: any,
  ) {
    await this.planLimitService.checkUserLimit(companyId);

    const role = await this.prisma.role.findFirst({
      where: { id: body.roleId, companyId },
    });
    if (!role) {
      throw new BadRequestException('Invalid role for this company');
    }

    let effectiveBranchId = body.branchId;

    if (isBranchManager(req.user)) {
      if (!req.user?.scopeId) {
        throw new ForbiddenException(
          'Branch Manager has no assigned branch scope.',
        );
      }
      if (body.branchId && body.branchId !== req.user.scopeId) {
        throw new ForbiddenException(
          'Branch Managers can only invite users to their assigned branch.',
        );
      }
      effectiveBranchId = req.user.scopeId;
    }

    const isAssigningBranchManager = role.label
      .toLowerCase()
      .includes('branch manager');

    if (isAssigningBranchManager && !effectiveBranchId) {
      throw new BadRequestException(
        'branchId is required when assigning the Branch Manager role',
      );
    }

    if (effectiveBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: effectiveBranchId, companyId },
      });
      if (!branch) {
        throw new BadRequestException('Invalid branch for this company');
      }
    }

    let scopeType: ScopeType = ScopeType.Company;
    let scopeId = companyId;

    if (isAssigningBranchManager && effectiveBranchId) {
      scopeType = ScopeType.Branch;
      scopeId = effectiveBranchId;
    } else if (isBranchManager(req.user) && effectiveBranchId) {
      scopeType = ScopeType.Branch;
      scopeId = effectiveBranchId;
    }

    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          companyId,
          email: body.email,
          fullName: body.name,
          passwordHash,
        },
      });

      const roleAssignment = await tx.roleAssignment.create({
        data: {
          userId: user.id,
          roleId: body.roleId,
          scopeType,
          scopeId,
          grantedById: actorId,
        },
      });

      return { user, roleAssignment };
    });
  }

  @Post('roles/clone')
  @ApiOperation({ summary: 'Create a custom role based on permissions' })
  async cloneRole(
    @Body() body: { sourceRoleId: string; newName: string; permissionIds: string[] },
    @CompanyId() companyId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Create new custom role template
      const template = await tx.roleTemplate.create({
        data: {
          label: body.newName,
          origin: 'company_custom',
          companyId,
        },
      });

      // Map the selected permissions
      if (body.permissionIds && body.permissionIds.length > 0) {
        await tx.roleTemplatePermission.createMany({
          data: body.permissionIds.map(permissionId => ({
            roleTemplateId: template.id,
            permissionId,
          })),
        });
      }

      // Create the final concrete Role for the company
      const role = await tx.role.create({
        data: {
          companyId,
          roleTemplateId: template.id,
          label: body.newName,
          isSystem: false,
        },
      });

      return role;
    });
  }
}
