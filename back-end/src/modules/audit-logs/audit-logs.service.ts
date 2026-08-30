import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.auditLog.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { performedAt: 'desc' },
    });
  }

  async findByEntity(entityType: string, entityId: string | number) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId: String(entityId),
      },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { performedAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.auditLog.findMany({
      where: { performedById: userId },
      orderBy: { performedAt: 'desc' },
    });
  }

  async create(dto: CreateAuditLogDto, companyId?: string) {
    const actionEnum = (
      [
        'CREATE',
        'UPDATE',
        'DELETE',
        'STATUS_CHANGE',
        'LOGIN',
        'PERMISSION_CHANGE',
      ].includes(dto.action)
        ? dto.action
        : 'UPDATE'
    ) as any;

    return this.prisma.auditLog.create({
      data: {
        companyId:
          companyId || dto.companyId || 'b7744408-190c-4b83-82c5-ab0049afb6b2',
        entityType: dto.entity_type,
        entityId: String(dto.entity_id),
        action: actionEnum,
        performedById: dto.performed_by ? String(dto.performed_by) : null,
        usedPermissionSlug: dto.usedPermissionSlug ?? null,
        ipAddress: dto.ip_address ?? null,
        userAgent: dto.userAgent ?? null,
        oldValue: dto.old_value ?? undefined,
        newValue: dto.new_value ?? undefined,
      },
    });
  }
}
