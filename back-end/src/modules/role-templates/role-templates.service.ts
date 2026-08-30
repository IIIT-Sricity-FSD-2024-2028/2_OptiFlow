import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRoleTemplateDto } from './dto/create-role-template.dto';
import { UpdateRoleTemplateDto } from './dto/update-role-template.dto';

@Injectable()
export class RoleTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.roleTemplate.findMany({
      where: companyId
        ? { OR: [{ companyId: null }, { companyId }] }
        : undefined,
      include: {
        defaultPermissions: { include: { permission: true } },
      },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.roleTemplate.findUnique({
      where: { id },
      include: {
        defaultPermissions: { include: { permission: true } },
      },
    });
    if (!template) throw new NotFoundException(`RoleTemplate ${id} not found`);
    return template;
  }

  async create(dto: CreateRoleTemplateDto, companyId?: string) {
    return this.prisma.roleTemplate.create({
      data: {
        label: dto.label,
        origin: (dto.origin as any) ?? 'company_custom',
        companyId: dto.companyId || companyId || null,
        createdById: dto.createdById ?? null,
      },
      include: { defaultPermissions: true },
    });
  }

  async update(id: string, dto: UpdateRoleTemplateDto) {
    await this.findOne(id);
    return this.prisma.roleTemplate.update({
      where: { id },
      data: {
        ...(dto.label ? { label: dto.label } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.roleTemplatePermission.deleteMany({
      where: { roleTemplateId: id },
    });
    await this.prisma.roleTemplate.delete({ where: { id } });
    return { message: 'Role template deleted successfully' };
  }
}
