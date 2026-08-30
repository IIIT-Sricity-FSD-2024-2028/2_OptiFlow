import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlatformSupportAccessDto } from './dto/create-platform-support-access.dto';
import { UpdatePlatformSupportAccessDto } from './dto/update-platform-support-access.dto';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class PlatformSupportAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string, adminUserId?: string) {
    return this.prisma.platformSupportAccess.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(adminUserId ? { adminUserId } : {}),
      },
      include: {
        company: { select: { id: true, legalName: true, status: true } },
        adminUser: {
          select: { id: true, fullName: true, email: true, isActive: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.platformSupportAccess.findUnique({
      where: { id },
      include: {
        company: true,
        adminUser: {
          select: { id: true, fullName: true, email: true, isActive: true },
        },
      },
    });
    if (!r) throw new NotFoundException(`SupportAccess ${id} not found`);
    return r;
  }

  async create(dto: CreatePlatformSupportAccessDto, adminId?: string) {
    const initialLog = [
      {
        action: 'granted',
        by: adminId || dto.adminUserId,
        at: new Date().toISOString(),
        reason: dto.reason,
      },
    ];

    return this.prisma.platformSupportAccess.create({
      data: {
        adminUserId: dto.adminUserId,
        companyId: dto.companyId,
        reason: dto.reason,
        expiresAt: new Date(dto.expiresAt),
        actionLog: initialLog,
      },
      include: {
        company: { select: { id: true, legalName: true } },
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async update(
    id: string,
    dto: UpdatePlatformSupportAccessDto,
    adminId?: string,
  ) {
    const existing = await this.findOne(id);
    const existingLog = Array.isArray(existing.actionLog)
      ? (existing.actionLog as any[])
      : [];
    const updatedLog = [
      ...existingLog,
      {
        action: 'updated',
        by: adminId || 'unknown',
        at: new Date().toISOString(),
        changes: dto,
      },
    ];

    return this.prisma.platformSupportAccess.update({
      where: { id },
      data: {
        ...(dto.reason ? { reason: dto.reason } : {}),
        ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
        actionLog: dto.actionLog ? dto.actionLog : updatedLog,
      },
      include: {
        company: { select: { id: true, legalName: true } },
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(id: string, adminId?: string) {
    await this.findOne(id);
    await this.prisma.platformSupportAccess.delete({ where: { id } });
    return {
      message: `SupportAccess ${id} revoked successfully by ${adminId || 'platform_admin'}`,
    };
  }
}
