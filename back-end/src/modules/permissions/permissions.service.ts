import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.permission.findMany({
      where: companyId
        ? { OR: [{ companyId: null }, { companyId }] }
        : undefined,
      orderBy: { slug: 'asc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const permission = await this.prisma.permission.findFirst({
      where: {
        id,
        ...(companyId ? { OR: [{ companyId: null }, { companyId }] } : {}),
      },
    });
    if (!permission) throw new NotFoundException(`Permission ${id} not found`);
    return permission;
  }

  async create(dto: CreatePermissionDto, companyId?: string) {
    return this.prisma.permission.create({
      data: {
        slug: dto.slug,
        module: dto.module,
        description: dto.description,
        companyId: dto.companyId || companyId || null,
      },
    });
  }

  async update(id: string, dto: UpdatePermissionDto, companyId?: string) {
    await this.findOne(id, companyId);
    return this.prisma.permission.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, companyId?: string) {
    await this.findOne(id, companyId);
    await this.prisma.permission.delete({ where: { id } });
    return { message: 'Permission deleted successfully' };
  }
}
