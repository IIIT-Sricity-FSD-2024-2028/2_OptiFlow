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
      ].includes(dto.action?.toUpperCase())
        ? dto.action.toUpperCase()
        : 'UPDATE'
    ) as any;

    const resolvedCompanyId = companyId || dto.companyId || 'b7744408-190c-4b83-82c5-ab0049afb6b2';
    const resolvedEntityType = dto.entityType || dto.entity_type || 'System';
    const resolvedEntityId = String(dto.entityId ?? dto.entity_id ?? '0');
    const resolvedPerformedBy = dto.performedBy != null ? String(dto.performedBy) : (dto.performed_by != null ? String(dto.performed_by) : null);
    const resolvedOldValue = dto.oldValue !== undefined ? dto.oldValue : dto.old_value;
    const resolvedNewValue = dto.newValue !== undefined ? dto.newValue : dto.new_value;
    const resolvedIp = dto.ipAddress || dto.ip_address || null;

    return this.prisma.auditLog.create({
      data: {
        companyId: resolvedCompanyId,
        entityType: resolvedEntityType,
        entityId: resolvedEntityId,
        action: actionEnum,
        performedById: resolvedPerformedBy,
        usedPermissionSlug: dto.usedPermissionSlug ?? null,
        ipAddress: resolvedIp,
        userAgent: dto.userAgent ?? null,
        oldValue: resolvedOldValue ?? undefined,
        newValue: resolvedNewValue ?? undefined,
      },
    });
  }
}
