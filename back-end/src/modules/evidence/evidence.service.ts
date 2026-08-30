import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';

@Injectable()
export class EvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.complianceEvidence.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        task: { select: { id: true, title: true } },
        violation: { include: { rule: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const evidence = await this.prisma.complianceEvidence.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        task: { select: { id: true, title: true } },
        violation: { include: { rule: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!evidence) throw new NotFoundException(`Evidence ${id} not found`);
    return evidence;
  }

  async create(dto: CreateEvidenceDto, companyId?: string) {
    const targetCompanyId =
      companyId || dto.companyId || (dto as any).company_id || null;
    const userId = dto.user_id || (dto as any).userId;
    const taskId = dto.task_id ?? (dto as any).taskId ?? null;
    const violationId = dto.violation_id ?? (dto as any).violationId ?? null;
    const evidenceType =
      dto.evidence_type || (dto as any).evidenceType || 'Document';
    const fileUrl = dto.file_url || (dto as any).fileUrl || '';

    return this.prisma.complianceEvidence.create({
      data: {
        companyId: targetCompanyId,
        userId: String(userId),
        taskId: taskId ? String(taskId) : null,
        violationId: violationId ? String(violationId) : null,
        title: dto.title,
        evidenceType: evidenceType,
        fileUrl: fileUrl,
        notes: dto.notes ?? '',
        status: 'Pending',
      },
      include: { user: true, violation: true },
    });
  }

  async update(id: string, dto: UpdateEvidenceDto, reviewerUserId?: string) {
    const before = await this.findOne(id);
    const newStatus = dto.status ?? before.status;

    const updated = await this.prisma.complianceEvidence.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status as any } : {}),
        ...(dto.notes ? { notes: dto.notes } : {}),
        ...(reviewerUserId || dto.reviewed_by
          ? {
              reviewedById: String(reviewerUserId || dto.reviewed_by),
              reviewedAt: new Date(),
            }
          : {}),
      },
    });

    // Auto-resolve violation if evidence is Approved
    if (newStatus === 'Approved' && before.violationId) {
      await this.prisma.complianceViolation.update({
        where: { id: before.violationId },
        data: {
          status: 'Resolved',
          resolvedById:
            reviewerUserId || dto.reviewed_by
              ? String(reviewerUserId || dto.reviewed_by)
              : undefined,
          resolvedAt: new Date(),
          resolutionRemarks: `Auto-resolved via approved evidence "${before.title}"`,
        },
      });
    }

    return updated;
  }

  async remove(id: string, companyId?: string) {
    await this.findOne(id, companyId);
    await this.prisma.complianceEvidence.delete({ where: { id } });
    return { message: 'Evidence deleted successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Called by the real file upload endpoint.
  // Saves Attachment record in Prisma and updates fileUrl on ComplianceEvidence row.
  // ─────────────────────────────────────────────────────────────────────────────
  async attachFile(
    id: string,
    file: Express.Multer.File,
    companyId?: string,
    actorUserId?: string,
  ) {
    const evidence = await this.findOne(id, companyId); // throws 404 if not found
    const fileUrl = `/uploads/${file.filename}`;
    const targetCompanyId = evidence.companyId || companyId;
    const uploaderId = actorUserId || evidence.userId;

    let attachment: any = null;
    if (targetCompanyId && uploaderId) {
      try {
        attachment = await this.prisma.attachment.create({
          data: {
            companyId: targetCompanyId,
            entityType: 'ComplianceEvidence',
            entityId: evidence.id,
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSizeBytes: file.size,
            fileUrl: fileUrl,
            uploadedById: String(uploaderId),
          },
        });
      } catch (e) {
        console.warn('Could not create Attachment record:', e);
      }
    }

    const updatedEvidence = await this.prisma.complianceEvidence.update({
      where: { id },
      data: { fileUrl },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        task: { select: { id: true, title: true } },
        violation: { include: { rule: true } },
      },
    });

    return { evidence: updatedEvidence, attachment };
  }
}
