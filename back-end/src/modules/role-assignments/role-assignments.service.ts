import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto';

@Injectable()
export class RoleAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string, userId?: string, roleId?: string) {
    return this.prisma.roleAssignment.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(roleId ? { roleId } : {}),
        revokedAt: null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        role: { select: { id: true, label: true } },
        grantedByUser: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.roleAssignment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        role: { select: { id: true, label: true } },
        grantedByUser: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!assignment)
      throw new NotFoundException(`RoleAssignment ${id} not found`);
    return assignment;
  }

  async create(
    dto: CreateRoleAssignmentDto,
    companyId: string,
    grantedById: string,
  ) {
    // Revoke any existing active assignment for same user+role+scope
    await this.prisma.roleAssignment.updateMany({
      where: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return this.prisma.roleAssignment.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        grantedById,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        role: { select: { id: true, label: true } },
        grantedByUser: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.roleAssignment.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
