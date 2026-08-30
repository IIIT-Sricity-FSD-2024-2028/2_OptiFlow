import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.role.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        roleTemplate: true,
        permissions: { include: { permission: true } },
        roleAssignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
  }

  async findOne(idOrSlug: string, companyId?: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { label: idOrSlug }],
        ...(companyId ? { companyId } : {}),
      },
      include: {
        roleTemplate: true,
        permissions: { include: { permission: true } },
        roleAssignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!role) throw new NotFoundException(`Role ${idOrSlug} not found`);
    return role;
  }

  async create(dto: CreateRoleDto, companyId?: string) {
    const targetCompanyId = dto.companyId || companyId;
    if (!targetCompanyId)
      throw new NotFoundException('Company ID is required to create a role');

    let templateId = dto.roleTemplateId;
    if (!templateId) {
      let template = await this.prisma.roleTemplate.findFirst({
        where: { label: dto.role_name },
      });
      if (!template) {
        template = await this.prisma.roleTemplate.create({
          data: {
            label: dto.role_name,
            origin: 'company_custom',
            companyId: targetCompanyId,
          },
        });
      }
      templateId = template.id;
    }

    return this.prisma.role.create({
      data: {
        companyId: targetCompanyId,
        roleTemplateId: templateId,
        label: dto.role_name,
        isSystem: dto.is_system ?? false,
      },
      include: { roleTemplate: true, permissions: true },
    });
  }

  async update(idOrSlug: string, dto: UpdateRoleDto, companyId?: string) {
    const existing = await this.findOne(idOrSlug, companyId);
    return this.prisma.role.update({
      where: { id: existing.id },
      data: {
        ...(dto.role_name ? { label: dto.role_name } : {}),
        ...(dto.is_system !== undefined ? { isSystem: dto.is_system } : {}),
      },
    });
  }

  async remove(idOrSlug: string, companyId?: string) {
    const existing = await this.findOne(idOrSlug, companyId);
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: existing.id },
    });
    await this.prisma.roleAssignment.deleteMany({
      where: { roleId: existing.id },
    });
    await this.prisma.role.delete({ where: { id: existing.id } });
    return { message: 'Role deleted successfully' };
  }
}
