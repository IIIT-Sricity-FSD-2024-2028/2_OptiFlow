import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    const filter = (companyId && companyId !== 'all' && companyId !== 'any' && companyId !== 'guest') ? { companyId } : undefined;
    return this.prisma.user.findMany({
      where: filter,
      include: {
        company: { select: { id: true, legalName: true } },
        manager: { select: { id: true, fullName: true, email: true } },
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllUserRoles(companyId?: string) {
    const filter = (companyId && companyId !== 'all' && companyId !== 'any' && companyId !== 'guest') ? { user: { companyId } } : undefined;
    return this.prisma.roleAssignment.findMany({
      where: filter,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        role: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, legalName: true } },
        manager: { select: { id: true, fullName: true, email: true } },
        reports: { select: { id: true, fullName: true, email: true } },
        roleAssignments: {
          include: {
            role: true,
          },
        },
        assignedTasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async getActivities(userId: string) {
    await this.findOne(userId);
    return this.prisma.auditLog.findMany({
      where: { performedById: userId },
      orderBy: { performedAt: 'desc' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { companyId: dto.companyId, email: dto.email.toLowerCase() },
    });
    if (existing)
      throw new BadRequestException('Email already exists in this company');

    if (dto.managerUserId) {
      const managerExists = await this.prisma.user.findUnique({
        where: { id: dto.managerUserId },
      });
      if (!managerExists)
        throw new BadRequestException(`Manager ${dto.managerUserId} not found`);
    }

    const user = await this.prisma.user.create({
      data: {
        companyId: dto.companyId,
        fullName: dto.full_name,
        email: dto.email.toLowerCase(),
        passwordHash: dto.password_hash ?? 'default_hash',
        managerUserId: dto.managerUserId ?? null,
        isActive: dto.is_active ?? true,
      },
    });

    if (dto.role) {
      const role = await this.prisma.role.findFirst({
        where: { companyId: dto.companyId, label: dto.role },
      });
      if (role) {
        await this.prisma.roleAssignment.create({
          data: {
            userId: user.id,
            roleId: role.id,
            scopeType: 'Company',
            scopeId: dto.companyId,
            grantedById: user.id,
          },
        });
      }
    }

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    const currentUser = await this.findOne(id);

    if (
      dto.email &&
      dto.email.toLowerCase() !== currentUser.email.toLowerCase()
    ) {
      const duplicate = await this.prisma.user.findFirst({
        where: {
          companyId: currentUser.companyId,
          email: dto.email.toLowerCase(),
          NOT: { id },
        },
      });
      if (duplicate)
        throw new BadRequestException('Email already exists in this company');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.full_name ? { fullName: dto.full_name } : {}),
        ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
        ...(dto.password_hash ? { passwordHash: dto.password_hash } : {}),
        ...(dto.managerUserId !== undefined
          ? { managerUserId: dto.managerUserId }
          : {}),
        ...(dto.is_active !== undefined
          ? {
              isActive: dto.is_active,
              deactivatedAt: dto.is_active ? null : new Date(),
            }
          : {}),
      },
    });

    if (dto.role) {
      const role = await this.prisma.role.findFirst({
        where: { companyId: currentUser.companyId, label: dto.role },
      });
      if (role) {
        await this.prisma.roleAssignment.deleteMany({ where: { userId: id } });
        await this.prisma.roleAssignment.create({
          data: {
            userId: id,
            roleId: role.id,
            scopeType: 'Company',
            scopeId: currentUser.companyId,
            grantedById: id,
          },
        });
      }
    }

    return this.findOne(updated.id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date() },
    });
    return { message: 'User deactivated successfully' };
  }
}
