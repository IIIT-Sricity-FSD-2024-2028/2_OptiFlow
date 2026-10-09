import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { validateRequired } from '../utils/validation.js';
import { ROLES } from '../utils/roles.js';


// ============================================================================
// NOTIFICATIONS CONTROLLERS & ENDPOINTS
// ============================================================================

/**
 * GET /notifications & GET /api/notifications
 * Lists notifications. Regular members only see their own notifications.
 * Admins/Leads can filter by userId if user belongs to the same company.
 */
export async function listNotifications(req, res, next) {
  try {
    const { userId } = req.query;

    if (userId) {
      // Validate requested user belongs to caller's company
      const targetUser = await prisma.user.findFirst({
        where: { id: String(userId), companyId: req.user.companyId },
      });

      if (!targetUser) {
        throw new NotFoundError(`User with ID ${userId} not found in this company`);
      }

      // If caller is not owner/admin/lead and trying to view another user's notifications
      if (
        req.user.id !== String(userId) &&
        !['company_owner', 'system_admin', 'superuser', 'project_manager', 'team_leader', 'compliance_officer'].includes(req.user.role)
      ) {
        throw new ForbiddenError('You can only view your own notifications');
      }

      const notifications = await prisma.notification.findMany({
        where: { userId: String(userId) },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: notifications,
      });
    }

    // If no userId query param:
    // If regular member, default to own notifications
    const isPrivileged = ['company_owner', 'system_admin', 'superuser', 'project_manager', 'team_leader', 'compliance_officer', 'hr_manager'].includes(req.user.role);

    const notifications = await prisma.notification.findMany({
      where: isPrivileged
        ? { user: { companyId: req.user.companyId } }
        : { userId: req.user.id },
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
 */
export async function createNotification(req, res, next) {
  try {
    const body = req.body || {};
    const userId = body.userId || body.user_id;
    const title = (body.title || '').trim();
    const message = (body.message || '').trim();
    const type = body.type || 'System';
    const link = body.link || '';

    validateRequired({ userId, title, message }, ['userId', 'title', 'message']);

    // Verify recipient belongs to authenticated company
    const recipient = await prisma.user.findFirst({
      where: { id: String(userId), companyId: req.user.companyId },
    });

    if (!recipient) {
      throw new NotFoundError(`Target user ${userId} not found in this company`);
    }

    const notification = await prisma.notification.create({
      data: {
        userId: String(userId),
        title,
        message,
        type,
        link,
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
      !['company_owner', 'system_admin', 'superuser'].includes(req.user.role)
    ) {
      throw new ForbiddenError('You can only modify your own notifications');
    }

    const updated = await prisma.notification.update({
      where: { id: String(id) },
      data: { isRead: true },
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
      !['company_owner', 'system_admin', 'superuser'].includes(req.user.role)
    ) {
      throw new ForbiddenError('You can only mark your own notifications as read');
    }

    await prisma.notification.updateMany({
      where: { userId: String(targetUserId), isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
}

// Routes registration



