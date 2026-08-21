import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  DatabaseService,
  SupportRequest,
  SupportReply,
  SupportAttachment,
  FAQ,
} from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateSupportRequestDto } from './dto/update-support-request.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

/** Five days in milliseconds — the auto-close window */
const AUTO_CLOSE_MS = 5 * 24 * 60 * 60 * 1000;

/** Max total attachment bytes per ticket (10 MB) */
const MAX_TICKET_BYTES = 10 * 1024 * 1024;

@Injectable()
export class SupportService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private nextRequestId(): number {
    return this.db.support_requests.length
      ? Math.max(...this.db.support_requests.map((r) => r.request_id)) + 1
      : 1;
  }

  private nextReplyId(): number {
    return this.db.support_replies.length
      ? Math.max(...this.db.support_replies.map((r) => r.reply_id)) + 1
      : 1;
  }

  private nextAttachmentId(): number {
    return this.db.support_attachments.length
      ? Math.max(...this.db.support_attachments.map((a) => a.attachment_id)) + 1
      : 1;
  }

  private nextFaqId(): number {
    return this.db.faqs.length
      ? Math.max(...this.db.faqs.map((f) => f.faq_id)) + 1
      : 1;
  }

  /** Returns all RM user IDs so we can broadcast notifications to the whole team */
  private getRmUserIds(): number[] {
    const rmRole = this.db.roles.find((r) => r.role_name === 'relationship_manager');
    if (!rmRole) return [];
    return this.db.user_roles
      .filter((ur) => ur.role_id === rmRole.role_id)
      .map((ur) => ur.user_id);
  }

  /**
   * Lazy auto-close check. Called whenever a request is fetched.
   * If the ticket has been Resolved for > 5 days and no action was taken,
   * transitions it to Closed and fires a notification to the requester.
   */
  private checkAndAutoClose(req: SupportRequest): SupportRequest {
    if (req.status !== 'Resolved' || !req.resolved_at) return req;
    const resolvedMs = new Date(req.resolved_at).getTime();
    if (Date.now() - resolvedMs < AUTO_CLOSE_MS) return req;

    const idx = this.db.support_requests.findIndex(
      (r) => r.request_id === req.request_id,
    );
    if (idx === -1) return req;

    const now = new Date().toISOString();
    this.db.support_requests[idx] = {
      ...this.db.support_requests[idx],
      status: 'Closed',
      closed_at: now,
      updated_at: now,
    };

    // Notify requester
    this.notifications.create({
      user_id: req.requester_id,
      title: 'Support Ticket Closed',
      message: `Your ticket "${req.subject}" has been automatically closed after 5 days.`,
      type: 'Support',
      link: `enduser/support-history.html?id=${req.request_id}`,
    });

    this.auditLogs.create({
      entity_id: req.request_id,
      entity_type: 'Support_Request',
      action: 'AUTO_CLOSED',
      performed_by: null,
      new_value: { status: 'Closed', closed_at: now },
    });

    return this.db.support_requests[idx];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Support Request CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  /** Create a new support ticket (any non-RM role) */
  createRequest(dto: CreateSupportRequestDto, requesterId: number): SupportRequest {
    const now = new Date().toISOString();
    const req: SupportRequest = {
      request_id: this.nextRequestId(),
      requester_id: requesterId,
      assignee_id: null,
      category: dto.category,
      subject: dto.subject,
      description: dto.description,
      faq_matched: dto.faq_matched ?? false,
      faq_id: dto.faq_id ?? null,
      priority: dto.priority,
      status: 'Open',
      reopen_count: 0,
      first_response_at: null,
      resolved_at: null,
      closed_at: null,
      created_at: now,
      updated_at: now,
    };
    this.db.support_requests.push(req);

    // Notify all RM team members
    const rmIds = this.getRmUserIds();
    for (const rmId of rmIds) {
      this.notifications.create({
        user_id: rmId,
        title: 'New Support Request',
        message: `New ${req.priority} priority ticket from requester #${requesterId}: "${req.subject}"`,
        type: 'Support',
        link: `relationship-manager/ticket-detail.html?id=${req.request_id}`,
      });
    }

    this.auditLogs.create({
      entity_id: req.request_id,
      entity_type: 'Support_Request',
      action: 'CREATED',
      performed_by: requesterId,
      new_value: { ...req },
    });

    return req;
  }

  /** RM queue — all open/active tickets */
  findQueue(): SupportRequest[] {
    return this.db.support_requests
      .filter((r) => r.status !== 'Closed')
      .map((r) => this.checkAndAutoClose(r));
  }

  /** Requester history — all tickets by a specific user (includes Closed) */
  findByRequester(userId: number): SupportRequest[] {
    return this.db.support_requests
      .filter((r) => r.requester_id === userId)
      .map((r) => this.checkAndAutoClose(r));
  }

  /** Single ticket — accessible by requester or any RM user */
  findOne(id: number): SupportRequest {
    const req = this.db.support_requests.find((r) => r.request_id === id);
    if (!req) throw new NotFoundException(`Support request ${id} not found`);
    return this.checkAndAutoClose(req);
  }

  /** Assign ticket to an RM team member */
  assign(id: number, assigneeId: number, actorId: number): SupportRequest {
    const idx = this.db.support_requests.findIndex((r) => r.request_id === id);
    if (idx === -1) throw new NotFoundException(`Support request ${id} not found`);

    const before = { ...this.db.support_requests[idx] };
    const now = new Date().toISOString();
    this.db.support_requests[idx] = {
      ...before,
      assignee_id: assigneeId,
      status: before.status === 'Open' ? 'In_Progress' : before.status,
      updated_at: now,
    };

    // Notify the newly assigned RM agent
    if (assigneeId !== actorId) {
      this.notifications.create({
        user_id: assigneeId,
        title: 'Ticket Assigned to You',
        message: `Support ticket #${id} "${before.subject}" has been assigned to you.`,
        type: 'Support',
        link: `relationship-manager/ticket-detail.html?id=${id}`,
      });
    }

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Support_Request',
      action: 'ASSIGNED',
      performed_by: actorId,
      old_value: { assignee_id: before.assignee_id, status: before.status },
      new_value: { assignee_id: assigneeId, status: this.db.support_requests[idx].status },
    });

    return this.db.support_requests[idx];
  }

  /** Resolve a ticket (RM only) */
  resolve(id: number, actorId: number): SupportRequest {
    const idx = this.db.support_requests.findIndex((r) => r.request_id === id);
    if (idx === -1) throw new NotFoundException(`Support request ${id} not found`);

    const before = { ...this.db.support_requests[idx] };
    const now = new Date().toISOString();
    this.db.support_requests[idx] = {
      ...before,
      status: 'Resolved',
      resolved_at: now,
      updated_at: now,
    };

    this.notifications.create({
      user_id: before.requester_id,
      title: 'Support Ticket Resolved',
      message: `Your ticket "${before.subject}" has been marked as resolved. It will auto-close in 5 days if no action is taken.`,
      type: 'Support',
      link: `enduser/support-history.html?id=${id}`,
    });

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Support_Request',
      action: 'RESOLVED',
      performed_by: actorId,
      old_value: { status: before.status },
      new_value: { status: 'Resolved', resolved_at: now },
    });

    return this.db.support_requests[idx];
  }

  /** Reopen a closed/resolved ticket (RM only) */
  reopen(id: number, actorId: number): SupportRequest {
    const idx = this.db.support_requests.findIndex((r) => r.request_id === id);
    if (idx === -1) throw new NotFoundException(`Support request ${id} not found`);

    const before = { ...this.db.support_requests[idx] };
    if (before.status !== 'Resolved' && before.status !== 'Closed') {
      throw new BadRequestException('Only Resolved or Closed tickets can be reopened.');
    }

    const now = new Date().toISOString();
    this.db.support_requests[idx] = {
      ...before,
      status: 'Open',
      resolved_at: null,
      closed_at: null,
      reopen_count: before.reopen_count + 1,
      updated_at: now,
    };

    // Notify requester and assigned agent
    this.notifications.create({
      user_id: before.requester_id,
      title: 'Support Ticket Reopened',
      message: `Your ticket "${before.subject}" has been reopened by the support team.`,
      type: 'Support',
      link: `enduser/support-history.html?id=${id}`,
    });
    if (before.assignee_id && before.assignee_id !== actorId) {
      this.notifications.create({
        user_id: before.assignee_id,
        title: 'Ticket Reopened',
        message: `Support ticket #${id} "${before.subject}" has been reopened.`,
        type: 'Support',
        link: `relationship-manager/ticket-detail.html?id=${id}`,
      });
    }

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Support_Request',
      action: 'REOPENED',
      performed_by: actorId,
      old_value: { status: before.status, reopen_count: before.reopen_count },
      new_value: { status: 'Open', reopen_count: before.reopen_count + 1 },
    });

    return this.db.support_requests[idx];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Replies
  // ─────────────────────────────────────────────────────────────────────────────

  /** Get all replies for a ticket (requester sees only non-internal; RM sees all) */
  findReplies(requestId: number, isRm: boolean): SupportReply[] {
    const replies = this.db.support_replies.filter(
      (r) => r.request_id === requestId,
    );
    return isRm ? replies : replies.filter((r) => !r.is_internal);
  }

  /** Add a reply to a ticket */
  addReply(
    requestId: number,
    dto: CreateReplyDto,
    authorId: number,
    authorIsRm: boolean,
  ): SupportReply {
    const req = this.findOne(requestId);
    if (req.status === 'Closed') {
      throw new ForbiddenException('Cannot reply to a closed ticket.');
    }

    const now = new Date().toISOString();
    const reply: SupportReply = {
      reply_id: this.nextReplyId(),
      request_id: requestId,
      author_id: authorId,
      body: dto.body,
      is_internal: authorIsRm ? (dto.is_internal ?? false) : false,
      created_at: now,
    };
    this.db.support_replies.push(reply);

    // Update ticket metadata
    const idx = this.db.support_requests.findIndex(
      (r) => r.request_id === requestId,
    );
    if (idx !== -1) {
      const reqRow = this.db.support_requests[idx];

      // Set first_response_at on the first RM reply
      const firstResponse =
        authorIsRm && !reqRow.first_response_at ? now : reqRow.first_response_at;

      // Status transitions on reply
      const newStatus: SupportRequest['status'] = authorIsRm
        ? 'Pending_Reply'   // RM replied → waiting on requester
        : 'In_Progress';    // Requester replied → RM's turn

      this.db.support_requests[idx] = {
        ...reqRow,
        status: reqRow.status === 'Closed' ? reqRow.status : newStatus,
        first_response_at: firstResponse,
        updated_at: now,
      };
    }

    // Notify the other party (skip internal notes for requester notifications)
    if (!reply.is_internal) {
      if (authorIsRm) {
        // RM replied → notify requester
        this.notifications.create({
          user_id: req.requester_id,
          title: 'New Reply on Your Ticket',
          message: `The support team has replied to your ticket "${req.subject}".`,
          type: 'Support',
          link: `enduser/support-history.html?id=${requestId}`,
        });
      } else {
        // Requester replied → notify assignee or all RM
        const target = req.assignee_id;
        const recipients = target ? [target] : this.getRmUserIds();
        for (const rmId of recipients) {
          this.notifications.create({
            user_id: rmId,
            title: 'Requester Replied',
            message: `Requester has replied on ticket #${requestId} "${req.subject}".`,
            type: 'Support',
            link: `relationship-manager/ticket-detail.html?id=${requestId}`,
          });
        }
      }
    }

    this.auditLogs.create({
      entity_id: requestId,
      entity_type: 'Support_Request',
      action: 'REPLY_ADDED',
      performed_by: authorId,
      new_value: { reply_id: reply.reply_id, is_internal: reply.is_internal },
    });

    return reply;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Attachments
  // ─────────────────────────────────────────────────────────────────────────────

  getAttachmentTotal(requestId: number): number {
    return this.db.support_attachments
      .filter((a) => a.request_id === requestId)
      .reduce((sum, a) => sum + a.file_size_bytes, 0);
  }

  findAttachments(requestId: number): SupportAttachment[] {
    return this.db.support_attachments.filter((a) => a.request_id === requestId);
  }

  addAttachment(
    requestId: number,
    fileName: string,
    fileType: string | null,
    fileSizeBytes: number,
    uploadedBy: number,
  ): SupportAttachment {
    // Enforce 10 MB per-ticket cap
    const currentTotal = this.getAttachmentTotal(requestId);
    if (currentTotal + fileSizeBytes > MAX_TICKET_BYTES) {
      throw new BadRequestException(
        `Adding this file would exceed the 10 MB per-ticket attachment limit. ` +
          `Current usage: ${(currentTotal / 1024 / 1024).toFixed(2)} MB.`,
      );
    }

    const now = new Date().toISOString();
    const attachment: SupportAttachment = {
      attachment_id: this.nextAttachmentId(),
      request_id: requestId,
      file_name: fileName,
      file_type: fileType,
      file_size_bytes: fileSizeBytes,
      file_url: `https://storage.officesync.in/support/${requestId}/${encodeURIComponent(fileName)}`,
      uploaded_by: uploadedBy,
      uploaded_at: now,
    };
    this.db.support_attachments.push(attachment);
    return attachment;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FAQ
  // ─────────────────────────────────────────────────────────────────────────────

  findFaqs(category?: string, query?: string): FAQ[] {
    let results = this.db.faqs.filter((f) => f.is_active);
    if (category) {
      results = results.filter(
        (f) => f.category.toLowerCase() === category.toLowerCase(),
      );
    }
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q),
      );
    }
    return results;
  }

  findOneFaq(id: number): FAQ {
    const faq = this.db.faqs.find((f) => f.faq_id === id);
    if (!faq) throw new NotFoundException(`FAQ ${id} not found`);
    return faq;
  }

  createFaq(dto: CreateFaqDto, actorId: number): FAQ {
    const now = new Date().toISOString();
    const faq: FAQ = {
      faq_id: this.nextFaqId(),
      category: dto.category,
      question: dto.question,
      answer: dto.answer,
      created_by: actorId,
      updated_at: now,
      is_active: dto.is_active ?? true,
    };
    this.db.faqs.push(faq);
    this.auditLogs.create({
      entity_id: faq.faq_id,
      entity_type: 'Support_Request', // closest available; 'FAQ' not in SystemEntity
      action: 'FAQ_CREATED',
      performed_by: actorId,
      new_value: { ...faq },
    });
    return faq;
  }

  updateFaq(id: number, dto: UpdateFaqDto, actorId: number): FAQ {
    const idx = this.db.faqs.findIndex((f) => f.faq_id === id);
    if (idx === -1) throw new NotFoundException(`FAQ ${id} not found`);
    const before = { ...this.db.faqs[idx] };
    this.db.faqs[idx] = {
      ...before,
      ...dto,
      updated_at: new Date().toISOString(),
    };
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Support_Request',
      action: 'FAQ_UPDATED',
      performed_by: actorId,
      old_value: before,
      new_value: { ...this.db.faqs[idx] },
    });
    return this.db.faqs[idx];
  }

  removeFaq(id: number, actorId: number): void {
    const idx = this.db.faqs.findIndex((f) => f.faq_id === id);
    if (idx === -1) throw new NotFoundException(`FAQ ${id} not found`);
    const before = { ...this.db.faqs[idx] };
    this.db.faqs.splice(idx, 1);
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Support_Request',
      action: 'FAQ_DELETED',
      performed_by: actorId,
      old_value: before,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Reports
  // ─────────────────────────────────────────────────────────────────────────────

  getReportSummary() {
    const all = this.db.support_requests;
    const total = all.length;

    // Volume by category
    const byCategory: Record<string, number> = {};
    for (const r of all) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    }

    // Volume by role of requester
    const byRole: Record<string, number> = {};
    for (const r of all) {
      const ur = this.db.user_roles.find((x) => x.user_id === r.requester_id);
      const role = this.db.roles.find((x) => x.role_id === ur?.role_id);
      const roleName = role?.role_name ?? 'unknown';
      byRole[roleName] = (byRole[roleName] || 0) + 1;
    }

    // Average first response time (ms → hours)
    const withResponse = all.filter((r) => r.first_response_at);
    const avgResponseHours =
      withResponse.length > 0
        ? withResponse.reduce((sum, r) => {
            const diff =
              new Date(r.first_response_at!).getTime() -
              new Date(r.created_at).getTime();
            return sum + diff;
          }, 0) /
          withResponse.length /
          3600000
        : null;

    // Average resolution time
    const withResolution = all.filter((r) => r.resolved_at);
    const avgResolutionHours =
      withResolution.length > 0
        ? withResolution.reduce((sum, r) => {
            const diff =
              new Date(r.resolved_at!).getTime() -
              new Date(r.created_at).getTime();
            return sum + diff;
          }, 0) /
          withResolution.length /
          3600000
        : null;

    // Reopen rate
    const reopenedCount = all.filter((r) => r.reopen_count > 0).length;
    const reopenRate = total > 0 ? reopenedCount / total : 0;

    // Unresolved backlog
    const unresolved = all.filter((r) =>
      ['Open', 'In_Progress', 'Pending_Reply'].includes(r.status),
    ).length;

    // Auto-close rate
    const autoClosed = all.filter(
      (r) => r.closed_at !== null && r.reopen_count === 0,
    ).length;
    const autoCloseRate = total > 0 ? autoClosed / total : 0;

    return {
      total,
      byCategory,
      byRole,
      avgResponseHours,
      avgResolutionHours,
      reopenRate,
      reopenedCount,
      unresolved,
      autoCloseRate,
      autoClosed,
    };
  }
}
