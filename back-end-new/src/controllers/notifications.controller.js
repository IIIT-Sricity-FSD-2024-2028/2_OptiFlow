import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { validateRequired } from '../utils/validation.js';


// ============================================================================
// NOTIFICATIONS CONTROLLERS & ENDPOINTS
// ============================================================================

/**
 * Roles that may read or change another user's notifications (SEC-M5-15). Used by every
 * handler in this file, so list, read, read-all and delete agree on who is privileged.
 */
const NOTIFICATION_ADMIN_ROLES = ['company_owner', 'system_admin'];
const isNotificationAdmin = (user) => NOTIFICATION_ADMIN_ROLES.includes(user?.role);

/** Notification types clients may send (SEC-M5-13). Stored in the canonical spelling below. */
const NOTIFICATION_TYPES = ['System', 'info', 'success', 'warning', 'error', 'Task', 'Review', 'Escalation', 'Compliance'];
const TITLE_MAX = 150;
// Lead spellings found in team_members data (see teams.controller.js).
const TEAM_LEAD_ROLES = ['Lead', 'Leader'];
const MESSAGE_MAX = 2000;

/**
 * GET /notifications & GET /api/notifications
 * Every caller gets their own notifications. Only Owner / System Admin may pass ?userId=
 * to read another user's.
 */
export async function listNotifications(req, res, next) {
  try {
    const requested = req.query.userId ? String(req.query.userId) : req.user.id;

    if (requested !== req.user.id) {
      if (!isNotificationAdmin(req.user)) {
        throw new ForbiddenError('You can only view your own notifications');
      }
      const targetUser = await prisma.user.findFirst({
        where: { id: requested, companyId: req.user.companyId },
        select: { id: true },
      });
      if (!targetUser) {
        throw new NotFoundError(`User with ID ${requested} not found in this company`);
      }
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: requested, companyId: req.user.companyId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /notifications & POST /api/notifications
 * Creates a notification for a target user within the caller's company.
 * Most notifications are created by server code (D-S12); this endpoint is for the few
 * client flows that need it. Team Leaders may only write to their direct reports or to
 * members of a team they lead.
 */
export async function createNotification(req, res, next) {
  try {
    const body = req.body || {};
    const userId = body.userId || body.user_id;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const rawType = body.type === undefined ? 'System' : body.type;

    validateRequired({ userId, title, message }, ['userId', 'title', 'message']);

    const type = typeof rawType === 'string'
      ? NOTIFICATION_TYPES.find((t) => t.toLowerCase() === rawType.trim().toLowerCase())
      : undefined;
    if (!type) {
      throw new BadRequestError(`type must be one of: ${NOTIFICATION_TYPES.join(', ')}`);
    }
    if (title.length > TITLE_MAX) {
      throw new BadRequestError(`title must be at most ${TITLE_MAX} characters`);
    }
    if (message.length > MESSAGE_MAX) {
      throw new BadRequestError(`message must be at most ${MESSAGE_MAX} characters`);
    }

    // Verify recipient belongs to authenticated company
    const recipient = await prisma.user.findFirst({
      where: { id: String(userId), companyId: req.user.companyId },
    });

    if (!recipient) {
      throw new NotFoundError(`Target user ${userId} not found in this company`);
    }

    if (req.user.role === 'team_leader') {
      // A Team Leader's people: members of a team they lead, or their direct reports. The second
      // rule is the one subtask assignment uses (tasks.controller), so a TL can always notify
      // the people they can assign work to.
      const isDirectReport = recipient.managerUserId === req.user.id;
      const sharedTeam = isDirectReport
        ? true
        : await prisma.teamMember.findFirst({
            where: {
              userId: recipient.id,
              team: { teamMembers: { some: { userId: req.user.id, role: { in: TEAM_LEAD_ROLES } } } },
            },
            select: { id: true },
          });
      if (!sharedTeam) {
        throw new ForbiddenError('Team Leaders can only notify their direct reports or members of a team they lead');
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId: recipient.id,
        companyId: recipient.companyId,
        title,
        message,
        type,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /notifications/:id/read & PATCH /api/notifications/:id/read
 * Marks a notification as read.
 */
export async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: String(id) },
      include: { user: { select: { companyId: true, id: true } } },
    });

    if (!notification || notification.user?.companyId !== req.user.companyId) {
      throw new NotFoundError(`Notification with ID ${id} not found`);
    }

    // Caller can mark own notification or privileged role
    if (
      notification.userId !== req.user.id &&
      !isNotificationAdmin(req.user)
    ) {
      throw new ForbiddenError('You can only modify your own notifications');
    }

    const updated = await prisma.notification.update({
      where: { id: String(id) },
      data: { readAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /notifications/read-all & POST /api/notifications/read-all
 * Marks all unread notifications for a user as read.
 */
export async function markAllNotificationsAsRead(req, res, next) {
  try {
    const body = req.body || {};
    const targetUserId = body.userId || body.user_id || req.user.id;

    // Verify user belongs to company
    const user = await prisma.user.findFirst({
      where: { id: String(targetUserId), companyId: req.user.companyId },
    });

    if (!user) {
      throw new NotFoundError(`User ${targetUserId} not found in this company`);
    }

    if (
      String(targetUserId) !== req.user.id &&
      !isNotificationAdmin(req.user)
    ) {
      throw new ForbiddenError('You can only mark your own notifications as read');
    }

    const result = await prisma.notification.updateMany({
      where: { userId: String(targetUserId), readAt: null },
      data: { readAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: { userId: String(targetUserId), updatedCount: result.count },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /notifications/:id & DELETE /api/notifications/:id
 * Deletes a notification. Callers can delete their own; owners and admins can delete any in their company.
 */
export async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: String(id) },
      include: { user: { select: { companyId: true, id: true } } },
    });

    if (!notification || notification.user?.companyId !== req.user.companyId) {
      throw new NotFoundError(`Notification with ID ${id} not found`);
    }

    if (
      notification.userId !== req.user.id &&
      !isNotificationAdmin(req.user)
    ) {
      throw new ForbiddenError('You can only delete your own notifications');
    }

    await prisma.notification.delete({ where: { id: String(id) } });

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

