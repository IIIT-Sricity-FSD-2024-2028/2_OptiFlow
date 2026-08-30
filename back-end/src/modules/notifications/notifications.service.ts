import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'Task' | 'Project' | 'Compliance' | 'System';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.notification.findMany({
      where: companyId ? { user: { companyId } } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: String(data.userId),
        title: data.title,
        message: data.message,
        type: data.type || 'System',
        link: data.link || '',
      },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id: String(id) },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<{ message: string }> {
    await this.prisma.notification.updateMany({
      where: { userId: String(userId), isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }
}
